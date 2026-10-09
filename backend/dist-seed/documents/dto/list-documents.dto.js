var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsIn, IsInt, IsOptional, IsString, Matches, } from 'class-validator';
import { DOC_TYPES } from '../document-types.js';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export class ListDocumentsDto {
    type;
    status;
    search;
    customerId;
    from;
    to;
}
__decorate([
    IsOptional(),
    IsIn(DOC_TYPES),
    __metadata("design:type", String)
], ListDocumentsDto.prototype, "type", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListDocumentsDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListDocumentsDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], ListDocumentsDto.prototype, "customerId", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
    }),
    __metadata("design:type", String)
], ListDocumentsDto.prototype, "from", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
    }),
    __metadata("design:type", String)
], ListDocumentsDto.prototype, "to", void 0);
//# sourceMappingURL=list-documents.dto.js.map