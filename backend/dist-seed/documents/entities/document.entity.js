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
const amountTransformer = {
    to: (value) => value,
    from: (value) => Number(value),
};
let DocumentRecord = class DocumentRecord {
    docId;
    docType;
    docNo;
    customerId;
    issueDate;
    dueDate;
    refDocId;
    refDocNo;
    amount;
    status;
    note;
    createdBy;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn({ name: 'doc_id' }),
    __metadata("design:type", Number)
], DocumentRecord.prototype, "docId", void 0);
__decorate([
    Column({ name: 'doc_type', length: 20 }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "docType", void 0);
__decorate([
    Column({ name: 'doc_no', length: 30 }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "docNo", void 0);
__decorate([
    Column({ name: 'customer_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "customerId", void 0);
__decorate([
    Column({ name: 'issue_date', type: 'date' }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "issueDate", void 0);
__decorate([
    Column({ name: 'due_date', type: 'date', nullable: true }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "dueDate", void 0);
__decorate([
    Column({ name: 'ref_doc_id', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "refDocId", void 0);
__decorate([
    Column({
        name: 'ref_doc_no',
        type: 'varchar',
        length: 30,
        nullable: true,
    }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "refDocNo", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 12,
        scale: 2,
        default: 0,
        transformer: amountTransformer,
    }),
    __metadata("design:type", Number)
], DocumentRecord.prototype, "amount", void 0);
__decorate([
    Column({ length: 20 }),
    __metadata("design:type", String)
], DocumentRecord.prototype, "status", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "note", void 0);
__decorate([
    Column({ name: 'created_by', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], DocumentRecord.prototype, "createdBy", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], DocumentRecord.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], DocumentRecord.prototype, "updatedAt", void 0);
DocumentRecord = __decorate([
    Entity('documents')
], DocumentRecord);
export { DocumentRecord };
//# sourceMappingURL=document.entity.js.map