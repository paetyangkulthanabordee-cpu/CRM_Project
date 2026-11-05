import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';

import { WorkflowRulesService } from './workflow-rules.service.js';
import { WorkflowRule } from './entities/workflow-rule.entity.js';

import type {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
} from './dto/workflow-rule.dto.js';

/*
 * ครอบคลุมจุดที่หน้าบอร์ดพึ่งพา:
 * - assertMoveAllowed ต้อง throw 400 ที่มี errorCode + unmetRules
 *   (frontend เอาไปเปิดฟอร์มรายละเอียดพร้อมแถบ mark)
 * - checkMove ต้องคืนผลตรวจ rule ทุกข้อให้อัปเดตหลังอัปโหลดไฟล์
 */
describe('WorkflowRulesService', () => {
  let service: WorkflowRulesService;

  const attachmentRule = {
    id: 5,
    ruleName: 'ต้องแนบ PO ก่อนย้ายขั้น',
    fromStageId: 1,
    toStageId: 2,
    conditionType: 'attachment',
    conditionConfig: { minFiles: 2 },
    documentTypeId: null,
    isActive: true,
    isRequired: true,
  };

  const documentRule = {
    id: 6,
    ruleName: 'ต้องมีเอกสาร PO',
    fromStageId: 1,
    toStageId: 2,
    conditionType: 'document',
    conditionConfig: { docType: 'purchase_order' },
    documentTypeId: 7,
    isActive: true,
    isRequired: true,
  };

  const order = {
    id: 9,
    orderPipelineId: 1,
    amount: 107,
    note: null,
  };

  const mockRulesRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn((payload: unknown) => payload),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
    manager: {
      query: vi.fn().mockResolvedValue([]),
    },
  };

  const mockStagesRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({
      id: 2,
      label: 'เอกสารPO',
    }),
  };

  const mockAttachmentsRepository = {
    count: vi.fn().mockResolvedValue(0),
  };

  const mockDocumentTypesRepository = {
    findOne: vi.fn(),
  };

  const mockOrdersRepository = {
    findOne: vi
      .fn()
      .mockResolvedValue({ ...order }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRulesRepository.find.mockResolvedValue([]);
    mockStagesRepository.findOne.mockResolvedValue({
      id: 2,
      label: 'เอกสารPO',
    });
    mockAttachmentsRepository.count.mockResolvedValue(0);
    mockOrdersRepository.findOne.mockResolvedValue({
      ...order,
    });

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          WorkflowRulesService,
          {
            provide: getRepositoryToken(WorkflowRule),
            useValue: mockRulesRepository,
          },
          {
            provide: getRepositoryToken(OrderPipeline),
            useValue: mockStagesRepository,
          },
          {
            provide: getRepositoryToken(
              IssueOrderAttachment,
            ),
            useValue: mockAttachmentsRepository,
          },
          {
            provide: getRepositoryToken(DocumentType),
            useValue: mockDocumentTypesRepository,
          },
          {
            provide: getRepositoryToken(IssueOrder),
            useValue: mockOrdersRepository,
          },
        ],
      }).compile();

    service = module.get<WorkflowRulesService>(
      WorkflowRulesService,
    );
  });

  describe('assertMoveAllowed', () => {
    it('throws 400 with errorCode and unmetRules when attachments are missing', async () => {
      mockRulesRepository.find.mockResolvedValue([
        attachmentRule,
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(1);

      expect.assertions(5);

      try {
        await service.assertMoveAllowed(
          order as IssueOrder,
          1,
          2,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);

        const response = (
          error as BadRequestException
        ).getResponse() as Record<string, unknown>;

        expect(response.errorCode).toBe(
          'WORKFLOW_RULE_BLOCKED',
        );

        /*
         * ข้อความ string เดิมต้องคงไว้
         * เพราะหน้าบอร์ดดึง message ไปแสดงใน Snackbar
         */
        expect(response.message).toContain(
          'ไม่สามารถย้ายการ์ด ไปขั้นตอน "เอกสารPO"ได้',
        );

        const unmetRules = response.unmetRules as {
          ruleId: number;
          met: boolean;
          currentCount: number;
          requiredCount: number;
          requirementText: string;
        }[];

        expect(unmetRules).toHaveLength(1);
        expect(unmetRules[0]).toMatchObject({
          ruleId: 5,
          fieldKey: null,
          met: false,
          currentCount: 1,
          requiredCount: 2,
        });
      }
    });

    it('resolves when every rule is already met', async () => {
      mockRulesRepository.find.mockResolvedValue([
        attachmentRule,
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(2);

      await expect(
        service.assertMoveAllowed(
          order as IssueOrder,
          1,
          2,
        ),
      ).resolves.toBeUndefined();
    });

    it('skips rules that are inactive or not required', async () => {
      mockRulesRepository.find.mockResolvedValue([]);

      await expect(
        service.assertMoveAllowed(
          order as IssueOrder,
          1,
          2,
        ),
      ).resolves.toBeUndefined();

      expect(mockRulesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            fromStageId: 1,
            toStageId: 2,
            isActive: true,
            isRequired: true,
          },
        }),
      );
    });
  });

  describe('checkMove', () => {
    it('returns unmet document rule with document type details', async () => {
      mockRulesRepository.find.mockResolvedValue([
        documentRule,
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(0);

      const result = await service.checkMove(9, 2);

      expect(result).toMatchObject({
        orderId: 9,
        fromStageId: 1,
        toStageId: 2,
        toStageLabel: 'เอกสารPO',
        allowed: false,
      });

      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toMatchObject({
        ruleId: 6,
        conditionType: 'document',
        met: false,
        documentTypeId: 7,
        documentTypeLabel: 'เอกสาร PO',
        currentCount: 0,
        requiredCount: 1,
      });
      expect(result.rules[0].requirementText).toContain(
        'ประเภท เอกสาร PO',
      );
    });

    /*
     * rule ชนิด attachment ที่ระบุประเภท -> นับเฉพาะไฟล์
     * ประเภทนั้น (หน้ารายละเอียดแยกช่องแนบตามประเภทเอกสาร)
     */
    it('counts only the matching document type for typed attachment rules', async () => {
      mockRulesRepository.find.mockResolvedValue([
        {
          id: 11,
          ruleName: 'ต้องแนบใบเสนอราคา ก่อนย้ายขั้น',
          fromStageId: 1,
          toStageId: 2,
          conditionType: 'attachment',
          conditionConfig: {
            minFiles: 1,
            docType: 'quotation',
          },
          documentTypeId: 3,
          isActive: true,
          isRequired: true,
        },
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(0);

      const result = await service.checkMove(9, 2);

      expect(mockAttachmentsRepository.count).toHaveBeenCalledWith(
        {
          where: {
            issueOrderId: 9,
            documentTypeId: 3,
          },
        },
      );

      expect(result.allowed).toBe(false);
      expect(result.rules[0]).toMatchObject({
        conditionType: 'attachment',
        met: false,
        documentTypeId: 3,
        documentTypeLabel: 'ใบเสนอราคา',
        currentCount: 0,
        requiredCount: 1,
      });
      expect(result.rules[0].requirementText).toContain(
        'ประเภท ใบเสนอราคา',
      );
    });

    /*
     * rule ชนิด attachment ที่ไม่ระบุประเภท (documentTypeId = NULL)
     * -> คงพฤติกรรมเดิม: นับรวมไฟล์ทุกประเภท
     */
    it('counts every attachment when the rule has no document type', async () => {
      mockRulesRepository.find.mockResolvedValue([
        attachmentRule,
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(2);

      const result = await service.checkMove(9, 2);

      expect(mockAttachmentsRepository.count).toHaveBeenCalledWith(
        {
          where: { issueOrderId: 9 },
        },
      );

      expect(result.allowed).toBe(true);
      expect(result.rules[0]).toMatchObject({
        conditionType: 'attachment',
        met: true,
        documentTypeId: null,
        documentTypeLabel: null,
        currentCount: 2,
        requiredCount: 2,
      });
    });

    it('reports allowed once the matching file is attached', async () => {
      mockRulesRepository.find.mockResolvedValue([
        documentRule,
      ]);
      mockAttachmentsRepository.count.mockResolvedValue(1);

      const result = await service.checkMove(9, 2);

      expect(result.allowed).toBe(true);
      expect(result.rules[0]).toMatchObject({
        met: true,
        currentCount: 1,
      });
    });

    it('returns fieldKey for field rules so the form can place them under the right field', async () => {
      mockRulesRepository.find.mockResolvedValue([
        {
          id: 8,
          ruleName: 'ต้องมีหมายเหตุ',
          fromStageId: 1,
          toStageId: 2,
          conditionType: 'field',
          conditionConfig: { field: 'note' },
          documentTypeId: null,
          isActive: true,
          isRequired: true,
        },
      ]);

      const result = await service.checkMove(9, 2);

      expect(result.rules[0]).toMatchObject({
        conditionType: 'field',
        fieldKey: 'note',
        met: false,
        currentCount: 0,
        requiredCount: 1,
      });
    });

    it('returns no rules when moving within the same stage', async () => {
      const result = await service.checkMove(9, 1);

      expect(result).toMatchObject({
        allowed: true,
        rules: [],
      });
      expect(mockRulesRepository.find).not.toHaveBeenCalled();
    });
  });

  /*
   * rule ชนิด attachment ระบุประเภทได้ -> เก็บทั้งคอลัมน์ FK
   * และ sync ชื่อกลับเข้า config.docType (แบบเดียวกับ 'document')
   * ไม่ระบุประเภท -> documentTypeId = NULL = นับรวมไฟล์ทุกประเภท
   */
  describe('create', () => {
    beforeEach(() => {
      mockStagesRepository.find.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      mockRulesRepository.save.mockImplementation(
        (payload: unknown) => payload,
      );
      mockRulesRepository.findOne.mockResolvedValue({
        id: 21,
        ruleName: 'rule',
        fromStageId: 1,
        toStageId: 2,
        conditionType: 'attachment',
        conditionConfig: { minFiles: 1 },
        documentTypeId: null,
        isRequired: true,
        isActive: true,
      });
    });

    it('stores the document type of a typed attachment rule', async () => {
      mockDocumentTypesRepository.findOne.mockResolvedValue({
        id: 3,
        documentType: 'quotation',
      });

      await service.create({
        ruleName: ' ต้องแนบใบเสนอราคา ',
        fromStageId: 1,
        toStageId: 2,
        conditionType: 'attachment',
        conditionConfig: { minFiles: 2 },
        documentTypeId: 3,
      } as CreateWorkflowRuleDto);

      expect(mockRulesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleName: 'ต้องแนบใบเสนอราคา',
          conditionConfig: {
            minFiles: 2,
            docType: 'quotation',
          },
          documentTypeId: 3,
        }),
      );
    });

    it('leaves the type empty for generic attachment rules', async () => {
      await service.create({
        ruleName: 'ต้องแนบไฟล์',
        fromStageId: 1,
        toStageId: 2,
        conditionType: 'attachment',
        conditionConfig: { minFiles: 1 },
      } as CreateWorkflowRuleDto);

      expect(
        mockDocumentTypesRepository.findOne,
      ).not.toHaveBeenCalled();
      expect(mockRulesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conditionConfig: { minFiles: 1 },
          documentTypeId: null,
        }),
      );
    });
  });

  describe('update', () => {
    const typedAttachmentRule = {
      id: 31,
      ruleName: 'ต้องแนบใบเสนอราคา',
      fromStageId: 1,
      toStageId: 2,
      conditionType: 'attachment',
      conditionConfig: {
        minFiles: 1,
        docType: 'quotation',
      },
      documentTypeId: 3,
      isRequired: true,
      isActive: true,
    };

    beforeEach(() => {
      mockRulesRepository.findOne.mockResolvedValue({
        ...typedAttachmentRule,
      });
      mockStagesRepository.find.mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      mockRulesRepository.save.mockImplementation(
        (payload: unknown) => payload,
      );
      mockDocumentTypesRepository.findOne.mockResolvedValue({
        id: 3,
        documentType: 'quotation',
      });
    });

    /*
     * อัปเดตเฉพาะ config (ไม่แตะ conditionType/documentTypeId)
     * -> คงประเภทเดิมไว้ ห้ามล้างเงียบ ๆ
     */
    it('keeps the existing type when only conditionConfig changes', async () => {
      await service.update(31, {
        conditionConfig: { minFiles: 5 },
      } as UpdateWorkflowRuleDto);

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          documentTypeId: 3,
          conditionConfig: {
            minFiles: 5,
            docType: 'quotation',
          },
        }),
      );
    });

    /*
     * ส่ง conditionType + config ที่ไม่มี docType
     * = ตั้งใจล้างประเภท -> กลับเป็น rule นับรวมทุกประเภท
     */
    it('clears the type when attachment is saved without one', async () => {
      await service.update(31, {
        conditionType: 'attachment',
        conditionConfig: { minFiles: 5 },
      } as UpdateWorkflowRuleDto);

      expect(mockRulesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          documentTypeId: null,
          conditionConfig: { minFiles: 5 },
        }),
      );
    });
  });
});
