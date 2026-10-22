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
import { ProductUnit } from './product-unit.entity.js';
const priceTransformer = {
    to: (value) => value,
    from: (value) => Number(value),
};
let Product = class Product {
    id;
    name;
    skuCode;
    productGroupId;
    description;
    price;
    productUnitId;
    productGroup;
    productUnit;
};
__decorate([
    PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], Product.prototype, "id", void 0);
__decorate([
    Column({
        length: 255,
    }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    Column({
        name: 'sku_code',
        type: 'varchar',
        length: 100,
        nullable: true,
        unique: true,
    }),
    __metadata("design:type", Object)
], Product.prototype, "skuCode", void 0);
__decorate([
    Column({
        name: 'product_group_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], Product.prototype, "productGroupId", void 0);
__decorate([
    Column({
        type: 'text',
        nullable: true,
    }),
    __metadata("design:type", Object)
], Product.prototype, "description", void 0);
__decorate([
    Column({
        type: 'numeric',
        precision: 15,
        scale: 2,
        default: 0,
        transformer: priceTransformer,
    }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    Column({
        name: 'product_unit_id',
        type: 'int',
    }),
    __metadata("design:type", Number)
], Product.prototype, "productUnitId", void 0);
__decorate([
    ManyToOne(() => ProductGroup),
    JoinColumn({
        name: 'product_group_id',
    }),
    __metadata("design:type", ProductGroup)
], Product.prototype, "productGroup", void 0);
__decorate([
    ManyToOne(() => ProductUnit),
    JoinColumn({
        name: 'product_unit_id',
    }),
    __metadata("design:type", ProductUnit)
], Product.prototype, "productUnit", void 0);
Product = __decorate([
    Entity('product')
], Product);
export { Product };
//# sourceMappingURL=product.entity.js.map