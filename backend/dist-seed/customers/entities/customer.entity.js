var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
let Customer = class Customer {
    customerId;
    companyName;
    email;
    phone;
    status;
    isActive;
    assignedId;
    assignedUser;
    purchaseCount;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn({
        name: 'customer_id',
    }),
    __metadata("design:type", Number)
], Customer.prototype, "customerId", void 0);
__decorate([
    Column({
        name: 'company_name',
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "companyName", void 0);
__decorate([
    Column({
        length: 255,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    Column({
        length: 50,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "phone", void 0);
__decorate([
    Column({
        length: 50,
        default: 'new',
    }),
    __metadata("design:type", String)
], Customer.prototype, "status", void 0);
__decorate([
    Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
    }),
    __metadata("design:type", Boolean)
], Customer.prototype, "isActive", void 0);
__decorate([
    Column({
        name: 'assigned_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Customer.prototype, "assignedId", void 0);
__decorate([
    ManyToOne(() => User, {
        nullable: true,
    }),
    JoinColumn({
        name: 'assigned_id',
    }),
    __metadata("design:type", Object)
], Customer.prototype, "assignedUser", void 0);
__decorate([
    Column({
        name: 'purchase_count',
        type: 'int',
        default: 0,
    }),
    __metadata("design:type", Number)
], Customer.prototype, "purchaseCount", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
Customer = __decorate([
    Entity('customers')
], Customer);
export { Customer };
//# sourceMappingURL=customer.entity.js.map