import { ProductGroup } from './product-group.entity.js';
export declare class Category {
    id: number;
    name: string;
    description: string | null;
    productGroupId: number | null;
    productGroup?: ProductGroup | null;
}
