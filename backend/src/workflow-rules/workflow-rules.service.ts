import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';

import {
  WORKFLOW_FIELD_KEYS,
} from './condition-types.js';
import type {
  WorkflowConditionType,
  WorkflowFieldKey,
} from './condition-types.js';
import { WorkflowRule } from './entities/workflow-rule.entity.js';

import type {
  CreateWorkflowRuleDto,
  UpdateWorkflowRuleDto,
  WorkflowMoveCheckView,
  WorkflowRuleEvaluation,
  WorkflowRuleView,
} from './dto/workflow-rule.dto.js';

import type { DocType } from '../documents/document-types.js';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: 'ใบเสนอราคา',
  invoice: 'ใบแจ้งหนี้',
  receipt: 'ใบเสร็จ',
  purchase_order: 'เอกสาร PO',
};

const FIELD_LABELS: Record<WorkflowFieldKey, string> = {
  note: 'หมายเหตุ',
  details: 'รายการสินค้า',
  amount: 'ยอดเงิน',
};

@Injectable()
export class WorkflowRulesService {
  constructor(
    @InjectRepository(WorkflowRule)
    private readonly rulesRepository: Repository<WorkflowRule>,
    @InjectRepository(OrderPipeline)
    private readonly stagesRepository: Repository<OrderPipeline>,
    @InjectRepository(IssueOrderAttachment)
    private readonly attachmentsRepository: Repository<IssueOrderAttachment>,
    @InjectRepository(DocumentType)
    private readonly documentTypesRepository: Repository<DocumentType>,
    /*
     * ใช้ตอน GET /workflow-rules/check ที่รับ orderId มาตรง ๆ
     * ต้องโหลดใบสั่งซื้อเองเพื่อรู้ขั้นตอนปัจจุบัน (fromStage)
     */
    @InjectRepository(IssueOrder)
    private readonly ordersRepository: Repository<IssueOrder>,
  ) {}

  async findAll(): Promise<WorkflowRuleView[]> {
    const rules = await this.rulesRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.fromStage', 'fromStage')
      .leftJoinAndSelect('rule.toStage', 'toStage')
      .leftJoinAndSelect('rule.documentType', 'documentType')
      .orderBy('fromStage.position', 'ASC')
      .addOrderBy('toStage.position', 'ASC')
      .addOrderBy('rule.id', 'ASC')
      .getMany();

    return rules.map((rule) => this.toView(rule));
  }

  async create(
    dto: CreateWorkflowRuleDto,
  ): Promise<WorkflowRuleView> {
    /*
     * เงื่อนไข document: resolve ประเภทเอกสารจากคอลัมน์ FK ก่อน
     * (ลำดับ: dto.documentTypeId ที่ส่งมา -> config.docType string เดิม)
     * แล้ว sync ชื่อกลับเข้า config เพื่อให้ fallback ตรงกันเสมอ
     */
    const documentType =
      dto.conditionType === 'document'
        ? await this.resolveDocumentType(
            dto.documentTypeId,
            dto.conditionConfig,
          )
        : null;

    const config = this.normalizeConfig(
      dto.conditionType,
      documentType
        ? {
            ...(dto.conditionConfig ?? {}),
            docType: documentType.documentType,
          }
        : dto.conditionConfig,
    );

    await this.assertStagesAvailable(
      dto.fromStageId,
      dto.toStageId,
    );

    const saved = await this.rulesRepository.save(
      this.rulesRepository.create({
        ruleName: dto.ruleName.trim(),
        fromStageId: dto.fromStageId,
        toStageId: dto.toStageId,
        conditionType: dto.conditionType,
        conditionConfig: config,
        documentTypeId: documentType?.id ?? null,
        isRequired: dto.isRequired ?? true,
        isActive: dto.isActive ?? true,
      }),
    );

    return this.loadView(saved.id);
  }

