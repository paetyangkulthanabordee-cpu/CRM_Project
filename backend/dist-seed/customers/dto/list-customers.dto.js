var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, } from 'class-validator';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const DATE_ERROR_MESSAGE = 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD หรือ ISO datetime)';
function toText(value) {
    if (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean') {
        return String(value);
    }
    return '';
}
function toStringList(value) {
    const parts = Array.isArray(value)
        ? value
        : [value];
    return parts
        .flatMap((item) => toText(item).split(','))
        .map((item) => item.trim())
        .filter((item) => item !== '');
}
function toNumberList(value) {
    const numbers = toStringList(value)
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item));
    return numbers.length > 0 ? numbers : undefined;
}
export class ListCustomersDto {
    status;
    search;
    page;
    limit;
    dateFrom;
    dateTo;
    assignedId;
    unassigned;
    onlyInactive;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => value === undefined || value === null
        ? undefined
        : toStringList(value)),
    IsArray(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], ListCustomersDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListCustomersDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], ListCustomersDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], ListCustomersDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: DATE_ERROR_MESSAGE,
    }),
    __metadata("design:type", String)
], ListCustomersDto.prototype, "dateFrom", void 0);
__decorate([
    IsOptional(),
    Matches(DATE_PATTERN, {
        message: DATE_ERROR_MESSAGE,
    }),
    __metadata("design:type", String)
], ListCustomersDto.prototype, "dateTo", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => toNumberList(value)),
    IsArray(),
    IsInt({ each: true }),
    __metadata("design:type", Array)
], ListCustomersDto.prototype, "assignedId", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], ListCustomersDto.prototype, "unassigned", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], ListCustomersDto.prototype, "onlyInactive", void 0);
//# sourceMappingURL=list-customers.dto.js.map