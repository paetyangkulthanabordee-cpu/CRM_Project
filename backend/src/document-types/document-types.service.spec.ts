import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { DocumentTypesService } from './document-types.service.js';
import { DocumentType } from '../documents/entities/document-type.entity.js';

describe('DocumentTypesService', () => {
  let service: DocumentTypesService;

  /*
   * rows = ข้อมูลในตาราง document_type จำลอง
   * usageRows = ผลลัพธ์ raw query นับการใช้งาน (id, rule_count, attachment_count)
   */
  let rows: DocumentType[];
  let usageRows: unknown[];

  const mockDocumentTypesRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    manager: {
      query: vi.fn(),
    },
  };

  function seedDefaultRows() {
    rows = [
      { id: 1, documentType: 'quotation' },
      { id: 2, documentType: 'invoice' },
      { id: 3, documentType: 'purchase_order' },
    ];
  }

  beforeEach(async () => {
    vi.clearAllMocks();

    seedDefaultRows();
    usageRows = [];

    mockDocumentTypesRepository.find.mockImplementation(
      async () => [...rows],
    );
    mockDocumentTypesRepository.manager.query.mockImplementation(
      async () => usageRows,
    );
    mockDocumentTypesRepository.findOne.mockImplementation(
      async ({
        where,
      }: {
        where: { id?: number; documentType?: unknown };
      }) => {
        if (where.id !== undefined) {
          return (
            rows.find((row) => row.id === where.id) ?? null
          );
        }

        /*
         * ฝั่ง service ส่ง ILike(...) มาเป็น FindOperator
         * mock ต้อง unwrap ค่า .value ออกก่อนเทียบ
         */
        if (where.documentType !== undefined) {
          const raw = where.documentType as
            | string
            | { value?: unknown };

          const name = String(
            typeof raw === 'string' ? raw : raw.value,
          ).toLowerCase();

          return (
            rows.find(
              (row) =>
                row.documentType.toLowerCase() === name,
            ) ?? null
          );
        }

        return null;
      },
    );
    mockDocumentTypesRepository.save.mockImplementation(
      async (payload: DocumentType) => payload,
    );
    mockDocumentTypesRepository.remove.mockImplementation(
      async (payload: DocumentType) => payload,
    );

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          DocumentTypesService,
          {
            provide: getRepositoryToken(DocumentType),
            useValue: mockDocumentTypesRepository,
          },
        ],
      }).compile();

    service = module.get<DocumentTypesService>(
      DocumentTypesService,
    );
  });

  it('should return every document type ordered by id with usage counts', async () => {
    usageRows = [
      {
        id: 1,
        rule_count: '2',
        attachment_count: '5',
      },
      {
        id: 2,
        rule_count: '0',
        attachment_count: '1',
      },
      {
        id: 3,
        rule_count: '0',
        attachment_count: '0',
      },
    ];

    const result = await service.findAll();

    expect(result.map((row) => row.id)).toEqual([
      1, 2, 3,
    ]);
    expect(result[0]).toMatchObject({
      documentType: 'quotation',
      ruleUsageCount: 2,
      attachmentUsageCount: 5,
    });
    /* แถวที่ไม่มีในผล raw query -> นับเป็น 0 */
    expect(result[2]).toMatchObject({
      ruleUsageCount: 0,
      attachmentUsageCount: 0,
    });
  });

  it('should create with the trimmed name', async () => {
    const created = await service.create({
      documentType: '  delivery_note  ',
    });

    expect(created.documentType).toBe('delivery_note');
    expect(
      mockDocumentTypesRepository.save,
    ).toHaveBeenCalledTimes(1);
  });

  it('should reject a duplicate name case-insensitively', async () => {
    mockDocumentTypesRepository.findOne.mockResolvedValue({
      id: 9,
      documentType: 'Quotation',
    });

    await expect(
      service.create({ documentType: 'quotation' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(
      mockDocumentTypesRepository.save,
    ).not.toHaveBeenCalled();
  });

  it('should allow renaming without hitting the duplicate guard', async () => {
    const updated = await service.update(1, {
      documentType: 'estimate',
    });

    expect(updated.documentType).toBe('estimate');

    /*
     * findOne ถูกเรียก 2 ครั้ง:
     * 1) โหลดแถวเดิม  2) ตรวจชื่อซ้ำ (ต้องไม่ชนกับ id ตัวเอง)
     */
    expect(
      mockDocumentTypesRepository.findOne,
    ).toHaveBeenCalledTimes(2);
    expect(
      mockDocumentTypesRepository.save,
    ).toHaveBeenCalledTimes(1);
  });

  it('should throw when the document type does not exist', async () => {
    await expect(service.update(99, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should block delete when the type is still referenced', async () => {
    usageRows = [
      {
        id: 3,
        rule_count: '1',
        attachment_count: '4',
      },
    ];

    await expect(service.remove(3)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(
      mockDocumentTypesRepository.remove,
    ).not.toHaveBeenCalled();
  });

  it('should delete an unused document type', async () => {
    usageRows = [
      {
        id: 3,
        rule_count: '0',
        attachment_usage_count: '0',
        attachment_count: '0',
      },
    ];

    await expect(service.remove(3)).resolves.toEqual({
      id: 3,
      deleted: true,
    });

    expect(
      mockDocumentTypesRepository.remove,
    ).toHaveBeenCalledTimes(1);
  });
});
