import { UserRole } from '../entities/user.entity.js';
export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}
