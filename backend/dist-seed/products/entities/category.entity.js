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
import { ProductGroup } from './product-group.entity.js';
let Category = class Category {
    id;
    name;
    description;
    productGroupId;
    productGroup;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Category.prototype, "id", void 0);
__decorate([
    Column({
        length: 255,
    }),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    Column({
        type: 'text',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Category.prototype, "description", void 0);
__decorate([
    Column({
        name: 'product_group_id',
        type: 'int',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Category.prototype, "productGroupId", void 0);
__decorate([
    ManyToOne(() => ProductGroup),
    JoinColumn({
        name: 'product_group_id',
    }),
    __metadata("design:type", Object)
], Category.prototype, "productGroup", void 0);
Category = __decorate([
    Entity('category')
], Category);
export { Category };
//# sourceMappingURL=category.entity.js.map