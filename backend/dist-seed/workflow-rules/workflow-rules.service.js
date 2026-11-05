var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentType } from '../documents/entities/document-type.entity.js';
import { IssueOrderAttachment } from '../issue-orders/entities/issue-order-attachment.entity.js';
import { IssueOrder } from '../issue-orders/entities/issue-order.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { WORKFLOW_FIELD_KEYS, } from './condition-types.js';
import { WorkflowRule } from './entities/workflow-rule.entity.js';
const DOC_TYPE_LABELS = {
    quotation: 'ใบเสนอราคา',
    invoice: 'ใบแจ้งหนี้',
    receipt: 'ใบเสร็จ',
    purchase_order: 'เอกสาร PO',
};
const FIELD_LABELS = {
    note: 'หมายเหตุ',
    details: 'รายการสินค้า',
    amount: 'ยอดเงิน',
};
let WorkflowRulesService = class WorkflowRulesService {
    rulesRepository;
    stagesRepository;
    attachmentsRepository;
    documentTypesRepository;
    ordersRepository;
    constructor(rulesRepository, stagesRepository, attachmentsRepository, documentTypesRepository, ordersRepository) {
        this.rulesRepository = rulesRepository;
        this.stagesRepository = stagesRepository;
        this.attachmentsRepository = attachmentsRepository;
        this.documentTypesRepository = documentTypesRepository;
        this.ordersRepository = ordersRepository;
    }
    async findAll() {
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
    async create(dto) {
        const documentType = dto.conditionType === 'document'
            ? await this.resolveDocumentType(dto.documentTypeId, dto.conditionConfig)
            : dto.conditionType === 'attachment'
                ? await this.resolveDocumentType(dto.documentTypeId, dto.conditionConfig, { optional: true })
                : null;
        const config = this.normalizeConfig(dto.conditionType, documentType
            ? {
                ...dto.conditionConfig,
                docType: documentType.documentType,
            }
            : dto.conditionConfig);
        await this.assertStagesAvailable(dto.fromStageId, dto.toStageId);
        const saved = await this.rulesRepository.save(this.rulesRepository.create({
            ruleName: dto.ruleName.trim(),
            fromStageId: dto.fromStageId,
            toStageId: dto.toStageId,
            conditionType: dto.conditionType,
            conditionConfig: config,
            documentTypeId: documentType?.id ?? null,
            isRequired: dto.isRequired ?? true,
            isActive: dto.isActive ?? true,
        }));
        return this.loadView(saved.id);
    }
    async update(ruleId, dto) {
        const rule = await this.findOne(ruleId);
        const nextConditionType = dto.conditionType ?? rule.conditionType;
        const nextFrom = dto.fromStageId ?? rule.fromStageId;
        const nextTo = dto.toStageId ?? rule.toStageId;
        const keepsConditionUntouched = dto.conditionType === undefined &&
            dto.conditionConfig === undefined;
        const keepsExistingType = dto.documentTypeId === undefined &&
            dto.conditionType === undefined &&
            this.readConfigString(dto.conditionConfig, 'docType') === '';
        const documentType = nextConditionType === 'document'
            ? await this.resolveDocumentType(dto.documentTypeId ??
                (keepsConditionUntouched
                    ? rule.documentTypeId ?? undefined
                    : undefined), dto.conditionConfig ?? rule.conditionConfig)
            : nextConditionType === 'attachment'
                ? await this.resolveDocumentType(dto.documentTypeId ??
                    (keepsExistingType
                        ? rule.documentTypeId ?? undefined
                        : undefined), keepsExistingType
                    ? rule.conditionConfig
                    : (dto.conditionConfig ??
                        rule.conditionConfig), { optional: true })
                : null;
        const nextConfigBase = dto.conditionType !== undefined ||
            dto.conditionConfig !== undefined
            ? dto.conditionConfig ?? rule.conditionConfig
            : rule.conditionConfig;
        const nextConfig = documentType !== null ||
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
    async remove(ruleId) {
        const rule = await this.findOne(ruleId);
        await this.rulesRepository.remove(rule);
        return {
            ruleId,
            deleted: true,
        };
    }
    async assertMoveAllowed(order, fromStageId, toStageId) {
        const evaluations = await this.evaluateRules(order, fromStageId, toStageId);
        const unmet = evaluations.filter((item) => !item.met);
        if (unmet.length === 0) {
            return;
        }
        const toStage = await this.stagesRepository.findOne({
            where: { id: toStageId },
        });
        const destination = toStage
            ? ` ไปขั้นตอน "${toStage.label}"`
            : '';
        throw new BadRequestException({
            statusCode: 400,
            errorCode: 'WORKFLOW_RULE_BLOCKED',
            message: `ไม่สามารถย้ายการ์ด${destination}ได้ เพราะยังไม่ผ่าน Workflow Rule: ` +
                unmet.map((item) => item.requirementText).join(' • '),
            unmetRules: unmet,
        });
    }
    async checkMove(orderId, toStageId) {
        const order = await this.ordersRepository.findOne({
            where: { id: orderId },
        });
        if (!order) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
        const toStage = await this.stagesRepository.findOne({
            where: { id: toStageId },
        });
        if (!toStage) {
            throw new NotFoundException('ไม่พบขั้นตอนที่ระบุในท่อออเดอร์');
        }
        const rules = await this.evaluateRules(order, order.orderPipelineId, toStageId);
        return {
            orderId,
            fromStageId: order.orderPipelineId,
            toStageId,
            toStageLabel: toStage.label,
            allowed: rules.every((item) => item.met),
            rules,
        };
    }
    async evaluateRules(order, fromStageId, toStageId) {
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
        const evaluations = [];
        for (const rule of rules) {
            evaluations.push(await this.evaluateRule(rule, order));
        }
        return evaluations;
    }
    async evaluateRule(rule, order) {
        const base = {
            ruleId: rule.id,
            ruleName: rule.ruleName,
            conditionType: rule.conditionType,
            fieldKey: rule.conditionType === 'field'
                ? this.readConfigString(rule.conditionConfig ?? {}, 'field', 'note')
                : null,
            requirementText: this.describeRequirement(rule),
        };
        switch (rule.conditionType) {
            case 'attachment': {
                const minFiles = this.readMinFiles(rule.conditionConfig ?? {});
                const documentTypeId = await this.resolveEffectiveDocumentTypeId(rule);
                const label = this.resolveDocumentTypeLabel(rule);
                const currentCount = await this.attachmentsRepository.count({
                    where: documentTypeId !== null
                        ? {
                            issueOrderId: order.id,
                            documentTypeId,
                        }
                        : { issueOrderId: order.id },
                });
                return {
                    ...base,
                    met: currentCount >= minFiles,
                    documentTypeId,
                    documentTypeLabel: label,
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
                const documentTypeId = await this.resolveEffectiveDocumentTypeId(rule);
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
                const currentCount = await this.attachmentsRepository.count({
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
                const receiptTypeId = await this.resolveDocumentTypeIdByKind('receipt');
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
                const currentCount = await this.attachmentsRepository.count({
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
    async isFieldFilled(rule, order) {
        const config = rule.conditionConfig ?? {};
        const field = this.readConfigString(config, 'field', 'note');
        if (field === 'amount') {
            return order.amount > 0;
        }
        if (field === 'details') {
            const rows = await this.rulesRepository.manager.query(`SELECT COUNT(*)::int AS count
           FROM issue_order_detail
           WHERE issue_order_id = $1`, [order.id]);
            return Number(rows[0]?.count ?? 0) > 0;
        }
        return Boolean(order.note?.trim());
    }
    describeRequirement(rule) {
        const config = rule.conditionConfig ?? {};
        const name = `"${rule.ruleName}"`;
        switch (rule.conditionType) {
            case 'attachment': {
                const minFiles = this.readMinFiles(config);
                const label = this.resolveDocumentTypeLabel(rule);
                if (!label) {
                    return `${name} ต้องแนบไฟล์อย่างน้อย ${minFiles} ไฟล์ (อัปโหลดไฟล์ที่ใบสั่งซื้อก่อน)`;
                }
                return `${name} ต้องแนบไฟล์ประเภท ${label} อย่างน้อย ${minFiles} ไฟล์ (อัปโหลดไฟล์ที่ใบสั่งซื้อก่อน)`;
            }
            case 'field': {
                const field = this.readConfigString(config, 'field', 'note');
                const label = FIELD_LABELS[field] ??
                    field;
                return `${name} ต้องกรอกข้อมูล "${label}" ก่อน`;
            }
            case 'document': {
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
    normalizeConfig(conditionType, raw) {
        switch (conditionType) {
            case 'attachment': {
                const rawMin = raw?.minFiles;
                const minFiles = rawMin === undefined ||
                    rawMin === null ||
                    rawMin === ''
                    ? 1
                    : Number(rawMin);
                if (!Number.isInteger(minFiles) ||
                    minFiles < 1 ||
                    minFiles > 50) {
                    throw new BadRequestException('จำนวนไฟล์ที่ต้องแนบต้องเป็นจำนวนเต็มระหว่าง 1 ถึง 50');
                }
                const docType = this.readConfigString(raw, 'docType');
                return docType
                    ? { minFiles, docType }
                    : { minFiles };
            }
            case 'field': {
                const field = this.readConfigString(raw, 'field');
                if (!field) {
                    throw new BadRequestException('กรุณาเลือกฟิลด์ข้อมูลที่ต้องให้กรอก (note, details หรือ amount)');
                }
                if (!WORKFLOW_FIELD_KEYS.includes(field)) {
                    throw new BadRequestException(`ไม่รองรับฟิลด์ "${field}" (รองรับ ${WORKFLOW_FIELD_KEYS.join(', ')})`);
                }
                return { field };
            }
            case 'document': {
                const docType = this.readConfigString(raw, 'docType');
                if (!docType) {
                    throw new BadRequestException('กรุณาเลือกประเภทเอกสารที่ต้องมีก่อนย้ายขั้นตอน');
                }
                return { docType };
            }
            case 'payment':
                return {};
            default:
                throw new BadRequestException('ประเภทเงื่อนไขไม่ถูกต้อง');
        }
    }
    async resolveDocumentType(explicitId, config, options = {}) {
        if (explicitId !== undefined) {
            const found = await this.documentTypesRepository.findOne({
                where: { id: explicitId },
            });
            if (!found) {
                throw new BadRequestException('ไม่พบประเภทเอกสารที่ระบุ');
            }
            return found;
        }
        const docType = this.readConfigString(config, 'docType');
        if (!docType) {
            if (options.optional) {
                return null;
            }
            throw new BadRequestException('กรุณาเลือกประเภทเอกสารที่ต้องมีก่อนย้ายขั้นตอน');
        }
        const found = await this.documentTypesRepository.findOne({
            where: { documentType: docType },
        });
        if (!found) {
            if (options.optional) {
                return null;
            }
            throw new BadRequestException(`ไม่พบประเภทเอกสาร "${docType}" ในระบบ`);
        }
        return found;
    }
    resolveDocumentTypeLabel(rule) {
        const typeKey = rule.documentType?.documentType ??
            this.readConfigString(rule.conditionConfig, 'docType');
        if (!typeKey) {
            return null;
        }
        return DOC_TYPE_LABELS[typeKey] ?? typeKey;
    }
    async resolveEffectiveDocumentTypeId(rule) {
        if (rule.documentTypeId !== null) {
            return rule.documentTypeId;
        }
        const docType = this.readConfigString(rule.conditionConfig, 'docType');
        if (!docType) {
            return null;
        }
        const found = await this.documentTypesRepository.findOne({
            where: { documentType: docType },
        });
        return found?.id ?? null;
    }
    async resolveDocumentTypeIdByKind(kind) {
        const found = await this.documentTypesRepository.findOne({
            where: { documentType: kind },
        });
        return found?.id ?? null;
    }
    readMinFiles(config) {
        const value = Number(config.minFiles);
        if (!Number.isInteger(value) || value < 1) {
            return 1;
        }
        return value;
    }
    readConfigString(config, key, fallback = '') {
        const value = config?.[key];
        return typeof value === 'string'
            ? value
            : fallback;
    }
    async assertStagesAvailable(fromStageId, toStageId) {
        if (fromStageId === toStageId) {
            throw new BadRequestException('From Stage และ To Stage ต้องเป็นคนละขั้นตอน');
        }
        const stages = await this.stagesRepository.find({
            where: [{ id: fromStageId }, { id: toStageId }],
        });
        if (stages.length < 2) {
            throw new NotFoundException('ไม่พบขั้นตอนที่ระบุในท่อออเดอร์');
        }
    }
    async findOne(ruleId) {
        const rule = await this.rulesRepository.findOne({
            where: { id: ruleId },
        });
        if (!rule) {
            throw new NotFoundException('ไม่พบ Workflow Rule นี้');
        }
        return rule;
    }
    async loadView(ruleId) {
        const rule = await this.rulesRepository.findOne({
            where: { id: ruleId },
            relations: {
                fromStage: true,
                toStage: true,
                documentType: true,
            },
        });
        if (!rule) {
            throw new NotFoundException('ไม่พบ Workflow Rule นี้');
        }
        return this.toView(rule);
    }
    toView(rule) {
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
};
WorkflowRulesService = __decorate([
    Injectable(),
    __param(0, InjectRepository(WorkflowRule)),
    __param(1, InjectRepository(OrderPipeline)),
    __param(2, InjectRepository(IssueOrderAttachment)),
    __param(3, InjectRepository(DocumentType)),
    __param(4, InjectRepository(IssueOrder)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository,
        Repository,
        Repository])
], WorkflowRulesService);
export { WorkflowRulesService };
//# sourceMappingURL=workflow-rules.service.js.map