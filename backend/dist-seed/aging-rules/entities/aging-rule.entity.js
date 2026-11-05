var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
let AgingRule = class AgingRule {
    id;
    ruleName;
    warningAfterDays;
    criticalAfterDays;
    isActive;
    boardType;
    stageKey;
    actionType;
    archiveAfterDays;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], AgingRule.prototype, "id", void 0);
__decorate([
    Column({
        name: 'rule_name',
        type: 'varchar',
        length: 150,
    }),
    __metadata("design:type", String)
], AgingRule.prototype, "ruleName", void 0);
__decorate([
    Column({
        name: 'warning_after_days',
        type: 'int',
        default: 3,
    }),
    __metadata("design:type", Number)
], AgingRule.prototype, "warningAfterDays", void 0);
__decorate([
    Column({
        name: 'critical_after_days',
        type: 'int',
        default: 7,
    }),
    __metadata("design:type", Number)
], AgingRule.prototype, "criticalAfterDays", void 0);
__decorate([
    Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    }),
    __metadata("design:type", Boolean)
], AgingRule.prototype, "isActive", void 0);
__decorate([
    Column({
        name: 'board_type',
        type: 'varchar',
        length: 20,
        default: 'order_pipeline',
    }),
    __metadata("design:type", String)
], AgingRule.prototype, "boardType", void 0);
__decorate([
    Column({
        name: 'stage_key',
        type: 'varchar',
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", Object)
], AgingRule.prototype, "stageKey", void 0);
__decorate([
    Column({
        name: 'action_type',
        type: 'varchar',
        length: 20,
        default: 'none',
    }),
    __metadata("design:type", String)
], AgingRule.prototype, "actionType", void 0);
__decorate([
    Column({
        name: 'archive_after_days',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], AgingRule.prototype, "archiveAfterDays", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], AgingRule.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], AgingRule.prototype, "updatedAt", void 0);
AgingRule = __decorate([
    Entity('aging_rules')
], AgingRule);
export { AgingRule };
//# sourceMappingURL=aging-rule.entity.js.map