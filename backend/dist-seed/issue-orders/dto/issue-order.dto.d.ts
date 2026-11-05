export declare class IssueOrderDetailDto {
    productId: number;
    quantity?: number;
    unitPrice?: number;
}
export declare class CreateIssueOrderDto {
    customerId: number;
    orderPipelineId: number;
    discountPercent?: number;
    vatPercent?: number;
    note?: string;
    userId?: number;
    details: IssueOrderDetailDto[];
}
export declare class UpdateIssueOrderDto {
    customerId?: number;
    orderPipelineId?: number;
    discountPercent?: number;
    vatPercent?: number;
    note?: string;
    userId?: number;
    details?: IssueOrderDetailDto[];
    isArchived?: boolean;
}
export declare class MoveIssueOrderStageDto {
    orderPipelineId: number;
}
