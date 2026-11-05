var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, } from 'class-validator';
export const AGING_BOARDS = ['order_pipeline', 'customers'];
export const AGING_ACTIONS = [
    'none',
    'auto_archive',
    'edit_lock',
];
export class CreateAgingRuleDto {
    ruleName;
    warningAfterDays;
    criticalAfterDays;
    isActive;
    boardType;
    stageKey;
    actionType;
    archiveAfterDays;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(150),
    __metadata("design:type", String)
], CreateAgingRuleDto.prototype, "ruleName", void 0);
__decorate([
    IsInt(),
    Min(1, {
        message: 'Warning after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(365, {
        message: 'Warning after ต้องไม่เกิน 365 วัน',
    }),
    __metadata("design:type", Number)
], CreateAgingRuleDto.prototype, "warningAfterDays", void 0);
__decorate([
    IsInt(),
    Min(1, {
        message: 'Critical after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(730, {
        message: 'Critical after ต้องไม่เกิน 730 วัน',
    }),
    __metadata("design:type", Number)
], CreateAgingRuleDto.prototype, "criticalAfterDays", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateAgingRuleDto.prototype, "isActive", void 0);
__decorate([
    IsOptional(),
    IsIn(AGING_BOARDS, {
        message: 'boardType ต้องเป็น order_pipeline หรือ customers',
    }),
    __metadata("design:type", String)
], CreateAgingRuleDto.prototype, "boardType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(50),
    __metadata("design:type", Object)
], CreateAgingRuleDto.prototype, "stageKey", void 0);
__decorate([
    IsOptional(),
    IsIn(AGING_ACTIONS, {
        message: 'actionType ต้องเป็น none, auto_archive หรือ edit_lock',
    }),
    __metadata("design:type", String)
], CreateAgingRuleDto.prototype, "actionType", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1, {
        message: 'จำนวนวันของ auto-archive ต้องตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(365, {
        message: 'จำนวนวันของ auto-archive ต้องไม่เกิน 365 วัน',
    }),
    __metadata("design:type", Number)
], CreateAgingRuleDto.prototype, "archiveAfterDays", void 0);
export class UpdateAgingRuleDto {
    ruleName;
    warningAfterDays;
    criticalAfterDays;
    isActive;
    boardType;
    stageKey;
    actionType;
    archiveAfterDays;
}
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(150),
    __metadata("design:type", String)
], UpdateAgingRuleDto.prototype, "ruleName", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1, {
        message: 'Warning after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(365, {
        message: 'Warning after ต้องไม่เกิน 365 วัน',
    }),
    __metadata("design:type", Number)
], UpdateAgingRuleDto.prototype, "warningAfterDays", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1, {
        message: 'Critical after ต้องเป็นจำนวนเต็มตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(730, {
        message: 'Critical after ต้องไม่เกิน 730 วัน',
    }),
    __metadata("design:type", Number)
], UpdateAgingRuleDto.prototype, "criticalAfterDays", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateAgingRuleDto.prototype, "isActive", void 0);
__decorate([
    IsOptional(),
    IsIn(AGING_BOARDS, {
        message: 'boardType ต้องเป็น order_pipeline หรือ customers',
    }),
    __metadata("design:type", String)
], UpdateAgingRuleDto.prototype, "boardType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(50),
    __metadata("design:type", Object)
], UpdateAgingRuleDto.prototype, "stageKey", void 0);
__decorate([
    IsOptional(),
    IsIn(AGING_ACTIONS, {
        message: 'actionType ต้องเป็น none, auto_archive หรือ edit_lock',
    }),
    __metadata("design:type", String)
], UpdateAgingRuleDto.prototype, "actionType", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1, {
        message: 'จำนวนวันของ auto-archive ต้องตั้งแต่ 1 วันขึ้นไป',
    }),
    Max(365, {
        message: 'จำนวนวันของ auto-archive ต้องไม่เกิน 365 วัน',
    }),
    __metadata("design:type", Number)
], UpdateAgingRuleDto.prototype, "archiveAfterDays", void 0);
//# sourceMappingURL=aging-rule.dto.js.map