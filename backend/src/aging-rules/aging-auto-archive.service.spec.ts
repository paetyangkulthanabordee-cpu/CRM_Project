import { Test, TestingModule } from '@nestjs/testing';

import { IssueOrdersService } from '../issue-orders/issue-orders.service.js';
import { AgingAutoArchiveService } from './aging-auto-archive.service.js';
import { AgingRulesService } from './aging-rules.service.js';

import type { AgingRuleView } from './dto/aging-rule.dto.js';

/*
 * Scheduler ซ่อนการ์ดอัตโนมัติ:
 * - ใช้เฉพาะ rule active + action=auto_archive + บอร์ดใบสั่งซื้อ
 * - เรียงตามจำนวนวันที่จะซ่อน (น้อย -> มาก)
 * - เรียก archive(id) เท่านั้น — ⚠ ห้ามเรียก remove() (ไม่มีการลบข้อมูล)
 * - ใบที่ซ่อนไม่สำเร็จ -> ข้ามแล้วไปใบถัดไป
 */
describe('AgingAutoArchiveService', () => {
  let service: AgingAutoArchiveService;

  const rule = (
    overrides: Partial<AgingRuleView> = {},
  ): AgingRuleView => ({
    ruleId: 1,
    ruleName: 'ซ่อนใบค้าง 3 วัน',
    warningAfterDays: 3,
    criticalAfterDays: 7,
    isActive: true,
    boardType: 'order_pipeline',
    stageKey: null,
    actionType: 'auto_archive',
    archiveAfterDays: null,
    stageLabel: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  });

  const mockAgingRulesService = {
    findAll: vi.fn().mockResolvedValue([]),
  };

  const mockIssueOrdersService = {
    findArchiveCandidateIds: vi.fn().mockResolvedValue([]),
    archive: vi.fn().mockResolvedValue({ archived: true }),
    /* มีไว้ยืนยันว่า scheduler ไม่เคยลบข้อมูล */
    remove: vi.fn().mockResolvedValue({ deleted: true }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockAgingRulesService.findAll.mockResolvedValue([]);
    mockIssueOrdersService.findArchiveCandidateIds.mockResolvedValue([]);
    mockIssueOrdersService.archive.mockResolvedValue({
      archived: true,
    });

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AgingAutoArchiveService,
          {
            provide: AgingRulesService,
            useValue: mockAgingRulesService,
          },
          {
            provide: IssueOrdersService,
            useValue: mockIssueOrdersService,
          },
        ],
      }).compile();

    service = module.get<AgingAutoArchiveService>(
      AgingAutoArchiveService,
    );
  });

  it('does nothing when there is no auto_archive rule', async () => {
    mockAgingRulesService.findAll.mockResolvedValue([
      rule({ actionType: 'none' }),
      rule({ actionType: 'edit_lock' }),
      rule({ actionType: 'auto_archive', isActive: false }),
      rule({ actionType: 'auto_archive', boardType: 'customers' }),
    ]);

    await expect(service.runOnce()).resolves.toBe(0);

    expect(
      mockIssueOrdersService.findArchiveCandidateIds,
    ).not.toHaveBeenCalled();
    expect(mockIssueOrdersService.archive).not.toHaveBeenCalled();
  });

  it('queries candidates for each rule sorted by archive days', async () => {
    mockAgingRulesService.findAll.mockResolvedValue([
      rule({ ruleId: 1, ruleName: '14 วัน', archiveAfterDays: 14 }),
      rule({ ruleId: 2, ruleName: '7 วัน', archiveAfterDays: 7, stageKey: 'quotation' }),
    ]);

    mockIssueOrdersService.findArchiveCandidateIds.mockResolvedValue([]);

    await service.runOnce();

    expect(
      mockIssueOrdersService.findArchiveCandidateIds.mock.calls,
    ).toEqual([
      [7, 'quotation'],
      [14, null],
    ]);
  });

  /*
   * หัวใจของ soft archive: เรียก "archive" เท่านั้น ไม่มีการลบ
   */
  it('archives cards and never calls remove()', async () => {
    mockAgingRulesService.findAll.mockResolvedValue([
      rule({ archiveAfterDays: 3 }),
    ]);
    mockIssueOrdersService.findArchiveCandidateIds.mockResolvedValue([
      9, 12,
    ]);

    await expect(service.runOnce()).resolves.toBe(2);

    expect(mockIssueOrdersService.archive).toHaveBeenCalledWith(9);
    expect(mockIssueOrdersService.archive).toHaveBeenCalledWith(12);
    expect(mockIssueOrdersService.remove).not.toHaveBeenCalled();
  });

  it('keeps archiving the rest when one card fails', async () => {
    mockAgingRulesService.findAll.mockResolvedValue([
      rule({ archiveAfterDays: 3 }),
    ]);
    mockIssueOrdersService.findArchiveCandidateIds.mockResolvedValue([
      1, 2, 3,
    ]);
    mockIssueOrdersService.archive
      .mockResolvedValueOnce({ archived: true })
      .mockRejectedValueOnce(new Error('ไม่พบใบสั่งซื้อ'))
      .mockResolvedValueOnce({ archived: true });

    await expect(service.runOnce()).resolves.toBe(2);
  });

  /*
   * เกณฑ์ซ่อนของ rule = archiveAfterDays (ที่ Admin กำหนดเอง)
   * criticalAfterDays ใช้แค่ตอนไม่มีค่า (fallback ข้อมูลเก่า)
   * และต้องเรียงตามเกณฑ์จริง (ไม่ใช่ critical)
   */
  it('uses archiveAfterDays instead of criticalAfterDays when present', async () => {
    mockAgingRulesService.findAll.mockResolvedValue([
      rule({ archiveAfterDays: 5, criticalAfterDays: 30 }),
      rule({ archiveAfterDays: null, criticalAfterDays: 12 }),
    ]);
    mockIssueOrdersService.findArchiveCandidateIds.mockResolvedValue([]);

    await service.runOnce();

    expect(
      mockIssueOrdersService.findArchiveCandidateIds.mock.calls,
    ).toEqual([
      [5, null],
      [12, null],
    ]);
  });
});
