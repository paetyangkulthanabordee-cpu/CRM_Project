var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { IssueOrder } from './issue-order.entity.js';
import { DocumentType } from '../../documents/entities/document-type.entity.js';
import { User } from '../../users/entities/user.entity.js';
let IssueOrderAttachment = class IssueOrderAttachment {
    id;
    issueOrderId;
    issueOrder;
    originalName;
    storedName;
    mimeType;
    sizeBytes;
    uploadedBy;
    uploader;
    documentTypeId;
    documentType;
    createdAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], IssueOrderAttachment.prototype, "id", void 0);
__decorate([
    Column({
        name: 'issue_order_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrderAttachment.prototype, "issueOrderId", void 0);
__decorate([
    ManyToOne(() => IssueOrder, (order) => order.attachments, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'issue_order_id' }),
    __metadata("design:type", IssueOrder)
], IssueOrderAttachment.prototype, "issueOrder", void 0);
__decorate([
    Column({
        name: 'original_name',
        type: 'varchar',
        length: 255,
    }),
    __metadata("design:type", String)
], IssueOrderAttachment.prototype, "originalName", void 0);
__decorate([
    Column({
        name: 'stored_name',
        type: 'varchar',
        length: 255,
        unique: true,
    }),
    __metadata("design:type", String)
], IssueOrderAttachment.prototype, "storedName", void 0);
__decorate([
    Column({
        name: 'mime_type',
        type: 'varchar',
        length: 100,
    }),
    __metadata("design:type", String)
], IssueOrderAttachment.prototype, "mimeType", void 0);
__decorate([
    Column({
        name: 'size_bytes',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrderAttachment.prototype, "sizeBytes", void 0);
__decorate([
    Column({
        name: 'uploaded_by',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IssueOrderAttachment.prototype, "uploadedBy", void 0);
__decorate([
    ManyToOne(() => User),
    JoinColumn({ name: 'uploaded_by' }),
    __metadata("design:type", User)
], IssueOrderAttachment.prototype, "uploader", void 0);
__decorate([
    Column({
        name: 'document_type_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IssueOrderAttachment.prototype, "documentTypeId", void 0);
__decorate([
    ManyToOne(() => DocumentType),
    JoinColumn({ name: 'document_type_id' }),
    __metadata("design:type", DocumentType)
], IssueOrderAttachment.prototype, "documentType", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], IssueOrderAttachment.prototype, "createdAt", void 0);
IssueOrderAttachment = __decorate([
    Entity('issue_order_attachment')
], IssueOrderAttachment);
export { IssueOrderAttachment };
//# sourceMappingURL=issue-order-attachment.entity.js.map