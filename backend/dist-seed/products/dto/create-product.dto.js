var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, } from 'class-validator';
export class CreateProductDto {
    name;
    skuCode;
    productGroupId;
    description;
    price;
    productUnitId;
}
__decorate([
    IsString(),
    IsNotEmpty(),
    MaxLength(255),
    __metadata("design:type", String)
], CreateProductDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateProductDto.prototype, "skuCode", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "productGroupId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateProductDto.prototype, "description", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "price", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateProductDto.prototype, "productUnitId", void 0);
//# sourceMappingURL=create-product.dto.js.map