var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';
let WorkflowRule = class WorkflowRule {
    id;
    ruleName;
    fromStageId;
    fromStage;
    toStageId;
    toStage;
    conditionType;
    conditionConfig;
    documentTypeId;
    documentType;
    isRequired;
    isActive;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], WorkflowRule.prototype, "id", void 0);
__decorate([
    Column({
        name: 'rule_name',
        type: 'varchar',
        length: 150,
    }),
    __metadata("design:type", String)
], WorkflowRule.prototype, "ruleName", void 0);
__decorate([
    Column({
        name: 'from_stage_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], WorkflowRule.prototype, "fromStageId", void 0);
__decorate([
    ManyToOne(() => OrderPipeline, { nullable: true }),
    JoinColumn({ name: 'from_stage_id' }),
    __metadata("design:type", OrderPipeline)
], WorkflowRule.prototype, "fromStage", void 0);
__decorate([
    Column({
        name: 'to_stage_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], WorkflowRule.prototype, "toStageId", void 0);
__decorate([
    ManyToOne(() => OrderPipeline, { nullable: true }),
    JoinColumn({ name: 'to_stage_id' }),
    __metadata("design:type", OrderPipeline)
], WorkflowRule.prototype, "toStage", void 0);
__decorate([
    Column({
        name: 'condition_type',
        type: 'varchar',
        length: 30,
    }),
    __metadata("design:type", String)
], WorkflowRule.prototype, "conditionType", void 0);
__decorate([
    Column({
        name: 'condition_config',
        type: 'jsonb',
        default: {},
    }),
    __metadata("design:type", Object)
], WorkflowRule.prototype, "conditionConfig", void 0);
__decorate([
    Column({
        name: 'document_type_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], WorkflowRule.prototype, "documentTypeId", void 0);
__decorate([
    ManyToOne(() => DocumentType),
    JoinColumn({ name: 'document_type_id' }),
    __metadata("design:type", DocumentType)
], WorkflowRule.prototype, "documentType", void 0);
__decorate([
    Column({
        name: 'is_required',
        type: 'boolean',
        default: true,
    }),
    __metadata("design:type", Boolean)
], WorkflowRule.prototype, "isRequired", void 0);
__decorate([
    Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    }),
    __metadata("design:type", Boolean)
], WorkflowRule.prototype, "isActive", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], WorkflowRule.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], WorkflowRule.prototype, "updatedAt", void 0);
WorkflowRule = __decorate([
    Entity('workflow_rules')
], WorkflowRule);
export { WorkflowRule };
//# sourceMappingURL=workflow-rule.entity.js.map