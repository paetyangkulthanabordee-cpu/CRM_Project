import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';
import type { UserListItem } from './users.service.js';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<UserListItem[]>;
    create(dto: CreateUserDto): Promise<UserListItem>;
    update(id: number, dto: UpdateUserDto, user: AuthUser): Promise<UserListItem>;
    remove(id: number, user: AuthUser): Promise<{
        userId: number;
        deleted: boolean;
    }>;
}
