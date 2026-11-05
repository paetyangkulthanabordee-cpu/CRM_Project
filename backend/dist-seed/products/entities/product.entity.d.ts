import { Category } from './category.entity.js';
import { ProductUnit } from './product-unit.entity.js';
export declare class Product {
    id: number;
    name: string;
    skuCode: string | null;
    categoryId: number;
    category?: Category;
    description: string | null;
    price: number;
    productUnitId: number;
    productUnit?: ProductUnit;
}
