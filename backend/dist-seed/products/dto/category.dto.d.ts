export declare class CreateCategoryDto {
    name: string;
    description?: string;
    productGroupId?: number;
}
export declare class UpdateCategoryDto {
    name?: string;
    description?: string | null;
    productGroupId?: number | null;
}
