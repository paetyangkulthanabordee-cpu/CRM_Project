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
    const stages = await this.stagesService.findAll();

    const stats: {
      status: string;
      count: string;
    }[] = await this.customersRepository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('customer.isActive = true')
      .groupBy('customer.status')
      .getRawMany();

    const countByStatus = (statuses: readonly string[]) =>
      stats
        .filter((row) => statuses.includes(row.status))
        .reduce((sum, row) => sum + Number(row.count), 0);

    const keys = stages.map((stage) => stage.stageKey);

    const lostKeys = keys.filter((key) =>
      /not_interested|lost|reject/i.test(key),
    );

    const newKeys = keys.filter((key) => /lead|new/i.test(key));

    const dealKeys = keys.filter((key) =>
      /payment|contract|deal|won/i.test(key),
    );

    const totalCustomers = stats.reduce(
      (sum, row) => sum + Number(row.count),
      0,
    );
    const newCustomers = countByStatus(newKeys);
    const activeCustomers = stats
      .filter((row) => !lostKeys.includes(row.status))
      .reduce((sum, row) => sum + Number(row.count), 0);
    const dealCustomers = countByStatus(dealKeys);

    const wonCustomers = countByStatus(dealKeys);
    const closed = wonCustomers + countByStatus(lostKeys);

    const recentCustomers =
      await this.customersRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: { assignedUser: true },
      });

    return {
      kpis: {
        totalCustomers,
        newCustomers,
        activeCustomers,
        dealCustomers,
        conversionRate:
          closed === 0
            ? 0
            : Math.round((wonCustomers / closed) * 100),
      },
      statuses: stages.map((stage) => ({
        status: stage.stageKey,
        count: countByStatus([stage.stageKey]),
      })),
      stages: stages.map((stage, index) => ({
        stage: `${String(index + 1).padStart(2, '0')}. ${stage.label.toUpperCase()}`,
        status: stage.stageKey,
        count: countByStatus([stage.stageKey]),
      })),
      recentCustomers,
    };
  }
}