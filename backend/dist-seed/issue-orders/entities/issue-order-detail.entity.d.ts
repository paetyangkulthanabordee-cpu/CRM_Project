import { Product } from '../../products/entities/product.entity.js';
import { IssueOrder } from './issue-order.entity.js';
export declare class IssueOrderDetail {
    id: number;
    productId: number;
    product?: Product;
    issueOrderId: number;
    quantity: number;
    unitPrice: number;
    issueOrder?: IssueOrder;
}
