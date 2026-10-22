import { ProductGroup } from './product-group.entity.js';
import { ProductUnit } from './product-unit.entity.js';
export declare class Product {
    id: number;
    name: string;
    skuCode: string | null;
    productGroupId: number;
    description: string | null;
    price: number;
    productUnitId: number;
    productGroup?: ProductGroup;
    productUnit?: ProductUnit;
}
