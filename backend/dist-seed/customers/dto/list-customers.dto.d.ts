export declare class ListCustomersDto {
    status?: string[];
    search?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    assignedId?: number[];
    unassigned?: boolean;
    onlyInactive?: boolean;
}
