var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, } from 'class-validator';
import { WORKFLOW_CONDITION_TYPES, } from '../condition-types.js';
export class CreateWorkflowRuleDto {
    ruleName;
    fromStageId;
    toStageId;
    conditionType;
    conditionConfig;
    documentTypeId;
    isRequired;
    isActive;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(150),
    __metadata("design:type", String)
], CreateWorkflowRuleDto.prototype, "ruleName", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateWorkflowRuleDto.prototype, "fromStageId", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateWorkflowRuleDto.prototype, "toStageId", void 0);
__decorate([
    IsIn(WORKFLOW_CONDITION_TYPES, {
        message: 'conditionType ต้องเป็น attachment, field, document หรือ payment เท่านั้น',
    }),
    __metadata("design:type", Object)
], CreateWorkflowRuleDto.prototype, "conditionType", void 0);
__decorate([
    IsOptional(),
    IsObject(),
    __metadata("design:type", Object)
], CreateWorkflowRuleDto.prototype, "conditionConfig", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], CreateWorkflowRuleDto.prototype, "documentTypeId", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateWorkflowRuleDto.prototype, "isRequired", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateWorkflowRuleDto.prototype, "isActive", void 0);
export class UpdateWorkflowRuleDto {
    ruleName;
    fromStageId;
    toStageId;
    conditionType;
    conditionConfig;
    documentTypeId;
    isRequired;
    isActive;
}
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(150),
    __metadata("design:type", String)
], UpdateWorkflowRuleDto.prototype, "ruleName", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateWorkflowRuleDto.prototype, "fromStageId", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateWorkflowRuleDto.prototype, "toStageId", void 0);
__decorate([
    IsOptional(),
    IsIn(WORKFLOW_CONDITION_TYPES, {
        message: 'conditionType ต้องเป็น attachment, field, document หรือ payment เท่านั้น',
    }),
    __metadata("design:type", Object)
], UpdateWorkflowRuleDto.prototype, "conditionType", void 0);
__decorate([
    IsOptional(),
    IsObject(),
    __metadata("design:type", Object)
], UpdateWorkflowRuleDto.prototype, "conditionConfig", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateWorkflowRuleDto.prototype, "documentTypeId", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateWorkflowRuleDto.prototype, "isRequired", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateWorkflowRuleDto.prototype, "isActive", void 0);
//# sourceMappingURL=workflow-rule.dto.js.map