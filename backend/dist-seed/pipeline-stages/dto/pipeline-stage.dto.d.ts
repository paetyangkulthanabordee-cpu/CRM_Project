export declare class CreatePipelineStageDto {
    stageKey: string;
    label: string;
    color?: string;
}
export declare class UpdatePipelineStageDto {
    stageKey?: string;
    label?: string;
    color?: string;
}
export declare class ReorderStagesDto {
    stageIds: number[];
}
