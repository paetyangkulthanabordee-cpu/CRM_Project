/**
 * free-port.mjs
 *
 * ปลด port ที่มี process เก่า (orphan) ค้างอยู่ เพื่อแก้ปัญหา EADDRINUSE
 * ตอนรัน `npm run start:dev` (มักเกิดจาก watch mode ที่ถูกปิดแบบไม่ปกติ)
 *
 * ใช้ Node core ล้วนๆ ไม่ต้องติดตั้ง dependency เพิ่ม
 * รองรับ Windows (netstat + taskkill) และ macOS/Linux (lsof/fuser)
 *
 * พฤติกรรมสำคัญ:
 *   1. log ทุกขั้นตอน (port ที่ตรวจจากแหล่งไหน, PID + คำสั่งของ process ที่เจอ,
 *      ผลของแต่ละ taskkill) เพื่อให้ตามรอยได้เมื่อปลดไม่สำเร็จ
 *   2. kill ทั้งต้นไม้พ่อ (npm/nest ที่รัน start ค้างอยู่) ไม่ใช่แค่ตัว listener
 *      เพื่อไม่ให้เหลือ zombie ที่ respawn กลับมา
 *   3. exit code 1 เมื่อยังปลด port ไม่ได้ -> npm จะหยุดก่อน
 *      แทนที่จะปล่อยให้ compile จบแล้วค่อยเจอ EADDRINUSE
 *
 * วิธีใช้:
 *   node scripts/free-port.mjs              ปลด port (ตาม .env / process.env.PORT)
 *   node scripts/free-port.mjs --dry-run    รายงานอย่างเดียว ไม่ kill ใครเลย
 *   node scripts/free-port.mjs --port 3999  ตรวจ port อื่นแทน
 *   node scripts/free-port.mjs --quiet      แสดงเฉพาะคำเตือน/ข้อผิดพลาด
 *
 * exit code: 0 = port ว่าง (หรือปลดสำเร็จ), 1 = ยังถูกใช้อยู่ / ปลดไม่สำเร็จ
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';

const IS_WINDOWS = process.platform === 'win32';

/** root ของ package นี้ (backend/) — ใช้เทียบกับคำสั่งของ process ของโปรเจกต์เรา */
const PROJECT_DIR = path.resolve(import.meta.dirname, '..');

/** คำสั่งที่ "รัน server" — เอาไว้แยกแยะ process ที่ควรปลด ออกจาก process อื่นๆ (test/lint/tsc)
 *  หมายเหตุ: คำสั่งจริงมักถูกครอบด้วย quote เช่น `"...\nest.js" start --watch`
 *            หรือ `"...\npm-cli.js" run start:dev` -> ต้องยอมรับ quote ระหว่าง token ด้วย */
const START_PATTERN =
  /(?:nest(?:\.js)?|npm-cli\.js|npm)(?:"\s*)?\s+(?:run\s+)?start\b|dist[\\/]main|node\s+--enable-source-maps/i;

/** จำนวนรอบสูงสุดที่จะ scan + kill ซ้ำ (กัน process ที่ respawn กลับมา) */
const MAX_ROUNDS = 3;
const KILL_TIMEOUT_MS = 8000;

const opts = {
  dryRun: false,
  quiet: false,
  port: null,
  help: false,
};

const info = (...args) => {
  if (!opts.quiet) console.log('· free-port:', ...args);
};
const ok = (...args) => console.log('✓ free-port:', ...args);
const warn = (...args) => console.warn('⚠ free-port:', ...args);
const fail = (...args) => console.error('✗ free-port:', ...args);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function printHelp() {
  console.log(
    [
      'free-port — ปลด port ที่มี process เก่าค้างอยู่ (แก้ EADDRINUSE)',
      '',
      'วิธีใช้:',
      '  node scripts/free-port.mjs             ปลด port (อ่านจาก process.env.PORT -> .env -> 3001)',
      '  node scripts/free-port.mjs --dry-run   รายงานอย่างเดียว ไม่ kill ใครเลย',
      '  node scripts/free-port.mjs --port N    ตรวจ port N แทน',
      '  node scripts/free-port.mjs --quiet     แสดงเฉพาะคำเตือน/ข้อผิดพลาด',
      '',
      'exit code: 0 = port ว่าง / ปลดสำเร็จ, 1 = ยังถูกใช้อยู่',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run' || arg === '-n') opts.dryRun = true;
    else if (arg === '--quiet' || arg === '-q') opts.quiet = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--port' || arg === '-p' || arg.startsWith('--port=')) {
      const raw = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 65535) {
        throw new Error(`--port ต้องเป็นเลข 1-65535 (ได้ "${raw ?? ''}")`);
      }
      opts.port = value;
    } else {
      throw new Error(`ไม่รู้จักตัวเลือก "${arg}" — ใช้ --help ดูวิธีใช้`);
    }
  }
  return opts;
}

