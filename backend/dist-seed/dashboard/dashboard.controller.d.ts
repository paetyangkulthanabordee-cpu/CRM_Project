import { DashboardService } from './dashboard.service.js';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getSummary(): Promise<{
        kpis: {
            totalCustomers: number;
            newCustomers: number;
            activeCustomers: number;
            dealCustomers: number;
            conversionRate: number;
        };
        statuses: {
            status: string;
            count: number;
        }[];
        stages: {
            stage: string;
            status: string;
            count: number;
        }[];
        recentCustomers: import("../customers/entities/customer.entity.js").Customer[];
    }>;
}
