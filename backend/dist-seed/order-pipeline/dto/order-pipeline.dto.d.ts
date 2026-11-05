export declare class CreateOrderPipelineDto {
    stageKey: string;
    label: string;
    color?: string;
}
export declare class UpdateOrderPipelineDto {
    stageKey?: string;
    label?: string;
    color?: string;
}
export declare class ReorderOrderPipelineDto {
    stageIds: number[];
}
