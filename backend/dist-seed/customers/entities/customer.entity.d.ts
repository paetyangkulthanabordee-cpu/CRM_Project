import { User } from '../../users/entities/user.entity.js';
export declare class Customer {
    customerId: number;
    companyName: string;
    email: string;
    phone: string;
    status: string;
    isActive: boolean;
    assignedId: number | null;
    assignedUser?: User | null;
    purchaseCount: number;
    createdAt: Date;
    updatedAt: Date;
}
