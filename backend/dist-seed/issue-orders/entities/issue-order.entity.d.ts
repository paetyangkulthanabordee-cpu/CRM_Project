import { Customer } from '../../customers/entities/customer.entity.js';
import { OrderPipeline } from '../../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../../users/entities/user.entity.js';
import type { IssueOrderDetail } from './issue-order-detail.entity.js';
import type { IssueOrderAttachment } from './issue-order-attachment.entity.js';
export declare class IssueOrder {
    id: number;
    customerId: number;
    customer?: Customer;
    orderPipelineId: number;
    orderPipeline?: OrderPipeline;
    userId: number | null;
    user?: User;
    details?: IssueOrderDetail[];
    attachments?: IssueOrderAttachment[];
    amount: number;
    discountPercent: number;
    vatPercent: number;
    note: string | null;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}
