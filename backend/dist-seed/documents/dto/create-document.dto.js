var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Min, } from 'class-validator';
import { ALL_DOCUMENT_STATUSES, DOC_TYPES, } from '../document-types.js';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export class CreateDocumentDto {
    docType;
    customerId;
    issueDate;
    dueDate;
    amount;
    status;
    note;
    refDocId;
}
__decorate([
    IsIn(DOC_TYPES),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "docType", void 0);
__decorate([
    IsInt(),
    __metadata("design:type", Number)
], CreateDocumentDto.prototype, "customerId", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
    }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "issueDate", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)',
    }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "dueDate", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CreateDocumentDto.prototype, "amount", void 0);
__decorate([
    IsOptional(),
    IsIn(ALL_DOCUMENT_STATUSES),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "note", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], CreateDocumentDto.prototype, "refDocId", void 0);
//# sourceMappingURL=create-document.dto.js.map