/**
 * ลำดับการอ่านค่า PORT: --port > process.env.PORT > .env > 3001
 * (ต่างจากเดิมที่เมิน process.env.PORT ไปเลย ทำให้คนที่ override ผ่าน env แล้วหลุด)
 */
function resolvePort() {
  if (opts.port) return { port: opts.port, source: '--port' };

  const fromEnv = Number(process.env.PORT);
  if (process.env.PORT && Number.isInteger(fromEnv) && fromEnv > 0 && fromEnv <= 65535) {
    return { port: fromEnv, source: 'process.env.PORT' };
  }

  try {
    const content = fs.readFileSync(path.join(PROJECT_DIR, '.env'), 'utf8');
    const match = content.match(/^\s*PORT\s*=\s*(\d+)/m);
    if (match) return { port: Number(match[1]), source: '.env' };
  } catch {
    // ไม่มี .env หรืออ่านไม่ได้ -> fallback เป็นค่า default
  }

  return { port: 3001, source: 'ค่า default' };
}

/** ลอง bind จริงๆ host เดียว แล้วคืนผล */
function tryBind(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve({ ok: false, code: err.code, message: err.message }));
    server.once('listening', () => server.close(() => resolve({ ok: true })));
    server.listen(port, host);
  });
}

/**
 * ตรวจว่ามีใครจอง port อยู่ไหม โดยลอง bind ทั้ง IPv4 และ IPv6
 * (bind host เดียวแล้วปิด ก่อนค่อยลอง host ถัดไป กัน bind ของตัวเองขัดกันเอง)
 */
async function isPortInUse(port) {
  for (const host of ['0.0.0.0', '::']) {
    const result = await tryBind(port, host);
    if (result.ok) continue;
    if (result.code === 'EADDRINUSE') {
      info(`port ${port} ถูกจองอยู่ (bind ${host} -> EADDRINUSE)`);
      return true;
    }
    // ระบบไม่รองรับ IPv6 / ไม่มีสิทธิ์ -> ไม่ถือว่า port ถูกจอง
    if (!['EAFNOSUPPORT', 'EADDRNOTAVAIL', 'EINVAL', 'EACCES'].includes(result.code)) {
      warn(`ลอง bind ${host}:${port} ไม่สำเร็จ: ${result.message}`);
    }
  }
  return false;
}

