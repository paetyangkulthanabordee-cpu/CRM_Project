var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ArrayNotEmpty, IsArray, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, } from 'class-validator';
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
export class CreateOrderPipelineDto {
    stageKey;
    label;
    color;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(50),
    Matches(KEY_PATTERN, {
        message: 'stage key ต้องเป็นตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
    }),
    __metadata("design:type", String)
], CreateOrderPipelineDto.prototype, "stageKey", void 0);
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateOrderPipelineDto.prototype, "label", void 0);
__decorate([
    IsOptional(),
    IsHexColor(),
    __metadata("design:type", String)
], CreateOrderPipelineDto.prototype, "color", void 0);
export class UpdateOrderPipelineDto {
    stageKey;
    label;
    color;
}
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(50),
    Matches(KEY_PATTERN, {
        message: 'stage key ต้องเป็นตัวอักษรอังกฤษ ตัวเลข และ _ เท่านั้น (ขึ้นต้นด้วยตัวอักษร)',
    }),
    __metadata("design:type", String)
], UpdateOrderPipelineDto.prototype, "stageKey", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsNotEmpty(),
    MaxLength(100),
    __metadata("design:type", String)
], UpdateOrderPipelineDto.prototype, "label", void 0);
__decorate([
    IsOptional(),
    IsHexColor(),
    __metadata("design:type", String)
], UpdateOrderPipelineDto.prototype, "color", void 0);
export class ReorderOrderPipelineDto {
    stageIds;
}
__decorate([
    IsArray(),
    ArrayNotEmpty(),
    IsInt({ each: true }),
    __metadata("design:type", Array)
], ReorderOrderPipelineDto.prototype, "stageIds", void 0);
//# sourceMappingURL=order-pipeline.dto.js.map