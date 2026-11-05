var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';
import { IssueOrder } from './issue-order.entity.js';
const numericTransformer = {
    to: (value) => value,
    from: (value) => Number(value),
};
let IssueOrderDetail = class IssueOrderDetail {
    id;
    productId;
    product;
    issueOrderId;
    quantity;
    unitPrice;
    issueOrder;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], IssueOrderDetail.prototype, "id", void 0);
__decorate([
    Column({
        name: 'product_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrderDetail.prototype, "productId", void 0);
__decorate([
    ManyToOne(() => Product),
    JoinColumn({
        name: 'product_id',
    }),
    __metadata("design:type", Product)
], IssueOrderDetail.prototype, "product", void 0);
__decorate([
    Column({
        name: 'issue_order_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], IssueOrderDetail.prototype, "issueOrderId", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 15,
        scale: 3,
        default: 1,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], IssueOrderDetail.prototype, "quantity", void 0);
__decorate([
    Column({
        name: 'unit_price',
        type: 'numeric',
        precision: 15,
        scale: 2,
        default: 0,
        transformer: numericTransformer,
    }),
    __metadata("design:type", Number)
], IssueOrderDetail.prototype, "unitPrice", void 0);
__decorate([
    ManyToOne(() => IssueOrder, {
        onDelete: 'CASCADE',
    }),
    JoinColumn({
        name: 'issue_order_id',
    }),
    __metadata("design:type", IssueOrder)
], IssueOrderDetail.prototype, "issueOrder", void 0);
IssueOrderDetail = __decorate([
    Entity('issue_order_detail')
], IssueOrderDetail);
export { IssueOrderDetail };
//# sourceMappingURL=issue-order-detail.entity.js.map