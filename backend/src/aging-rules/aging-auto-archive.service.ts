import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import { IssueOrdersService } from '../issue-orders/issue-orders.service.js';
import { AgingRulesService } from './aging-rules.service.js';

/*
 * Scheduler "ซ่อนการ์ด" อัตโนมัติ (Aging Rule ที่ actionType = 'auto_archive')
 *
 * หลักการทำงาน:
 * - ทำงานเบื้องหลังของ backend ทุก AUTO_ARCHIVE_INTERVAL_MS (default 10 นาที)
 *   + รันรอบแรก ~15 วินาทีหลัง boot เพื่อ catch-up ที่หายไปตอน server ดับ
 * - ใช้ได้เฉพาะ rule ที่ isActive + actionType='auto_archive'
 *   + boardType='order_pipeline' (backend validate ตอนสร้าง rule แล้ว)
 * - เกณฑ์ = archive_after_days ของ rule นั้น นับจาก updated_at ของใบสั่งซื้อ
 * - stage_key ของ rule = เจาะคอลัมน์ / NULL = ทุกคอลัมน์ของบอร์ด
 * - ผลลัพธ์: เรียก IssueOrdersService.archive(id) -> ตั้ง is_archived = true
 *   ⚠ ไม่มีการ DELETE ข้อมูลใด ๆ:
 *   แถว/รายละเอียด/ไฟล์แนบ/ไฟล์บนดิสก์ อยู่ครบและเข้าถึงได้จากหน้าอื่น
 * - หน้า Order Pipeline ยิง API ด้วย archived=false จึง "ไม่ดึงใบนั้นมาแสดง"
 *
 * ข้อจำกัดที่ทราบ:
 * - เป็น instance เดียว (ไม่มี distributed lock) — พอเหมาะกับการ deploy 1 เครื่อง
 * - ไม่มี audit-log service ในโปรเจกต์นี้ -> บันทึกด้วย Logger ของ Nest
 */
@Injectable()
export class AgingAutoArchiveService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    AgingAutoArchiveService.name,
  );

  private intervalTimer: NodeJS.Timeout | null = null;
  private bootTimer: NodeJS.Timeout | null = null;

  /* กันรอบทับซ้อน (รอบก่อนยังประมวลผลอยู่) */
  private running = false;

  constructor(
    private readonly agingRulesService: AgingRulesService,
    private readonly issueOrdersService: IssueOrdersService,
  ) {}

  onModuleInit(): void {
    const intervalMs = resolveIntervalMs();

    this.intervalTimer = setInterval(() => {
      void this.runOnce();
    }, intervalMs);

    this.bootTimer = setTimeout(() => {
      void this.runOnce();
    }, BOOT_DELAY_MS);

    /*
     * unref() กันไม่ให้ timer ยืดอายุ process
     * (ตอน stop dev server จะได้ไม่ค้าง)
     */
    this.intervalTimer.unref?.();
    this.bootTimer.unref?.();

    this.logger.log(
      `auto-archive scheduler: ตรวจทุก ${Math.round(intervalMs / 1000)} วินาที (รอบแรกหลัง boot ${BOOT_DELAY_MS / 1000} วินาที)`,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (this.bootTimer) {
      clearTimeout(this.bootTimer);
      this.bootTimer = null;
    }
  }

  /*
   * รัน 1 รอบ: "ซ่อนการ์ด" ที่ครบกำหนดของทุก rule
   * คืนจำนวนใบที่ถูก archive (ใช้ตอนเทสด้วย)
   */
  async runOnce(): Promise<number> {
    if (this.running) {
      return 0;
    }

    this.running = true;

    try {
      const rules = await this.loadAutoArchiveRules();

      if (rules.length === 0) {
        return 0;
      }

      let archived = 0;

      /*
       * เรียงตาม "จำนวนวันที่จะซ่อน" น้อย -> มาก
       * (rule ที่ครบกำหนดก่อนต้องถูกยิงก่อน)
       * ใบถูกซ่อนไปแล้วจะหายจาก SELECT รอบถัดไปเอง (is_archived = false)
       */
      for (const rule of rules) {
        /*
         * เกณฑ์ซ่อนของ rule นี้ = archiveAfterDays (ที่ Admin กำหนดเอง)
         * fallback ใช้ criticalAfterDays เผื่อข้อมูลเก่าที่ยังไม่มีค่า
         */
        const archiveAfterDays =
          rule.archiveAfterDays ?? rule.criticalAfterDays;

        const candidateIds =
          await this.issueOrdersService.findArchiveCandidateIds(
            archiveAfterDays,
            rule.stageKey,
          );

        for (const orderId of candidateIds) {
          try {
            /*
             * แค่ตั้ง is_archived = true — ไม่ลบแถว/ไม่ลบไฟล์
             */
            await this.issueOrdersService.archive(orderId);

            archived += 1;

            this.logger.log(
              `auto-archive: ซ่อนใบสั่งซื้อ #${orderId} ออกจากบอร์ด (rule "${rule.ruleName}", ไม่มีกิจกรรม ${archiveAfterDays} วัน)`,
            );
          } catch (error) {
            /*
             * ซ่อนใบเดียวไม่ได้ (เช่น ถูกลบ/ถูกซ่อนไปแล้วระหว่างทาง)
             * -> ข้ามแล้วไปใบถัดไป ไม่ทำให้รอบทั้งหมดล้ม
             */
            this.logger.warn(
              `auto-archive: ซ่อนใบสั่งซื้อ #${orderId} ไม่สำเร็จ (${(error as Error).message})`,
            );
          }
        }
      }

      if (archived > 0) {
        this.logger.log(
          `auto-archive: รอบนี้ซ่อนการ์ดรวม ${archived} ใบ (ไม่มีการลบข้อมูล)`,
        );
      }

      return archived;
    } finally {
      this.running = false;
    }
  }

  /*
   * rule ที่เข้าเกณฑ์ซ่อนการ์ดอัตโนมัติ
   * (active + action=auto_archive + บอร์ดใบสั่งซื้อ — บอร์ดลูกค้าไม่ทำ)
   */
  private async loadAutoArchiveRules() {
    const rules = await this.agingRulesService.findAll();

    const active = rules.filter(
      (rule) =>
        rule.isActive &&
        rule.actionType === 'auto_archive' &&
        rule.boardType === 'order_pipeline',
    );

    /* เรียงตามจำนวนวันที่ใช้ซ่อนจริง (ไม่ใช่ critical อย่างเดียว) */
    return active.sort(
      (a, b) =>
        (a.archiveAfterDays ?? a.criticalAfterDays) -
        (b.archiveAfterDays ?? b.criticalAfterDays),
    );
  }
}

/* รอบแรกหลัง boot (catch-up ตอน server เพิ่งถูกเปิด) */
const BOOT_DELAY_MS = 15 * 1000;

/* default = 10 นาที, ปรับด้วย env เพื่อให้ทดสอบเร็วได้ */
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

function resolveIntervalMs(): number {
  const raw = Number(process.env.AUTO_ARCHIVE_INTERVAL_MS);

  return Number.isFinite(raw) && raw >= 1000
    ? raw
    : DEFAULT_INTERVAL_MS;
}