/** อ่านตาราง process (pid -> { pid, ppid, cmd }) เพื่อใช้เดินสายพ่อ-ลูก */
function readProcessTable() {
  const table = new Map();
  try {
    if (IS_WINDOWS) {
      // wmic ถูกถอดออกจาก Windows 11 แล้ว -> ใช้ PowerShell + CIM แทน
      const script =
        '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ' +
        'Get-CimInstance Win32_Process | ForEach-Object { ' +
        '[PSCustomObject]@{ pid=$_.ProcessId; ppid=$_.ParentProcessId; cmd=$_.CommandLine } } ' +
        '| ConvertTo-Json -Compress';
      const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        maxBuffer: 32 * 1024 * 1024,
      });
      const json = out.replace(/^\\uFEFF/, '').trim();
      if (json) {
        const parsed = JSON.parse(json);
        for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
          if (!item || item.pid == null) continue;
          table.set(Number(item.pid), {
            pid: Number(item.pid),
            ppid: Number(item.ppid) || 0,
            cmd: String(item.cmd ?? ''),
          });
        }
      }
    } else {
      const out = execFileSync('ps', ['-axo', 'pid=,ppid=,args='], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      for (const line of out.split('\n')) {
        const match = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/);
        if (match) {
          table.set(Number(match[1]), {
            pid: Number(match[1]),
            ppid: Number(match[2]),
            cmd: match[3],
          });
        }
      }
    }
  } catch (err) {
    warn(`อ่านตาราง process ไม่สำเร็จ: ${String(err.message).split('\n')[0]} — จะจำกัดการ cleanup เฉพาะ PID ที่ถือ port`);
  }
  return table;
}

