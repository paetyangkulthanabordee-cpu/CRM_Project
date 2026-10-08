import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { Customer } from '../customers/entities/customer.entity.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly stagesService: PipelineStagesService,
  ) {}

  async getSummary() {
    const [customers, stages] =
      await Promise.all([
        this.customersRepository.find({
          where: { isActive: true },
        }),
        this.stagesService.findAll(),
      ]);

    const countByStatus = (
      statuses: readonly string[],
    ) =>
      customers.filter((customer) =>
        statuses.includes(customer.status),
      ).length;

    const keys = stages.map(
      (stage) => stage.stageKey,
    );

    const lostKeys = keys.filter((key) =>
      /not_interested|lost|reject/i.test(key),
    );

    const newKeys = keys.filter((key) =>
      /lead|new/i.test(key),
    );

    const dealKeys = keys.filter((key) =>
      /payment|contract|deal|won/i.test(
        key,
      ),
    );

    const totalCustomers = customers.length;
    const newCustomers = countByStatus(newKeys);
    const activeCustomers = customers.filter(
      (customer) =>
        !lostKeys.includes(customer.status),
    ).length;
    const dealCustomers =
      countByStatus(dealKeys);

    const wonCustomers = countByStatus(
      dealKeys,
    );
    const closed = wonCustomers + countByStatus(lostKeys);

    const recentCustomers = [...customers]
      .sort(
        (a, b) =>
          b.createdAt.getTime() -
          a.createdAt.getTime(),
      )
      .slice(0, 5);

    return {
      kpis: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        dealCustomers,
        conversionRate:
          closed === 0
            ? 0
            : Math.round(
                (wonCustomers / closed) * 100,
              ),
      },
      statuses: stages.map((stage) => ({
        status: stage.stageKey,
        count: countByStatus([stage.stageKey]),
      })),
      stages: stages.map((stage, index) => ({
        stage: `${String(
          index + 1,
        ).padStart(2, '0')}. ${stage.label.toUpperCase()}`,
        status: stage.stageKey,
        count: countByStatus([stage.stageKey]),
      })),
      recentCustomers,
    };
  }
}