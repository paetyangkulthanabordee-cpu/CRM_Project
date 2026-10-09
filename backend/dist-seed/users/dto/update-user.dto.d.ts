import { UserRole } from '../entities/user.entity.js';
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
}