  async update(
    ruleId: number,
    dto: UpdateWorkflowRuleDto,
  ): Promise<WorkflowRuleView> {
    const rule = await this.findOne(ruleId);

    /*
     * ใช้ค่าใหม่ทับค่าเดิมก่อน validate
     * เพราะ config ถูกต้องหรือไม่ขึ้นอยู่กับ conditionType สุดท้ายด้วย
     */
    const nextConditionType =
      dto.conditionType ?? rule.conditionType;

    const nextFrom = dto.fromStageId ?? rule.fromStageId;
    const nextTo = dto.toStageId ?? rule.toStageId;

    /*
     * หาประเภทเอกสารของเงื่อนไข document รอบถัดไป
     * - เปลี่ยนออกจาก document -> ล้างค่า (NULL)
     * - คง type/document ไว้ -> ใช้ค่าใหม่ถ้าส่งมา มิฉะนั้นคงค่าเดิม
     * - ย้ายเข้า document โดยไม่ระบุประเภท -> resolveDocumentType จะ throw 400
     */
    const documentType =
      nextConditionType === 'document'
        ? await this.resolveDocumentType(
            dto.documentTypeId ??
              (dto.conditionType === undefined &&
              dto.conditionConfig === undefined
                ? rule.documentTypeId ?? undefined
                : undefined),
            dto.conditionConfig ?? rule.conditionConfig,
          )
        : null;

    const nextConfigBase =
      dto.conditionType !== undefined ||
      dto.conditionConfig !== undefined
        ? dto.conditionConfig ?? rule.conditionConfig
        : rule.conditionConfig;

    /*
     * validate config ใหม่เฉพาะตอนที่ config/type เปลี่ยน
     * หรือมีการ resolve ประเภทเอกสารใหม่ และ sync ชื่อจากคอลัมน์ FK
     * กลับเข้า config.docType เพื่อให้ fallback ตรงกันเสมอ
     */
    const nextConfig =
      documentType !== null ||
      dto.conditionType !== undefined ||
      dto.conditionConfig !== undefined
        ? this.normalizeConfig(nextConditionType, {
            ...nextConfigBase,
            ...(documentType
              ? { docType: documentType.documentType }
              : {}),
          })
        : nextConfigBase;

    await this.assertStagesAvailable(nextFrom, nextTo);

    rule.ruleName = dto.ruleName?.trim() ?? rule.ruleName;
    rule.fromStageId = nextFrom;
    rule.toStageId = nextTo;
    rule.conditionType = nextConditionType;
    rule.conditionConfig = nextConfig;
    rule.documentTypeId = documentType?.id ?? null;

    if (dto.isRequired !== undefined) {
      rule.isRequired = dto.isRequired;
    }

    if (dto.isActive !== undefined) {
      rule.isActive = dto.isActive;
    }

    await this.rulesRepository.save(rule);

    return this.loadView(ruleId);
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
   * จุดบังคับใช้กฎ: เรียกก่อนบันทึกการย้ายขั้นตอน
   * ตรวจ rule ที่ active + required ของคู่ from -> to ทั้งหมด
   * ข้อไหนยังไม่ผ่านทั้งหมด -> throw 400 พร้อมรายการที่ต้องทำ
   * ถ้าไม่มี rule สำหรับคู่นี้ก็อนุญาตตามปกติ
   *
   * response ของ 400 แนบ errorCode + unmetRules มาด้วย
   * เพื่อให้หน้าบอร์ดเปิดฟอร์มรายละเอียดพร้อมแถบ mark ได้
   * (ข้อความ message คงเดิม เพื่อไม่ให้ Snackbar เปลี่ยน)
   */
  async assertMoveAllowed(
    order: IssueOrder,
    fromStageId: number,
    toStageId: number,
  ): Promise<void> {
    const evaluations = await this.evaluateRules(
      order,
      fromStageId,
      toStageId,
    );

    const unmet = evaluations.filter(
      (item) => !item.met,
    );

    if (unmet.length === 0) {
      return;
    }

    const toStage = await this.stagesRepository.findOne({
      where: { id: toStageId },
    });

    const destination = toStage
      ? ` ไปขั้นตอน "${toStage.label}"`
      : '';

    /*
     * รวมเหตุผลทุกข้อเป็น string เดียว
     * เพราะหน้าเวปดึง message[0] ไปแสดงใน Snackbar
     */
    throw new BadRequestException({
      statusCode: 400,
      errorCode: 'WORKFLOW_RULE_BLOCKED',
      message:
        `ไม่สามารถย้ายการ์ด${destination}ได้ เพราะยังไม่ผ่าน Workflow Rule: ` +
        unmet.map((item) => item.requirementText).join(' • '),
      unmetRules: unmet,
    });
  }

  /*
   * GET /workflow-rules/check: ตรวจ rule ของคู่ขั้นตอนแบบไม่บังคับ
   * คืนผลทุกข้อ (met หรือยัง) ให้หน้ารายละเอียดใบสั่งซื้อ
   * ใช้แสดงแถบ mark และอัปเดตหลังอัปโหลดไฟล์เสร็จ
   */
  async checkMove(
    orderId: number,
    toStageId: number,
  ): Promise<WorkflowMoveCheckView> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }

