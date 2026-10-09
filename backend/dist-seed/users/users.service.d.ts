import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';
export interface UserListItem {
    userId: number;
    name: string;
    email: string;
    role: User['role'];
    customerCount: number;
    createdAt: Date;
}
export declare class UsersService {
    private readonly usersRepository;
    private readonly customersRepository;
    constructor(usersRepository: Repository<User>, customersRepository: Repository<Customer>);
    findByEmail(email: string): Promise<User | null>;
    verifyPassword(plain: string, hash: string): Promise<boolean>;
    findAll(): Promise<UserListItem[]>;
    create(dto: CreateUserDto): Promise<{
        userId: number;
        name: string;
        email: string;
        role: import("./entities/user.entity.js").UserRole;
        customerCount: number;
        createdAt: Date;
    }>;
    update(userId: number, dto: UpdateUserDto, currentUserId: number): Promise<UserListItem>;
    remove(userId: number, currentUserId: number): Promise<{
        userId: number;
        deleted: boolean;
    }>;
    private findOne;
    private assertEmailAvailable;
    private customerCount;
    private references;
}
