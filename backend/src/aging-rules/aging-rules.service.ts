import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AgingRule } from './entities/aging-rule.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { PipelineStage } from '../pipeline-stages/entities/pipeline-stage.entity.js';

import type {
  AgingAction,
  AgingBoard,
  AgingRuleView,
  CreateAgingRuleDto,
  UpdateAgingRuleDto,
} from './dto/aging-rule.dto.js';

/*
 * Time-based Workflow Rules (Aging Rules)
 *
 * บริการนี้ไม่ได้ "บังคับ" อะไรตอนย้ายการ์ดเหมือน workflow_rules
 * แต่เป็น Threshold ให้หน้าบอร์ดเอาไปคิดสี Card จากจำนวนวัน
 * ที่ไม่มี activity (updated_at ของใบสั่งซื้อ/ลูกค้า — reset ทุกครั้งที่มีกิจกรรม)
 *
 * Scope ของ rule (ดู entity ประกอบ):
 *   board_type = บอร์ดที่มีผล (order_pipeline / customers)
 *   stage_key  = คอลัมน์บนบอร์ดนั้น, NULL = ทุกคอลัมน์
 * ฝั่ง backend ทำหน้าที่ "ตรวจว่า stage_key มีจริงในบอร์ดนั้น" เท่านั้น
 * การจับคู่ rule กับการ์ดแต่ละใบทำฝั่ง frontend (lib/useAgingStatus)
 */
@Injectable()
export class AgingRulesService {
  constructor(
    @InjectRepository(AgingRule)
    private readonly rulesRepository: Repository<AgingRule>,
    @InjectRepository(OrderPipeline)
    private readonly orderStagesRepository: Repository<OrderPipeline>,
    @InjectRepository(PipelineStage)
    private readonly customerStagesRepository: Repository<PipelineStage>,
  ) {}

  async findAll(): Promise<AgingRuleView[]> {
    const rules = await this.rulesRepository.find({
      order: { isActive: 'DESC', id: 'ASC' },
    });

    const labels = await this.loadStageLabels();

    return rules.map((rule) => this.toView(rule, labels));
  }

  async create(dto: CreateAgingRuleDto): Promise<AgingRuleView> {
    this.assertThresholdsValid(dto.warningAfterDays, dto.criticalAfterDays);

    const boardType = dto.boardType ?? 'order_pipeline';
    const stageKey = dto.stageKey ?? null;
    const actionType = dto.actionType ?? 'none';

    this.assertActionValid(boardType, actionType);
    this.assertActionStageKeyValid(actionType, stageKey);

    const archiveAfterDays = this.resolveArchiveAfterDays(
      actionType,
      dto.archiveAfterDays,
    );

    await this.assertStageExists(boardType, stageKey);

    const saved = await this.rulesRepository.save(
      this.rulesRepository.create({
        ruleName: dto.ruleName.trim(),
        warningAfterDays: dto.warningAfterDays,
        criticalAfterDays: dto.criticalAfterDays,
        isActive: dto.isActive ?? true,
        boardType,
        stageKey,
        actionType,
        archiveAfterDays,
      }),
    );

    const labels = await this.loadStageLabels();

    return this.toView(saved, labels);
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

    /*
     * scope: ถ้าเปลี่ยนบอร์ดแต่ไม่ได้ส่ง stageKey มาด้วย
     * ให้ล้างเป็น NULL (ทุกคอลัมน์) กัน stage_key เดิมค้าง
     * แล้วชี้ไปคอลัมน์ของอีกบอร์ด (ซึ่งคนละตาราง)
     */
    const nextBoard: AgingBoard = dto.boardType ?? rule.boardType;
    const boardChanged =
      dto.boardType !== undefined && dto.boardType !== rule.boardType;

    const nextAction: AgingAction =
      dto.actionType !== undefined
        ? dto.actionType
        : rule.actionType;

    /*
     * auto_archive ใช้ได้เฉพาะบอร์ดใบสั่งซื้อ —
     * ถ้า rule เดิมเป็น auto_archive แล้วถูกเปลี่ยนบอร์ดเป็น customers
     * จะ 400 ทันที (ให้เปลี่ยน action เป็น none ก่อน)
     */
    this.assertActionValid(nextBoard, nextAction);

    let nextStageKey: string | null;

    if (dto.stageKey !== undefined) {
      nextStageKey = dto.stageKey;
    } else if (boardChanged) {
      nextStageKey = null;
    } else {
      nextStageKey = rule.stageKey;
    }

    /*
     * edit_lock ต้องเจาะคอลัมน์ (ตรงกับที่ฟอร์มบังคับ)
     * กันการล็อกทั้งบอร์ดผ่าน API ตรง ๆ
     */
    this.assertActionStageKeyValid(nextAction, nextStageKey);

    await this.assertStageExists(nextBoard, nextStageKey);

    /*
     * จำนวนวันของ auto_archive:
     * - action != auto_archive -> ล้างเป็น null (คงข้อมูลสะอาด)
     * - action == auto_archive -> ใช้ค่าที่ส่งมา หรือค่าเดิมของ rule
     *   ถ้าไม่มีทั้งคู่ -> 400
     */
    const nextArchiveAfterDays = this.resolveArchiveAfterDays(
      nextAction,
      dto.archiveAfterDays ?? rule.archiveAfterDays,
    );

    rule.ruleName = dto.ruleName?.trim() ?? rule.ruleName;
    rule.warningAfterDays = nextWarning;
    rule.criticalAfterDays = nextCritical;
    rule.boardType = nextBoard;
    rule.stageKey = nextStageKey;
    rule.actionType = nextAction;
    rule.archiveAfterDays = nextArchiveAfterDays;

    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }

