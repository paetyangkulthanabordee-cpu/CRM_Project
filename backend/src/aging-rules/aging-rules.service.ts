import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AgingRule } from './entities/aging-rule.entity.js';

import type {
  AgingRuleView,
  CreateAgingRuleDto,
  UpdateAgingRuleDto,
} from './dto/aging-rule.dto.js';

/*
 * Time-based Workflow Rules (Aging Rules)
 *
 * บริการนี้ไม่ได้ "บังคับ" อะไรตอนย้ายการ์ดเหมือน workflow_rules
 * แต่เป็น Threshold ให้หน้าบอร์ดเอาไปคิดสี Card จากจำนวนวัน
 * ที่ไม่มี activity (last_activity_at ของใบสั่งซื้อ)
 */
@Injectable()
export class AgingRulesService {
  constructor(
    @InjectRepository(AgingRule)
    private readonly rulesRepository: Repository<AgingRule>,
  ) {}

  async findAll(): Promise<AgingRuleView[]> {
    const rules = await this.rulesRepository.find({
      order: { isActive: 'DESC', id: 'ASC' },
    });

    return rules.map((rule) => this.toView(rule));
  }

  async create(dto: CreateAgingRuleDto): Promise<AgingRuleView> {
    this.assertThresholdsValid(dto.warningAfterDays, dto.criticalAfterDays);

    const saved = await this.rulesRepository.save(
      this.rulesRepository.create({
        ruleName: dto.ruleName.trim(),
        warningAfterDays: dto.warningAfterDays,
        criticalAfterDays: dto.criticalAfterDays,
        isActive: dto.isActive ?? true,
      }),
    );

    return this.toView(saved);
  }

  async update(
    ruleId: number,
    dto: UpdateAgingRuleDto,
  ): Promise<AgingRuleView> {
    const rule = await this.findOne(ruleId);

    /*
     * ใช้ค่าใหม่ทับค่าเดิมก่อน validate
     * เพราะบาง field อาจไม่ได้ส่งมาในรอบนี้
     */
    const nextWarning = dto.warningAfterDays ?? rule.warningAfterDays;
    const nextCritical = dto.criticalAfterDays ?? rule.criticalAfterDays;

    this.assertThresholdsValid(nextWarning, nextCritical);

    rule.ruleName = dto.ruleName?.trim() ?? rule.ruleName;
    rule.warningAfterDays = nextWarning;
    rule.criticalAfterDays = nextCritical;

    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }

    await this.rulesRepository.save(rule);

    return this.toView(rule);
  }

  async remove(ruleId: number) {
    const rule = await this.findOne(ruleId);

    await this.rulesRepository.remove(rule);

    return {
      ruleId,
      deleted: true,
    };
  }

  /*
   * warning ต้องอย่างน้อย 1 วัน และ critical ต้องมากกว่า warning
   * ตรงกับ CHECK constraint ของตาราง aging_rules ใน migration 027
   */
  private assertThresholdsValid(
    warningAfterDays: number,
    criticalAfterDays: number,
  ) {
    if (criticalAfterDays <= warningAfterDays) {
      throw new BadRequestException(
        'Critical after ต้องมากกว่า Warning after เสมอ (เช่น Warning 3 วัน / Critical 7 วัน)',
      );
    }
  }

  private async findOne(ruleId: number): Promise<AgingRule> {
    const rule = await this.rulesRepository.findOne({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException('ไม่พบ Aging Rule นี้');
    }

    return rule;
  }

  private toView(rule: AgingRule): AgingRuleView {
    return {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      warningAfterDays: rule.warningAfterDays,
      criticalAfterDays: rule.criticalAfterDays,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
