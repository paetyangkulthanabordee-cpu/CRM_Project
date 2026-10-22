import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
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
});