    await this.rulesRepository.save(rule);

    const labels = await this.loadStageLabels();

    return this.toView(rule, labels);
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
   * auto_archive = "ซ่อนการ์ด" ออกจากบอร์ด (ไม่ลบข้อมูล)
   * -> ใช้ได้เฉพาะบอร์ดใบสั่งซื้อเท่านั้น
   * (บอร์ดลูกค้าไม่ทำ — FK กันลบลูกค้าที่มีใบสั่งซื้อ)
   */
  private assertActionValid(
    boardType: AgingBoard,
    actionType: AgingAction,
  ): void {
    if (actionType === 'auto_archive' && boardType !== 'order_pipeline') {
      throw new BadRequestException(
        'Auto Archive ใช้ได้เฉพาะบอร์ด Order Pipeline เท่านั้น — เปลี่ยน Action เป็น "Color mark" หรือ "ล็อกแก้ไข" ถ้าต้องการใช้กับบอร์ด Customers',
      );
    }
  }

  /*
   * Rule แบบ "ล็อกแก้ไข" ต้องเจาะคอลัมน์
   * (ตรงกับที่ฟอร์มบังคับ — กันล็อกทั้งบอร์ดผ่าน API ตรง ๆ)
   */
  private assertActionStageKeyValid(
    actionType: AgingAction,
    stageKey: string | null,
  ): void {
    if (actionType === 'edit_lock' && stageKey === null) {
      throw new BadRequestException(
        'Rule แบบ "ล็อกแก้ไข" ต้องเลือกคอลัมน์ที่จะล็อก (ไม่รองรับ "ทุกคอลัมน์")',
      );
    }
  }

  /*
   * จำนวนวันของ auto_archive — บังคับกรอกเมื่อ action = auto_archive
   * คืน null เมื่อไม่ใช่ action นี้ (ล้างค่าเก่าทิ้งเอง)
   */
  private resolveArchiveAfterDays(
    actionType: AgingAction,
    value: number | null | undefined,
  ): number | null {
    if (actionType !== 'auto_archive') {
      return null;
    }

    if (value === undefined || value === null) {
      throw new BadRequestException(
        'Rule แบบ "Auto Archive" ต้องกำหนดจำนวนวัน (ซ่อนการ์ดเมื่อไม่มีกิจกรรมครบกำหนด)',
      );
    }

    return value;
  }

