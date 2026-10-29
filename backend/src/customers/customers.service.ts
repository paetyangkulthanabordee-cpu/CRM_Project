import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { EntityManager } from 'typeorm';

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

    /*
     * ค่าเริ่มต้นซ่อนลูกค้าที่ปิดใช้งาน
     * ต้องขอเฉพาะ inactive ด้วย onlyInactive เท่านั้น
     */
    if (query.onlyInactive) {
      builder.andWhere('customer.isActive = false');
    } else {
      builder.andWhere('customer.isActive = true');
    }

    if (query.status && query.status.length > 0) {
      builder.andWhere(
        'customer.status IN (:...status)',
        { status: query.status },
      );
    }

    if (query.search) {
      builder.andWhere(
        '(customer.companyName ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search OR assigned.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.dateFrom) {
      builder.andWhere('customer.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    /*
     * dateTo แบบ YYYY-MM-DD = รวมทั้งวันนั้น (ใช้ถัดจากวันสิ้นวัน)
     * แบบ ISO datetime = ตรงเวลานั้นพอดี
     */
    if (query.dateTo) {
      if (query.dateTo.length === 10) {
        const nextDay = new Date(
          `${query.dateTo}T00:00:00Z`,
        );
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        builder.andWhere(
          'customer.createdAt < :dateTo',
          { dateTo: nextDay.toISOString() },
        );
      } else {
        builder.andWhere(
          'customer.createdAt <= :dateTo',
          { dateTo: query.dateTo },
        );
      }
    }

    /*
     * กรองผู้รับผิดชอบ
     * เลือกหลายคน = IN หรือรวมยังไม่ระบุถ้าเปิด unassigned
     */
    const assignedIds = query.assignedId ?? [];
    const includeUnassigned =
      query.unassigned === true;

    if (assignedIds.length > 0 && includeUnassigned) {
      builder.andWhere(
        '(customer.assignedId IN (:...assignedIds) OR customer.assignedId IS NULL)',
        { assignedIds },
      );
    } else if (assignedIds.length > 0) {
      builder.andWhere(
        'customer.assignedId IN (:...assignedIds)',
        { assignedIds },
      );
    } else if (includeUnassigned) {
      builder.andWhere(
        'customer.assignedId IS NULL',
      );
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

    const [data, total] = await builder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /*
   * จำนวนลูกค้าทั้งหมด (นับทั้งที่ใช้งานอยู่และที่ปิดใช้งาน)
   * ใช้ตรวจว่ามีลูกค้าในระบบแล้วหรือยัง ก่อน seed ข้อมูลใหม่
   */
  async countAll(): Promise<number> {
    return this.customersRepository.count();
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

  /*
   * จำนวนการซื้อ = จำนวนใบเสร็จรับเงินทั้งหมดของลูกค้า
   * คำนวณใหม่ทั้งหมดทุกครั้งที่เอกสารของลูกค้าเปลี่ยน
   */
  async recalcPurchaseCount(
    customerId: number,
    manager?: EntityManager,
  ): Promise<number> {
    const executor =
      manager ?? this.customersRepository.manager;

    /*
     * ที่มาของ "ใบเสร็จ" เปลี่ยนไปหลัง migration 024
     * เดิม: ตาราง documents (doc_type = 'receipt')
     * ตอนนี้: ไฟล์แนบใบสั่งซื้อที่ระบุประเภทเป็นใบเสร็จ
     */
    const rows: { purchaseCount: number }[] =
      await executor.query(
        `UPDATE customers c
         SET purchase_count = (
           SELECT COUNT(*)::int
           FROM issue_order_attachment a
           INNER JOIN issue_order o ON o.id = a.issue_order_id
           INNER JOIN document_type dt ON dt.id = a.document_type_id
           WHERE o.customer_id = c.customer_id
             AND dt.document_type = 'receipt'
         )
         WHERE c.customer_id = $1
         RETURNING purchase_count`,
        [customerId],
      );

    return Number(rows[0]?.purchaseCount ?? 0);
  }

  async recalcPurchaseCountBatch(customerIds: number[]) {
    if (customerIds.length === 0) {
      return;
    }

    await this.customersRepository.query(
      `UPDATE customers c
       SET purchase_count = (
         SELECT COUNT(*)::int
         FROM issue_order_attachment a
         INNER JOIN issue_order o ON o.id = a.issue_order_id
         INNER JOIN document_type dt ON dt.id = a.document_type_id
         WHERE o.customer_id = c.customer_id
           AND dt.document_type = 'receipt'
       )
       WHERE c.customer_id = ANY($1::int[])`,
      [customerIds],
    );
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

  /*
   * ปิดใช้งานลูกค้า (soft delete)
   * ข้อมูลยังอยู่ในระบบ แค่ถูกซ่อนจากหน้าหลัก
   * และเปิดใช้งานอีกครั้งได้ผ่าน restore()
   */
  async deactivate(customerId: number) {
    const customer = await this.findOne(customerId);

    customer.isActive = false;

    const saved =
      await this.customersRepository.save(customer);

    return {
      customerId: saved.customerId,
      isActive: saved.isActive,
      deactivated: true,
    };
  }

  /*
   * เปิดใช้งานลูกค้าที่ปิดไว้กลับมา
   */
  async restore(customerId: number) {
    const customer = await this.findOne(customerId);

    customer.isActive = true;

    const saved =
      await this.customersRepository.save(customer);

    return {
      customerId: saved.customerId,
      isActive: saved.isActive,
      restored: true,
    };
  }
}