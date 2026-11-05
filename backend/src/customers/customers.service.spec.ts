import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
import { CustomersService } from './customers.service.js';
import { Customer } from './entities/customer.entity.js';

describe('CustomersService', () => {
  let service: CustomersService;

  const saved: any[] = [];

  const mockCustomersRepository = {
    count: vi.fn().mockResolvedValue(0),
    findOne: vi.fn(),
    create: vi.fn((payload: unknown) => payload),
    save: vi.fn(async (payload: any) => {
      saved.push(payload);
      return {
        customerId: 1,
        ...payload,
      };
    }),
    createQueryBuilder: vi.fn(),
    manager: {
      query: vi.fn().mockResolvedValue([]),
    },
  };

  const mockStagesService = {
    findAll: vi.fn().mockResolvedValue([
      {
        stageKey: 'lead',
        label: 'Lead',
        color: '#64748b',
      },
    ]),
    exists: vi.fn().mockResolvedValue(true),
  };

  /* edit-lock: ค่าเริ่มต้น = ไม่มี rule ล็อก */
  const mockAgingRulesService = {
    assertNotEditLocked: vi
      .fn()
      .mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    saved.length = 0;

    mockCustomersRepository.count.mockResolvedValue(
      0,
    );
    mockStagesService.findAll.mockResolvedValue([
      {
        stageKey: 'lead',
        label: 'Lead',
        color: '#64748b',
      },
    ]);
    mockStagesService.exists.mockResolvedValue(true);
    mockAgingRulesService.assertNotEditLocked.mockResolvedValue(
      undefined,
    );

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          CustomersService,
          {
            provide: getRepositoryToken(Customer),
            useValue: mockCustomersRepository,
          },
          {
            provide: PipelineStagesService,
            useValue: mockStagesService,
          },
          {
            provide: AgingRulesService,
            useValue: mockAgingRulesService,
          },
        ],
      }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should count every customer including the deactivated ones', async () => {
    mockCustomersRepository.count.mockResolvedValue(
      23,
    );

    await expect(service.countAll()).resolves.toBe(
      23,
    );
    expect(
      mockCustomersRepository.count,
    ).toHaveBeenCalledTimes(1);
  });

  it('should assign the given owner when creating a customer', async () => {
    await service.create(
      { companyName: 'บริษัท ทดสอบ จำกัด' },
      5,
    );

    const [payload] = saved;

    expect(payload.assignedId).toBe(5);
  });

  it('should prefer the owner from the dto when provided', async () => {
    await service.create(
      {
        companyName: 'บริษัท ทดสอบ จำกัด',
        assignedId: 9,
      },
      5,
    );

    const [payload] = saved;

    expect(payload.assignedId).toBe(9);
  });

  it('should leave the customer unassigned when no owner is given', async () => {
    await service.create({
      companyName: 'บริษัท ทดสอบ จำกัด',
    });

    const [payload] = saved;

    expect(payload.assignedId).toBeNull();
  });

  /*
   * edit-lock: บล็อก "การแก้ไขข้อมูล"
   * แต่ payload {status} (การลากการ์ดเปลี่ยนคอลัมน์) ยังผ่านเสมอ
   */
  describe('edit-lock', () => {
    const lockedError = () =>
      new ForbiddenException({
        errorCode: 'EDIT_LOCKED',
        message: 'คอลัมน์นี้ถูกล็อกไม่ให้แก้ไขข้อมูล',
      });

    beforeEach(() => {
      mockCustomersRepository.findOne.mockResolvedValue({
        customerId: 3,
        status: 'lead',
        companyName: 'บริษัท เดิม',
      });
    });

    it('blocks content edits when the column is locked', async () => {
      mockAgingRulesService.assertNotEditLocked.mockRejectedValue(
        lockedError(),
      );

      await expect(
        service.update(3, { companyName: 'บริษัท ใหม่' }),
      ).rejects.toMatchObject({
        response: { errorCode: 'EDIT_LOCKED' },
      });

      expect(
        mockAgingRulesService.assertNotEditLocked,
      ).toHaveBeenCalledWith('customers', 'lead');
      expect(
        mockCustomersRepository.save,
      ).not.toHaveBeenCalled();
    });

    it('allows a status-only move even when the column is locked', async () => {
      mockAgingRulesService.assertNotEditLocked.mockRejectedValue(
        lockedError(),
      );
      mockStagesService.exists.mockResolvedValue(true);

      await service.update(3, { status: 'qualified' });

      expect(
        mockAgingRulesService.assertNotEditLocked,
      ).not.toHaveBeenCalled();
      expect(
        mockCustomersRepository.save,
      ).toHaveBeenCalled();
    });

    it('blocks deactivating a customer in a locked column', async () => {
      mockAgingRulesService.assertNotEditLocked.mockRejectedValue(
        lockedError(),
      );

      await expect(service.deactivate(3)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      expect(
        mockCustomersRepository.save,
      ).not.toHaveBeenCalled();
    });
  });
});
