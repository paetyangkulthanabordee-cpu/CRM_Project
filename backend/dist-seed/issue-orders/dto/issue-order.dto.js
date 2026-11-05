var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested, } from 'class-validator';
export class IssueOrderDetailDto {
    productId;
    quantity;
    unitPrice;
}
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], IssueOrderDetailDto.prototype, "productId", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], IssueOrderDetailDto.prototype, "quantity", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], IssueOrderDetailDto.prototype, "unitPrice", void 0);
export class CreateIssueOrderDto {
    customerId;
    orderPipelineId;
    discountPercent;
    vatPercent;
    note;
    userId;
    details;
}
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateIssueOrderDto.prototype, "customerId", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateIssueOrderDto.prototype, "orderPipelineId", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateIssueOrderDto.prototype, "discountPercent", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateIssueOrderDto.prototype, "vatPercent", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(2000),
    __metadata("design:type", String)
], CreateIssueOrderDto.prototype, "note", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], CreateIssueOrderDto.prototype, "userId", void 0);
__decorate([
    IsArray(),
    ArrayNotEmpty(),
    ValidateNested({ each: true }),
    Type(() => IssueOrderDetailDto),
    __metadata("design:type", Array)
], CreateIssueOrderDto.prototype, "details", void 0);
export class UpdateIssueOrderDto {
    customerId;
    orderPipelineId;
    discountPercent;
    vatPercent;
    note;
    userId;
    details;
    isArchived;
}
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateIssueOrderDto.prototype, "customerId", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateIssueOrderDto.prototype, "orderPipelineId", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], UpdateIssueOrderDto.prototype, "discountPercent", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], UpdateIssueOrderDto.prototype, "vatPercent", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(2000),
    __metadata("design:type", String)
], UpdateIssueOrderDto.prototype, "note", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], UpdateIssueOrderDto.prototype, "userId", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => IssueOrderDetailDto),
    __metadata("design:type", Array)
], UpdateIssueOrderDto.prototype, "details", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateIssueOrderDto.prototype, "isArchived", void 0);
export class MoveIssueOrderStageDto {
    orderPipelineId;
}
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], MoveIssueOrderStageDto.prototype, "orderPipelineId", void 0);
//# sourceMappingURL=issue-order.dto.js.map