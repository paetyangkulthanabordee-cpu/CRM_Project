/*
 * แปลงรหัสผ่านเก่าที่เก็บเป็น plaintext ให้เป็น bcrypt hash
 * รันครั้งเดียวหลังเปลี่ยนระบบ login ไปใช้ bcrypt:
 *
 *   node backend/sql/hash-existing-passwords.mjs
 *
 * ข้ามผู้ใช้ที่ hash ไว้แล้ว (ขึ้นต้นด้วย $2) จึงรันซ้ำได้ปลอดภัย
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import * as bcrypt from 'bcrypt';
import pg from 'pg';

const SALT_ROUNDS = 10;

function loadEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '../.env');

  let content = '';

  try {
    content = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (
      trimmed.length === 0 ||
      trimmed.startsWith('#')
    ) {
      continue;
    }

    const separator = trimmed.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = trimmed
      .slice(0, separator)
      .trim();
    const value = trimmed
      .slice(separator + 1)
      .trim();

    process.env[key] ??= value;
  }
}

loadEnv();

const client = new pg.Client({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(
    process.env.DATABASE_PORT ?? 5432,
  ),
  user: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'postgres',
});

await client.connect();

try {
  const result = await client.query(
    `SELECT user_id, email, password
     FROM users
     WHERE password NOT LIKE '$2%'`,
  );

  if (result.rows.length === 0) {
    console.log(
      'ไม่พบรหัสผ่านที่ยังเป็น plaintext ไม่มีอะไรต้องทำ',
    );
  } else {
    for (const row of result.rows) {
      const hashed = await bcrypt.hash(
        row.password,
        SALT_ROUNDS,
      );

      await client.query(
        `UPDATE users
         SET password = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [hashed, row.user_id],
      );

      console.log(
        `hashed ${row.email} (user_id=${row.user_id})`,
      );
    }

    console.log(
      `\nเรียบร้อย ${result.rows.length} ราย ผู้ใช้ต้องใช้รหัสผ่านเดิมในการ Login`,
    );
  }
} finally {
  await client.end();
}