  /*
   * ตรวจว่า "คอลัมน์นี้ถูกล็อกไม่ให้แก้ไข" หรือไม่
   * เรียกก่อนแก้ไขข้อมูล/อัปโหลดไฟล์/ลบรายการ
   * แต่ "ไม่เรียกตอนย้ายคอลัมน์" -> การ์ดลากออกได้เสมอ
   *
   * stageKey = คอลัมน์ปัจจุบันของรายการที่จะแก้ (null = ไม่ทราบ -> ไม่ล็อก)
   * ถ้ามี rule active ที่ actionType=edit_lock เข้ากับบอร์ด+คอลัมน์ -> throw 403
   */
  async assertNotEditLocked(
    boardType: AgingBoard,
    stageKey: string | null,
  ): Promise<void> {
    if (stageKey === null) {
      return;
    }

    const rules = await this.rulesRepository.find({
      where: {
        isActive: true,
        actionType: 'edit_lock',
        boardType,
      },
    });

    const lockingRule = rules.find(
      (rule) => rule.stageKey === null || rule.stageKey === stageKey,
    );

    if (!lockingRule) {
      return;
    }

    throw new ForbiddenException({
      errorCode: 'EDIT_LOCKED',
      message: `คอลัมน์นี้ถูกล็อกไม่ให้แก้ไขข้อมูลตาม Rule "${lockingRule.ruleName}" — ย้ายการ์ดออกนอกคอลัมน์นี้ก่อนจึงจะแก้ไขได้`,
    });
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

  /*
   * ตรวจว่า stage_key มีอยู่จริงในตารางของบอร์ดที่เลือก
   * กัน ruleชี้ไปคอลัมน์ของอีกบอร์ด / คอลัมน์ที่ไม่มีอยู่จริง
   * stage_key = null (ทุกคอลัมน์) = ผ่านเลย ไม่ต้องตรวจ
   */
  private async assertStageExists(
    boardType: AgingBoard,
    stageKey: string | null,
  ): Promise<void> {
    if (stageKey === null) {
      return;
    }

    const repository =
      boardType === 'customers'
        ? this.customerStagesRepository
        : this.orderStagesRepository;

    const exists = await repository.exists({
      where: { stageKey },
    });

    if (!exists) {
      const boardLabel =
        boardType === 'customers' ? 'Customers' : 'Order Pipeline';

      throw new BadRequestException(
        `ไม่พบคอลัมน์ "${stageKey}" ในบอร์ด ${boardLabel}`,
      );
    }
  }

  /*
   * ชื่อคอลัมน์ของ "ทั้งสองบอร์ด" ใช้ผูก stageLabel ให้หน้าแอดมิน
   * โหลดครั้งเดียวต่อ 1 request (ตารางเล็กมาก)
   * key = `${boardType}:${stageKey}`
   */
  private async loadStageLabels(): Promise<Map<string, string>> {
    const [orderStages, customerStages] = await Promise.all([
      this.orderStagesRepository.find(),
      this.customerStagesRepository.find(),
    ]);

    const labels = new Map<string, string>();

    for (const stage of orderStages) {
      labels.set(`order_pipeline:${stage.stageKey}`, stage.label);
    }

    for (const stage of customerStages) {
      labels.set(`customers:${stage.stageKey}`, stage.label);
    }

    return labels;
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

  private toView(
    rule: AgingRule,
    labels: Map<string, string>,
  ): AgingRuleView {
    const stageLabel =
      rule.stageKey === null
        ? null
        : (labels.get(`${rule.boardType}:${rule.stageKey}`) ?? null);

    return {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      warningAfterDays: rule.warningAfterDays,
      criticalAfterDays: rule.criticalAfterDays,
      isActive: rule.isActive,
      boardType: rule.boardType,
      stageKey: rule.stageKey,
      actionType: rule.actionType,
      archiveAfterDays: rule.archiveAfterDays,
      stageLabel,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
