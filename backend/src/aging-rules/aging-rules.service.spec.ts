import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';

import { AgingRulesService } from './aging-rules.service.js';
import { AgingRule } from './entities/aging-rule.entity.js';

import type { CreateAgingRuleDto, UpdateAgingRuleDto } from './dto/aging-rule.dto.js';

/*
 * ครอบคลุมจุดที่ Scope ใหม่ (board_type + stage_key) ใช้ตัดสิน:
 * - stage_key ต้องชี้ไปคอลัมน์ที่มีอยู่จริงใน "บอร์ดเดียวกับที่เลือก"
 * - เปลี่ยนบอร์ดโดยไม่ส่ง stage_key -> ล้าง scope (กันค้างข้ามบอร์ด)
 * - stageLabel ถูกผูกจากตารางคอลัมน์ของแต่ละบอร์ด (null เมื่อหาไม่เจอ)
 */
describe('AgingRulesService', () => {
  let service: AgingRulesService;

  const baseRule = {
    id: 5,
    ruleName: 'test',
    warningAfterDays: 10,
    criticalAfterDays: 14,
    isActive: true,
    boardType: 'order_pipeline' as const,
    stageKey: null as string | null,
    actionType: 'none' as const,
    archiveAfterDays: null as number | null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
  };

  const mockRulesRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    save: vi.fn((entity: unknown) => Promise.resolve(entity)),
    create: vi.fn((payload: unknown) => payload),
    remove: vi.fn(),
  };

  const mockOrderStagesRepository = {
    find: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
  };

  const mockCustomerStagesRepository = {
    find: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRulesRepository.find.mockResolvedValue([]);
    mockRulesRepository.findOne.mockResolvedValue({
      ...baseRule,
    });
    mockOrderStagesRepository.find.mockResolvedValue([]);
    mockOrderStagesRepository.exists.mockResolvedValue(false);
    mockCustomerStagesRepository.find.mockResolvedValue([]);
    mockCustomerStagesRepository.exists.mockResolvedValue(false);

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AgingRulesService,
          {
            provide: getRepositoryToken(AgingRule),
            useValue: mockRulesRepository,
          },
          {
            provide: getRepositoryToken(OrderPipeline),
            useValue: mockOrderStagesRepository,
          },
          {
            provide: getRepositoryToken(PipelineStage),
            useValue: mockCustomerStagesRepository,
          },
        ],
      }).compile();

    service = module.get<AgingRulesService>(
      AgingRulesService,
    );
  });

  describe('create', () => {
    /*
     * ใช้ Omit แทน CreateAgingRuleDto ตรง ๆ
     * เพื่อให้เป็น object literal (spread แล้วไม่ทำ prototype หาย)
     */
    const validDto: Omit<
      CreateAgingRuleDto,
      'boardType' | 'stageKey'
    > = {
      ruleName: 'เหลือง 3 / แดง 7',
      warningAfterDays: 3,
      criticalAfterDays: 7,
      isActive: true,
    };

    it('rejects a stage_key that does not exist on the chosen board', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(false);

      await expect(
        service.create({
          ...validDto,
          boardType: 'order_pipeline',
          stageKey: 'nope',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOrderStagesRepository.exists).toHaveBeenCalled();
      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an order_pipeline stage_key when the board is customers', async () => {
      /*
       * stage_key มีจริงใน order_pipeline แต่ boardType = customers
       * -> ต้องตรวจกับตาราง pipeline_stages และไม่ผ่าน
       */
      mockOrderStagesRepository.exists.mockResolvedValue(true);
      mockCustomerStagesRepository.exists.mockResolvedValue(false);

      await expect(
        service.create({
          ...validDto,
          boardType: 'customers',
          stageKey: 'qualified',
        }),
      ).rejects.toThrow('ไม่พบคอลัมน์ "qualified" ในบอร์ด Customers');

      expect(mockCustomerStagesRepository.exists).toHaveBeenCalledWith({
        where: { stageKey: 'qualified' },
      });
      expect(mockOrderStagesRepository.exists).not.toHaveBeenCalled();
    });

    it('persists scope when the stage exists on that board', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(true);

      const result = await service.create({
        ...validDto,
        boardType: 'order_pipeline',
        stageKey: 'documents',
      });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boardType: 'order_pipeline',
          stageKey: 'documents',
        }),
      );

      expect(result).toMatchObject({
        boardType: 'order_pipeline',
        stageKey: 'documents',
        stageLabel: null,
      });
    });

    it('defaults to order_pipeline with no stage when scope is omitted', async () => {
      const result = await service.create(validDto);

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boardType: 'order_pipeline',
          stageKey: null,
        }),
      );

      expect(result.boardType).toBe('order_pipeline');
      expect(result.stageKey).toBeNull();
    });
  });

  describe('update', () => {
    it('clears stage_key when the board changes without a new stage', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        stageKey: 'documents',
      });
      mockCustomerStagesRepository.exists.mockResolvedValue(false);

      const dto: UpdateAgingRuleDto = {
        boardType: 'customers',
      };

      const result = await service.update(5, dto);

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boardType: 'customers',
          stageKey: null,
        }),
      );

      expect(result.stageKey).toBeNull();
      /* ไม่ต้องตรวจ stage_key เพราะถูกล้างเป็น null ไปแล้ว */
      expect(mockCustomerStagesRepository.exists).not.toHaveBeenCalled();
    });

    it('keeps the existing stage_key when board and stage are not sent', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        stageKey: 'documents',
      });
      mockOrderStagesRepository.exists.mockResolvedValue(true);

      const result = await service.update(5, {
        warningAfterDays: 4,
      });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          boardType: 'order_pipeline',
          stageKey: 'documents',
          warningAfterDays: 4,
        }),
      );

      expect(result.stageKey).toBe('documents');
    });

    it('clears scope when stage_key is explicitly null', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        stageKey: 'documents',
      });

      const result = await service.update(5, {
        stageKey: null,
      });

      expect(result.stageKey).toBeNull();
    });
  });

  describe('findAll', () => {
    it('attaches stageLabel from the matching board table', async () => {
      mockRulesRepository.find.mockResolvedValue([
        { ...baseRule, stageKey: 'documents' },
        {
          ...baseRule,
          id: 6,
          boardType: 'customers' as const,
          stageKey: 'hot',
        },
      ]);

      mockOrderStagesRepository.find.mockResolvedValue([
        { stageKey: 'documents', label: 'เอกสาร' },
      ]);
      mockCustomerStagesRepository.find.mockResolvedValue([
        { stageKey: 'hot', label: 'ลูกค้าร้อน' },
      ]);

      const result = await service.findAll();

      expect(result[0]).toMatchObject({
        stageKey: 'documents',
        stageLabel: 'เอกสาร',
      });
      expect(result[1]).toMatchObject({
        stageKey: 'hot',
        stageLabel: 'ลูกค้าร้อน',
      });
    });

    it('returns null stageLabel when the column no longer exists', async () => {
      mockRulesRepository.find.mockResolvedValue([
        { ...baseRule, stageKey: 'deleted-column' },
      ]);
      mockOrderStagesRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result[0]).toMatchObject({
        stageKey: 'deleted-column',
        stageLabel: null,
      });
    });
  });

  /*
   * action_type: ลบอัตโนมัติใช้ได้เฉพาะบอร์ดใบสั่งซื้อ,
   * ล็อกแก้ไขใช้ได้ทั้งสองบอร์ด, ค่าที่เหลือ = none
   */
  describe('action type', () => {
    const validDto: Omit<
      CreateAgingRuleDto,
      'boardType' | 'stageKey' | 'actionType'
    > = {
      ruleName: 'ลบใบค้าง',
      warningAfterDays: 3,
      criticalAfterDays: 7,
      isActive: true,
    };

    it('rejects auto_archive on the customers board', async () => {
      await expect(
        service.create({
          ...validDto,
          boardType: 'customers',
          stageKey: 'contact',
          actionType: 'auto_archive',
        }),
      ).rejects.toThrow(
        'Auto Archive ใช้ได้เฉพาะบอร์ด Order Pipeline เท่านั้น',
      );

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });

    it('persists auto_archive on the order_pipeline board', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(true);

      const result = await service.create({
        ...validDto,
        boardType: 'order_pipeline',
        stageKey: 'quotation',
        actionType: 'auto_archive',
        archiveAfterDays: 6,
      });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'auto_archive',
          archiveAfterDays: 6,
        }),
      );
      expect(result.actionType).toBe('auto_archive');
      expect(result.archiveAfterDays).toBe(6);
    });

    it('defaults to none when actionType is omitted', async () => {
      const result = await service.create(validDto);

      expect(result.actionType).toBe('none');
    });

    it('rejects switching the board to customers while the action is auto_archive', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        actionType: 'auto_archive',
      });

      await expect(
        service.update(5, { boardType: 'customers' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });
  });

  /*
   * delete_after_days: ช่องวันของ auto-delete ที่แยกจาก Warning/Critical
   * - บังคับกรอกเมื่อ action = auto_archive
   * - ถูกเคลียร์เมื่อ action ไม่ใช่ auto_archive อีกต่อไป
   */
  describe('delete after days (auto-delete)', () => {
    const validDto: Omit<
      CreateAgingRuleDto,
      'boardType' | 'stageKey' | 'actionType' | 'archiveAfterDays'
    > = {
      ruleName: 'ลบใบค้าง',
      warningAfterDays: 3,
      criticalAfterDays: 7,
      isActive: true,
    };

    it('rejects auto_archive without archiveAfterDays', async () => {
      await expect(
        service.create({
          ...validDto,
          actionType: 'auto_archive',
        }),
      ).rejects.toThrow('ต้องกำหนดจำนวนวัน');

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });

    it('persists archiveAfterDays for auto_archive', async () => {
      const result = await service.create({
        ...validDto,
        actionType: 'auto_archive',
        archiveAfterDays: 5,
      });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ archiveAfterDays: 5 }),
      );
      expect(result.archiveAfterDays).toBe(5);
    });

    it('stores null when the action is not auto_archive', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(true);

      const result = await service.create({
        ...validDto,
        actionType: 'edit_lock',
        stageKey: 'quotation',
        archiveAfterDays: 9,
      });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ archiveAfterDays: null }),
      );
      expect(result.archiveAfterDays).toBeNull();
    });

    it('keeps the existing days when the action stays auto_archive', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(true);
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        actionType: 'auto_archive',
        stageKey: 'quotation',
        archiveAfterDays: 4,
      });

      const result = await service.update(5, { warningAfterDays: 2 });

      expect(result.archiveAfterDays).toBe(4);
    });

    it('clears archiveAfterDays when the action changes to none', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        actionType: 'auto_archive',
        archiveAfterDays: 4,
      });

      const result = await service.update(5, { actionType: 'none' });

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ archiveAfterDays: null }),
      );
      expect(result.archiveAfterDays).toBeNull();
    });

    it('rejects switching to auto_archive without any days value', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        archiveAfterDays: null,
      });

      await expect(
        service.update(5, { actionType: 'auto_archive' }),
      ).rejects.toThrow('ต้องกำหนดจำนวนวัน');

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });
  });

  /*
   * edit_lock ต้องเจาะคอลัมน์ (ฟอร์มบังคับ + backend ซ้ำอีกชั้น)
   */
  describe('edit_lock scope', () => {
    it('rejects creating an edit_lock rule without a column', async () => {
      await expect(
        service.create({
          ruleName: 'ล็อกทั้งบอร์ด',
          warningAfterDays: 3,
          criticalAfterDays: 7,
          actionType: 'edit_lock',
        }),
      ).rejects.toThrow('ต้องเลือกคอลัมน์ที่จะล็อก');

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });

    it('accepts an edit_lock rule with a column', async () => {
      mockOrderStagesRepository.exists.mockResolvedValue(true);

      const result = await service.create({
        ruleName: 'ล็อก quotation',
        warningAfterDays: 3,
        criticalAfterDays: 7,
        actionType: 'edit_lock',
        stageKey: 'quotation',
      });

      expect(result.stageKey).toBe('quotation');
      expect(result.actionType).toBe('edit_lock');
    });

    it('rejects clearing the column of an existing edit_lock rule', async () => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...baseRule,
        actionType: 'edit_lock',
        stageKey: 'quotation',
      });

      await expect(
        service.update(5, { stageKey: null }),
      ).rejects.toThrow('ต้องเลือกคอลัมน์ที่จะล็อก');

      expect(mockRulesRepository.save).not.toHaveBeenCalled();
    });
  });

  /*
   * assertNotEditLocked — ใช้โดยฝั่งแก้ไขข้อมูล/ไฟล์/ลบรายการ
   * (การย้ายคอลัมน์ไม่เรียก -> ลากการ์ดออกได้เสมอ)
   */
  describe('assertNotEditLocked', () => {
    const lockRule = {
      ...baseRule,
      id: 6,
      ruleName: 'ล็อกคอลัมน์ Quotation',
      actionType: 'edit_lock' as const,
      stageKey: 'quotation',
    };

    it('throws 403 with errorCode EDIT_LOCKED when a rule locks the column', async () => {
      mockRulesRepository.find.mockResolvedValue([lockRule]);

      expect.assertions(3);

      try {
        await service.assertNotEditLocked(
          'order_pipeline',
          'quotation',
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);

        const response = (
          error as ForbiddenException
        ).getResponse() as Record<string, unknown>;

        expect(response.errorCode).toBe('EDIT_LOCKED');
        expect(String(response.message)).toContain(
          'ล็อกไม่ให้แก้ไขข้อมูลตาม Rule "ล็อกคอลัมน์ Quotation"',
        );
      }
    });

    it('passes when the column has no lock rule', async () => {
      mockRulesRepository.find.mockResolvedValue([]);

      await expect(
        service.assertNotEditLocked('order_pipeline', 'po'),
      ).resolves.toBeUndefined();

      expect(mockRulesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            actionType: 'edit_lock',
            boardType: 'order_pipeline',
          },
        }),
      );
    });

    it('treats a null stage key as not locked', async () => {
      await expect(
        service.assertNotEditLocked('order_pipeline', null),
      ).resolves.toBeUndefined();

      expect(mockRulesRepository.find).not.toHaveBeenCalled();
    });
  });
});