    const toStage = await this.stagesRepository.findOne({
      where: { id: toStageId },
    });

    if (!toStage) {
      throw new NotFoundException(
        'ไม่พบขั้นตอนที่ระบุในท่อออเดอร์',
      );
    }

    const rules = await this.evaluateRules(
      order,
      order.orderPipelineId,
      toStageId,
    );

    return {
      orderId,
      fromStageId: order.orderPipelineId,
      toStageId,
      toStageLabel: toStage.label,
      allowed: rules.every((item) => item.met),
      rules,
    };
  }

  /*
   * โหลด rule ที่ active + required ของคู่ from -> to แล้วตรวจทุกข้อ
   * ขั้นตอนเดียวกัน -> ไม่มี rule ต้องตรวจ (คืน [] เหมือนเดิม)
   */
  private async evaluateRules(
    order: IssueOrder,
    fromStageId: number,
    toStageId: number,
  ): Promise<WorkflowRuleEvaluation[]> {
    if (fromStageId === toStageId) {
      return [];
    }

    const rules = await this.rulesRepository.find({
      where: {
        fromStageId,
        toStageId,
        isActive: true,
        isRequired: true,
      },
      order: { id: 'ASC' },
    });

    const evaluations: WorkflowRuleEvaluation[] = [];

    for (const rule of rules) {
      evaluations.push(
        await this.evaluateRule(rule, order),
      );
    }

    return evaluations;
  }

  /*
   * ตรวจเงื่อนไขของ rule หนึ่ง ๆ กับใบสั่งซื้อ
   * นอกจาก met ยังคืนจำนวนปัจจุบัน/ที่ต้องการ
   * เพื่อให้หน้าเวปแสดงความคืบหน้าได้ (เช่น แนบแล้ว 1 จาก 2)
   *
   * ค่า config ผ่าน normalizeConfig มาแล้วจึงเชื่อได้ว่ารูปแบบถูกต้อง
   */
  private async evaluateRule(
    rule: WorkflowRule,
    order: IssueOrder,
  ): Promise<WorkflowRuleEvaluation> {
    const base = {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      conditionType: rule.conditionType,
      requirementText: this.describeRequirement(rule),
    };

    switch (rule.conditionType) {
      case 'attachment': {
        const minFiles = this.readMinFiles(
          rule.conditionConfig ?? {},
        );

        const currentCount =
          await this.attachmentsRepository.count({
            where: { issueOrderId: order.id },
          });

        return {
          ...base,
          met: currentCount >= minFiles,
          documentTypeId: null,
          documentTypeLabel: null,
          currentCount,
          requiredCount: minFiles,
        };
      }

      case 'field': {
        const met = await this.isFieldFilled(rule, order);

        return {
          ...base,
          met,
          documentTypeId: null,
          documentTypeLabel: null,
          currentCount: met ? 1 : 0,
          requiredCount: 1,
        };
      }

      case 'document': {
        /*
         * ตรวจจากไฟล์แนบของใบสั่งซื้อนี้:
         * ต้องมีไฟล์แนบที่ document_type_id ตรงกับที่ rule ระบุ
         * (เดิมตรวจตาราง documents ที่ถูก DROP ไปแล้ว — migration 024)
         */
        const documentTypeId =
          await this.resolveEffectiveDocumentTypeId(rule);

        const label = this.resolveDocumentTypeLabel(rule);

        if (documentTypeId === null) {
          return {
            ...base,
            met: false,
            documentTypeId: null,
            documentTypeLabel: label,
            currentCount: 0,
            requiredCount: 1,
          };
        }

        const currentCount =
          await this.attachmentsRepository.count({
            where: {
              issueOrderId: order.id,
              documentTypeId,
            },
          });

        return {
          ...base,
          met: currentCount > 0,
          documentTypeId,
          documentTypeLabel: label,
          currentCount,
          requiredCount: 1,
        };
      }

      case 'payment': {
        /*
         * ข้อมูลการชำระเงิน = ไฟล์แนบใบเสร็จของใบสั่งซื้อนี้
         * (ตาราง documents ถูก DROP ไปแล้ว — migration 024)
         *
         * documentTypeId ของ rule ประเภทนี้ชี้ไปประเภท "receipt"
         * เพื่อให้หน้ารายละเอียดเลือกประเภทตอนอัปโหลดให้ตรง rule เลย
         */
        const receiptTypeId =
          await this.resolveDocumentTypeIdByKind(
            'receipt',
          );

        if (receiptTypeId === null) {
          return {
            ...base,
            met: false,
            documentTypeId: null,
            documentTypeLabel: DOC_TYPE_LABELS.receipt,
            currentCount: 0,
            requiredCount: 1,
          };
        }

        const currentCount =
          await this.attachmentsRepository.count({
            where: {
              issueOrderId: order.id,
              documentTypeId: receiptTypeId,
            },
          });

        return {
          ...base,
          met: currentCount > 0,
          documentTypeId: receiptTypeId,
          documentTypeLabel: DOC_TYPE_LABELS.receipt,
          currentCount,
          requiredCount: 1,
        };
      }

      default:
        return {
          ...base,
          met: true,
          documentTypeId: null,
          documentTypeLabel: null,
          currentCount: 1,
          requiredCount: 1,
        };
    }
  }

  /*
   * เงื่อนไข type "field": ตรวจว่าฟิลด์ที่เลือกมีค่าแล้วหรือยัง
   */
  private async isFieldFilled(
    rule: WorkflowRule,
    order: IssueOrder,
  ): Promise<boolean> {
    const config = rule.conditionConfig ?? {};

    const field = this.readConfigString(
      config,
      'field',
      'note',
    );

    if (field === 'amount') {
      return order.amount > 0;
    }

    if (field === 'details') {
      /*
       * นับจากตาราง detail ตรง ๆ เพราะ entity ที่ส่งเข้ามา
       * เป็นตัวที่โหลดแบบไม่มี relation (ใช้ตอน save)
       */
      const rows: { count: string }[] =
        await this.rulesRepository.manager.query(
          `SELECT COUNT(*)::int AS count
           FROM issue_order_detail
           WHERE issue_order_id = $1`,
          [order.id],
        );

      return Number(rows[0]?.count ?? 0) > 0;
    }

    return Boolean(order.note?.trim());
  }

  /*
   * ข้อความภาษาไทยบอกว่าต้องทำอะไรถึงจะผ่าน rule นี้
   * ข้อความนี้จะถูกต่อท้ายตอน 400 แล้วโชว์บน Snackbar หน้าบอร์ด
   */
  private describeRequirement(
    rule: WorkflowRule,
  ): string {
    const config = rule.conditionConfig ?? {};
    const name = `"${rule.ruleName}"`;

    switch (rule.conditionType) {
      case 'attachment': {
        const minFiles = this.readMinFiles(config);

        return `${name} ต้องแนบไฟล์อย่างน้อย ${minFiles} ไฟล์ (อัปโหลดไฟล์ที่ใบสั่งซื้อก่อน)`;
      }

      case 'field': {
        const field = this.readConfigString(
          config,
          'field',
          'note',
        );
        const label =
          FIELD_LABELS[field as WorkflowFieldKey] ??
          field;

        return `${name} ต้องกรอกข้อมูล "${label}" ก่อน`;
      }

      case 'document': {
        /*
         * label มาจาก relation documentType (คอลัมน์ FK)
         * fallback ไป config.docType ของ rule เก่า ถ้า join ไม่เจอ
         */
        const label = this.resolveDocumentTypeLabel(rule);

        if (!label) {
          return `${name} ต้องมีไฟล์แนบประเภทที่ระบุของใบสั่งซื้อนี้ก่อน (ไม่พบประเภทเอกสาร)`;
        }

        return `${name} ต้องมีไฟล์แนบประเภท ${label} ของใบสั่งซื้อนี้ก่อน`;
      }

      case 'payment':
        return `${name} ต้องมีไฟล์แนบใบเสร็จของใบสั่งซื้อนี้ก่อน`;

      default:
        return `${name} ยังไม่ผ่านเงื่อนไข`;
    }
  }

  /*
   * ค่า config ถูกต้องขึ้นอยู่กับ conditionType
   * จึง validate + ตัดให้เหลือเฉพาะค่าที่ต้องใช้ตรงนี้
   */
  private normalizeConfig(
    conditionType: WorkflowConditionType,
    raw: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    switch (conditionType) {
      case 'attachment': {
        const rawMin = raw?.minFiles;
        const minFiles =
          rawMin === undefined ||
          rawMin === null ||
          rawMin === ''
            ? 1
            : Number(rawMin);

        if (
          !Number.isInteger(minFiles) ||
          minFiles < 1 ||
          minFiles > 50
        ) {
          throw new BadRequestException(
            'จำนวนไฟล์ที่ต้องแนบต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 50',
          );
        }

        return { minFiles };
      }

      case 'field': {
        const field = this.readConfigString(
          raw,
          'field',
        );

        if (!field) {
          throw new BadRequestException(
            'กรุณาเลือกฟิลด์ข้อมูลที่ต้องให้กรอก (note, details หรือ amount)',
          );
        }

        if (
          !WORKFLOW_FIELD_KEYS.includes(
            field as WorkflowFieldKey,
          )
        ) {
          throw new BadRequestException(
            `ไม่รองรับฟิลด์ "${field}" (รองรับ ${WORKFLOW_FIELD_KEYS.join(', ')})`,
          );
        }

        return { field };
      }

      case 'document': {
        const docType = this.readConfigString(
          raw,
          'docType',
        );

        if (!docType) {
          throw new BadRequestException(
            'กรุณาเลือกประเภทเอกสารที่ต้องมีก่อนย้ายขั้นตอน',
          );
        }

        /*
         * ไม่เช็คกับ constant DOC_TYPES อีกต่อไป —
         * ตาราง document_type เป็นแหล่งความจริง
         * (type ใหม่ที่เพิ่มผ่านหน้า /document-types ใช้กับ Rule ได้)
         *
         * การยืนยันว่ามีอยู่จริงทำใน resolveDocumentType()
         * ซึ่งถูกเรียกก่อน normalizeConfig() ทุกครั้งที่
         * conditionType = 'document' (create บรรทัด 82 / update บรรทัด 143)
         * ไม่พบในตาราง -> throw 400 ที่นั่น
         */
        return { docType };
      }

      case 'payment':
        return {};

      default:
        throw new BadRequestException(
          'ประเภทเงื่อนไขไม่ถูกต้อง',
        );
    }
  }

  /*
   * หาแถว document_type ของเงื่อนไข "document"
   * ลำดับ: ค่า FK ที่ส่งมาตรง ๆ -> resolve จาก config.docType (string เดิม)
   * คืน entity เพื่อให้ caller sync ชื่อกลับเข้า config.docType ได้เสมอ
   * ไม่พบ -> throw 400 (ไม่ใช้ 404 เพราะเป็น input ของ rule ไม่ใช่ทรัพยากรแยก)
   */
  private async resolveDocumentType(
    explicitId: number | undefined,
    config: Record<string, unknown> | undefined,
  ): Promise<DocumentType> {
    if (explicitId !== undefined) {
      const found =
        await this.documentTypesRepository.findOne({
          where: { id: explicitId },
        });

      if (!found) {
        throw new BadRequestException(
          'ไม่พบประเภทเอกสารที่ระบุ',
        );
      }

      return found;
    }

    const docType = this.readConfigString(
      config,
      'docType',
    );

    if (!docType) {
      throw new BadRequestException(
        'กรุณาเลือกประเภทเอกสารที่ต้องมีก่อนย้ายขั้นตอน',
      );
    }

    const found =
      await this.documentTypesRepository.findOne({
        where: { documentType: docType },
      });

    if (!found) {
      throw new BadRequestException(
        `ไม่พบประเภทเอกสาร "${docType}" ในระบบ`,
      );
    }

    return found;
  }

  /*
   * ชื่อประเภทเอกสารของ rule (ใช้ทั้งในข้อความ describeRequirement
   * และใน payload evaluateRule ที่ส่งไปให้หน้าเวป)
   * ลำดับ: relation documentType (FK) -> config.docType ของ rule เก่า
   * ไม่เจอทั้งสองทาง -> null
   */
  private resolveDocumentTypeLabel(
    rule: WorkflowRule,
  ): string | null {
    const typeKey =
      rule.documentType?.documentType ??
      this.readConfigString(rule.conditionConfig, 'docType');

    if (!typeKey) {
      return null;
    }

    return DOC_TYPE_LABELS[typeKey as DocType] ?? typeKey;
  }

  /*
   * ค่า document_type_id ที่ใช้ตรวจเงื่อนไขจริง
   * คอลัมน์ FK เป็นแหล่งความจริง — ถ้า NULL (ข้อมูลเก่าที่ยังไม่ถูก backfill)
   * ให้ resolve จาก config.docType (fallback)
   * หาทั้งสองทางไม่เจอ -> null (ถือว่าไม่ผ่านเงื่อนไข)
   */
  private async resolveEffectiveDocumentTypeId(
    rule: WorkflowRule,
  ): Promise<number | null> {
    if (rule.documentTypeId !== null) {
      return rule.documentTypeId;
    }

    const docType = this.readConfigString(
      rule.conditionConfig,
      'docType',
    );

    if (!docType) {
      return null;
    }

    const found =
      await this.documentTypesRepository.findOne({
        where: { documentType: docType },
      });

    return found?.id ?? null;
  }

  /*
   * หา document_type_id จากชื่อ kind (เช่น 'receipt')
   * ใช้ตอนเงื่อนไขไม่ได้ผูกกับ rule โดยตรง (condition 'payment')
   */
  private async resolveDocumentTypeIdByKind(
    kind: string,
  ): Promise<number | null> {
    const found =
      await this.documentTypesRepository.findOne({
        where: { documentType: kind },
      });

    return found?.id ?? null;
  }

  private readMinFiles(
    config: Record<string, unknown>,
  ): number {
    const value = Number(config.minFiles);

    if (!Number.isInteger(value) || value < 1) {
      return 1;
    }

    return value;
  }

  /*
   * อ่านค่า string จาก config ที่เป็น jsonb
   * ค่าอาจถูกยิง API ตรง ๆ ให้เป็น object ก็ได้ จึงเช็คชนิดก่อนเสมอ
   */
  private readConfigString(
    config: Record<string, unknown> | undefined,
    key: string,
    fallback = '',
  ): string {
    const value = config?.[key];

    return typeof value === 'string'
      ? value
      : fallback;
  }

  private async assertStagesAvailable(
    fromStageId: number,
    toStageId: number,
  ) {
    if (fromStageId === toStageId) {
      throw new BadRequestException(
        'From Stage และ To Stage ต้องเป็นคนละขั้นตอน',
      );
    }

    const stages = await this.stagesRepository.find({
      where: [{ id: fromStageId }, { id: toStageId }],
    });

    if (stages.length < 2) {
      throw new NotFoundException(
        'ไม่พบขั้นตอนที่ระบุในท่อออเดอร์',
      );
    }
  }

  private async findOne(
    ruleId: number,
  ): Promise<WorkflowRule> {
    const rule =
      await this.rulesRepository.findOne({
        where: { id: ruleId },
      });

    if (!rule) {
      throw new NotFoundException(
        'ไม่พบ Workflow Rule นี้',
      );
    }

    return rule;
  }

  private async loadView(
    ruleId: number,
  ): Promise<WorkflowRuleView> {
    const rule =
      await this.rulesRepository.findOne({
        where: { id: ruleId },
        relations: {
          fromStage: true,
          toStage: true,
          documentType: true,
        },
      });

    if (!rule) {
      throw new NotFoundException(
        'ไม่พบ Workflow Rule นี้',
      );
    }

    return this.toView(rule);
  }

  private toView(rule: WorkflowRule): WorkflowRuleView {
    return {
      ruleId: rule.id,
      ruleName: rule.ruleName,
      fromStageId: rule.fromStageId,
      fromStageKey: rule.fromStage?.stageKey ?? '',
      fromStageLabel: rule.fromStage?.label ?? '',
      fromStageColor: rule.fromStage?.color ?? '#64748b',
      toStageId: rule.toStageId,
      toStageKey: rule.toStage?.stageKey ?? '',
      toStageLabel: rule.toStage?.label ?? '',
      toStageColor: rule.toStage?.color ?? '#64748b',
      conditionType: rule.conditionType,
      conditionConfig: rule.conditionConfig ?? {},
      documentTypeId: rule.documentTypeId ?? null,
      isRequired: rule.isRequired,
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