/** เอา PID ของ process ที่กำลัง LISTEN บน port ที่ระบุ พร้อมบอกเครื่องมือที่ใช้ */
function getPidsOnPort(port) {
  const pids = new Set();

  if (IS_WINDOWS) {
    const tool = 'netstat -ano';
    try {
      const out = execFileSync('netstat', ['-ano'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const cols = line.trim().split(/\s+/);
        if (cols.length < 5) continue;
        const localAddr = cols[1];
        const pid = Number(cols[cols.length - 1]);
        // localAddr รูปแบบ เช่น 0.0.0.0:3001 หรือ [::]:3001
        const portPart = localAddr.slice(localAddr.lastIndexOf(':') + 1);
        if (portPart === String(port) && Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
      return { pids: [...pids], tool, error: null };
    } catch (err) {
      return { pids: [], tool, error: String(err.message).split('\n')[0] };
    }
  }

  // ลอง lsof ก่อน ถ้าไม่มีค่อยใช้ fuser
  const attempts = [
    ['lsof -nP -iTCP:PORT -sTCP:LISTEN -t', ['lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']]],
    ['fuser PORT/tcp', ['fuser', [`${port}/tcp`]]],
  ];
  let lastError = null;
  for (const [tool, [cmd, args]] of attempts) {
    try {
      const out = execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      for (const token of out.split(/[\s,]+/)) {
        const pid = Number(token.trim());
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
      return { pids: [...pids], tool, error: null };
    } catch (err) {
      lastError = `${tool}: ${String(err.message).split('\n')[0]}`;
    }
  }
  return { pids: [], tool: 'lsof/fuser', error: lastError };
}

/** สายพ่อ-ลูกของ pid (รวมตัวเอง) โดยเดินขึ้นไปจนสุด */
function ancestorsOf(pid, table) {
  const chain = [];
  let current = pid;
  for (let hop = 0; hop < 64 && current && table.has(current); hop++) {
    chain.push(current);
    const parent = table.get(current)?.ppid;
    if (!parent || parent === current) break;
    current = parent;
  }
  return chain;
}

/** สายพ่อ-ลูกของ free-port เอง (ห้าม kill เด็ดขาด กันเผลอฆ่า npm/terminal ที่กำลังสั่งอยู่) */
function selfChain(table) {
  return new Set(ancestorsOf(process.pid, table));
}

function cmdOf(pid, table) {
  return table.get(pid)?.cmd ?? '(ไม่ทราบคำสั่ง — process อาจเพิ่งจบไป)';
}

function matchesProject(cmd) {
  const haystack = IS_WINDOWS ? cmd.toLowerCase() : cmd;
  const needle = IS_WINDOWS ? PROJECT_DIR.toLowerCase() : PROJECT_DIR;
  return haystack.includes(needle);
}

/**
 * รวม PID ที่ควรปลด:
 *   A) บรรพบุรุษของ process ที่กำลังถือ port (npm/nest ที่รัน start ค้างอยู่)
 *   B) process ของโปรเจกต์นี้ที่รัน start ค้างอยู่ (ต่อให้ไม่ได้ถือ port ก็เป็น zombie)
 *      -> เฉพาะตอนปลด port ของโปรเจกต์ (ไม่ใช่ตอนสั่ง --port อื่น) กันเผลอไป kill
 *         server อีก port หนึ่งที่ยังทำงานปกติ
 *   C) ตัว process ที่กำลัง LISTEN บน port
 * ทั้งหมดยกเว้นสายพ่อ-ลูกของตัวเอง และ PID ระบบ
 */
function findKillTargets(listenerPids, table, protectedPids, { includeProjectLeftovers = true } = {}) {
  const targets = new Map(); // pid -> เหตุผล
  const add = (pid, reason) => {
    if (!Number.isInteger(pid) || pid <= (IS_WINDOWS ? 4 : 1)) return;
    if (pid === process.pid || protectedPids.has(pid)) return;
    if (!targets.has(pid)) targets.set(pid, reason);
  };

  for (const listenerPid of listenerPids) {
    for (const ancestorPid of ancestorsOf(listenerPid, table)) {
      if (ancestorPid === listenerPid) continue;
      const cmd = cmdOf(ancestorPid, table);
      if (START_PATTERN.test(cmd)) {
        add(ancestorPid, `บรรพบุรุษของ PID ${listenerPid} ที่ถือ port (รัน start ค้างอยู่)`);
      }
    }
  }

  if (includeProjectLeftovers) {
    for (const entry of table.values()) {
      if (!entry.cmd || !matchesProject(entry.cmd)) continue;
      if (START_PATTERN.test(entry.cmd)) {
        add(entry.pid, 'process ของโปรเจกต์นี้ที่รัน start ค้างอยู่');
      }
    }
  }

  for (const listenerPid of listenerPids) {
    add(listenerPid, 'กำลัง LISTEN บน port นี้');
  }

  return targets;
}

/** ฆ่า process ตาม PID — คืน { ok, note } พร้อมเหตุผลเมื่อ fail (ค้างไว้ log ไม่เงียบ) */
function killPid(pid) {
  if (IS_WINDOWS) {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/F', '/T'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      return { ok: true, note: 'สั่งปิดแล้ว' };
    } catch (err) {
      const reason = String(err.stderr || err.message)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(' ');
      // process ตายไปก่อน (ถูก kill พร้อมพ่อ) = ถือว่าสำเร็จ
      if (/not found|ไม่พบ|can't find/i.test(reason)) return { ok: true, note: 'ตายไปแล้ว (ถูก kill พร้อมต้นไม้)' };
      return { ok: false, note: reason || err.message };
    }
  }

  try {
    process.kill(pid, 'SIGKILL');
    return { ok: true, note: 'สั่งปิดแล้ว' };
  } catch (err) {
    if (err.code === 'ESRCH') return { ok: true, note: 'ตายไปแล้ว (ถูก kill พร้อมต้นไม้)' };
    return { ok: false, note: err.message };
  }
}

/** รอให้ port ว่างจริงหลัง kill (มี delay เล็กน้อยตอน OS คืน port) */
async function waitForPortFree(port, timeoutMs = KILL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let waitedLogged = false;
  while (Date.now() < deadline) {
    if (!(await isPortInUse(port))) return true;
    if (!waitedLogged && Date.now() > deadline - timeoutMs + 2000) {
      info('ยังรอ OS คืน port อยู่...');
      waitedLogged = true;
    }
    await sleep(200);
  }
  return false;
}

async function main() {
  const { port, source } = resolvePort();
  info(`ตรวจ port ${port} (ค่ามาจาก ${source})`);

  if (!(await isPortInUse(port))) {
    ok(`port ${port} ว่างอยู่แล้ว ไม่มีอะไรต้องปลด`);
    return 0;
  }

  const table = readProcessTable();
  const protectedPids = selfChain(table);

  const { pids: listenerPids, tool, error } = getPidsOnPort(port);
  if (error) warn(`ดึงรายชื่อ PID จาก ${tool} ไม่สำเร็จ: ${error}`);
  info(
    listenerPids.length
      ? `เจอ process ที่ LISTEN บน port ${port}: ${listenerPids.join(', ')} (จาก ${tool})`
      : `หา process ที่ LISTEN บน port ${port} จาก ${tool} ไม่เจอ`,
  );
  for (const pid of listenerPids) info(`  PID ${pid}: ${cmdOf(pid, table)}`);

  // --port อื่นที่ไม่ใช่ port ของโปรเจกต์ -> ห้ามเก็บสาขา "process ของโปรเจกต์นี้"
  // (ไม่งั้นการปลด port สำรองจะไป kill server ปกติที่รันอยู่อีก port หนึ่ง)
  const targetOpts = { includeProjectLeftovers: !opts.port };

  const targets = findKillTargets(listenerPids, table, protectedPids, targetOpts);

  if (targets.size === 0) {
    fail(
      `port ${port} ถูกจองอยู่แต่ระบุ process เจ้าของไม่ได้` +
        (error ? ` (เครื่องมือ ${tool} ล้มเหลว: ${error})` : ''),
      '',
      '  วิธีแก้: ปิด program ที่ใช้ port ด้วยมือ แล้วลองใหม่',
      '  ดูสถานะโดยไม่ kill: npm run port:check',
    );
    return 1;
  }

  if (opts.dryRun) {
    info(`[dry-run] จะปลด ${targets.size} process (ไม่มีการ kill จริง):`);
    for (const [pid, reason] of targets) info(`  PID ${pid} — ${reason}\n      ${cmdOf(pid, table)}`);
    warn(`[dry-run] port ${port} ยังถูกใช้อยู่ — รันโดยไม่มี --dry-run เพื่อปลดจริง`);
    return 1;
  }

  info(`เริ่มปลด port ${port} (${targets.size} process)`);

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (!(await isPortInUse(port))) {
      ok(`port ${port} ว่างแล้ว`);
      return 0;
    }

    // scan ใหม่ทุกรอบ เผื่อมี process  respawn กลับมาหลังรอบแรก
    const current =
      round === 1 ? targets : findKillTargets(getPidsOnPort(port).pids, table, protectedPids, targetOpts);
    if (current.size === 0) {
      warn(`รอบที่ ${round}: ไม่เหลือ process ให้ปลด แต่ port ${port} ยังไม่ว่าง`);
      break;
    }

    for (const [pid, reason] of current) {
      const cmd = cmdOf(pid, table);
      const result = killPid(pid);
      if (result.ok) {
        info(` kill PID ${pid} (${result.note}) — ${reason}`);
        info(`     ${cmd}`);
        table.delete(pid);
      } else {
        warn(` kill PID ${pid} ไม่สำเร็จ: ${result.note}`);
      }
    }

    if (await waitForPortFree(port)) {
      ok(`port ${port} ปลดสำเร็จ (round ${round})`);
      return 0;
    }
    info(`รอบที่ ${round}/${MAX_ROUNDS}: port ${port} ยังไม่ว่าง — scan ใหม่`);
  }

  fail(
    `port ${port} ยังถูกใช้อยู่หลังลองปลด ${MAX_ROUNDS} รอบ`,
    '  วิธีแก้: ปิด program ที่ใช้ port ด้วยมือ หรือรัน "npm run port:check" ดูว่า PID ไหนค้างอยู่',
  );
  return 1;
}

try {
  parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exitCode = 0;
  } else {
    process.exitCode = (await main()) ?? 0;
  }
} catch (err) {
  fail(err.message);
  process.exitCode = 1;
}
