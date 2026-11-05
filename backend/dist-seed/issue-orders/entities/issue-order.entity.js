var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity.js';
import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../../users/entities/user.entity.js';
const amountTransformer = {
    to: (value) => value,
    from: (value) => Number(value),
};
let IssueOrder = class IssueOrder {
    id;
    customerId;
    customer;
    orderPipelineId;
    orderPipeline;
    userId;
    user;
    details;
    attachments;
    amount;
    discountPercent;
    vatPercent;
    note;
    isArchived;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], IssueOrder.prototype, "id", void 0);
__decorate([
    Column({
        name: 'customer_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrder.prototype, "customerId", void 0);
__decorate([
    ManyToOne(() => Customer),
    JoinColumn({
        name: 'customer_id',
    }),
    __metadata("design:type", Customer)
], IssueOrder.prototype, "customer", void 0);
__decorate([
    Column({
        name: 'order_pipeline_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrder.prototype, "orderPipelineId", void 0);
__decorate([
    ManyToOne(() => OrderPipeline),
    JoinColumn({
        name: 'order_pipeline_id',
    }),
    __metadata("design:type", OrderPipeline)
], IssueOrder.prototype, "orderPipeline", void 0);
__decorate([
    Column({
        name: 'user_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IssueOrder.prototype, "userId", void 0);
__decorate([
    ManyToOne(() => User),
    JoinColumn({
        name: 'user_id',
    }),
    __metadata("design:type", User)
], IssueOrder.prototype, "user", void 0);
__decorate([
    OneToMany('IssueOrderDetail', 'issueOrder'),
    __metadata("design:type", Array)
], IssueOrder.prototype, "details", void 0);
__decorate([
    OneToMany('IssueOrderAttachment', 'issueOrder'),
    __metadata("design:type", Array)
], IssueOrder.prototype, "attachments", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 15,
        scale: 2,
        default: 0,
        transformer: amountTransformer,
    }),
    __metadata("design:type", Number)
], IssueOrder.prototype, "amount", void 0);
__decorate([
    Column({
        name: 'discount_percent',
        type: 'numeric',
        precision: 5,
        scale: 2,
        default: 0,
        transformer: amountTransformer,
    }),
    __metadata("design:type", Number)
], IssueOrder.prototype, "discountPercent", void 0);
__decorate([
    Column({
        name: 'vat_percent',
        type: 'numeric',
        precision: 5,
        scale: 2,
        default: 7,
        transformer: amountTransformer,
    }),
    __metadata("design:type", Number)
], IssueOrder.prototype, "vatPercent", void 0);
__decorate([
    Column({
        type: 'text',
        nullable: true,
    }),
    __metadata("design:type", Object)
], IssueOrder.prototype, "note", void 0);
__decorate([
    Column({
        name: 'is_archived',
        type: 'boolean',
        default: false,
    }),
    __metadata("design:type", Boolean)
], IssueOrder.prototype, "isArchived", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], IssueOrder.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], IssueOrder.prototype, "updatedAt", void 0);
IssueOrder = __decorate([
    Entity('issue_order')
], IssueOrder);
export { IssueOrder };
//# sourceMappingURL=issue-order.entity.js.map