import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PipelineStagesService } from '../pipeline-stages/pipeline-stages.service.js';
import { Customer } from './entities/customer.entity.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { ListCustomersDto } from './dto/list-customers.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    private readonly stagesService: PipelineStagesService,
  ) {}

  async findAll(query: ListCustomersDto) {
    const builder = this.customersRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect(
        'customer.assignedUser',
        'assigned',
      )
      .orderBy('customer.createdAt', 'DESC');

    if (query.status) {
      builder.andWhere('customer.status = :status', {
        status: query.status,
      });
    }

    if (query.search) {
      builder.andWhere(
        '(customer.companyName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    return builder.getMany();
  }

  async findOne(customerId: number) {
    const customer =
      await this.customersRepository.findOne({
        where: { customerId },
        relations: { assignedUser: true },
      });

    if (!customer) {
      throw new NotFoundException(
        'ไม่พบลูกค้ารายนี้',
      );
    }

    return customer;
  }

  private async firstStageKey() {
    const stages =
      await this.stagesService.findAll();

    if (stages.length === 0) {
      throw new NotFoundException(
        'ยังไม่มีคอลัมน์ใน Sales Pipeline กรุณาเพิ่มคอลัมน์ก่อน',
      );
    }

    return stages[0].stageKey;
  }

  private async assertStageExists(
    stageKey: string,
  ) {
    const exists =
      await this.stagesService.exists(stageKey);

    if (!exists) {
      throw new NotFoundException(
        `ไม่พบคอลัมน์ "${stageKey}" ใน Sales Pipeline`,
      );
    }
  }

  async create(
    dto: CreateCustomerDto,
    assignedId?: number,
  ) {
    const status =
      dto.status ??
      (await this.firstStageKey());

    await this.assertStageExists(status);

    const customer =
      this.customersRepository.create({
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        status,
        assignedId:
          dto.assignedId ?? assignedId ?? null,
      });

    return this.customersRepository.save(customer);
  }

  async update(
    customerId: number,
    dto: UpdateCustomerDto,
  ) {
    const customer = await this.findOne(customerId);

    if (dto.status !== undefined) {
      await this.assertStageExists(dto.status);
    }

    const changes = Object.fromEntries(
      Object.entries(dto).filter(
        ([, value]) => value !== undefined,
      ),
    );

    Object.assign(customer, changes);

    return this.customersRepository.save(customer);
  }

  async remove(customerId: number) {
    const customer = await this.findOne(customerId);

    await this.customersRepository.remove(customer);

    return { customerId, deleted: true };
  }
}