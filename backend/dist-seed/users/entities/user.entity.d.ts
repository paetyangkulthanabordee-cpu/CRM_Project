export declare enum UserRole {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    SALES = "SALES"
}
export declare class User {
    userId: number;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
