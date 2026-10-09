var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity.js';
import { User } from './entities/user.entity.js';
const PASSWORD_SALT_ROUNDS = 10;
let UsersService = class UsersService {
    usersRepository;
    customersRepository;
    constructor(usersRepository, customersRepository) {
        this.usersRepository = usersRepository;
        this.customersRepository = customersRepository;
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({
            where: { email },
        });
    }
    async verifyPassword(plain, hash) {
        return bcrypt.compare(plain, hash);
    }
    async findAll() {
        const users = await this.usersRepository.find({
            order: { userId: 'ASC' },
        });
        const rows = await this.customersRepository.manager.query(`SELECT assigned_id AS "assignedId",
                COUNT(*)::int AS count
         FROM customers
         WHERE assigned_id IS NOT NULL
         GROUP BY assigned_id`);
        const customerCounts = new Map(rows.map((row) => [
            row.assignedId,
            Number(row.count),
        ]));
        return users.map((user) => ({
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            customerCount: customerCounts.get(user.userId) ?? 0,
            createdAt: user.createdAt,
        }));
    }
    async create(dto) {
        await this.assertEmailAvailable(dto.email);
        const password = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
        const user = await this.usersRepository.save(this.usersRepository.create({
            name: dto.name,
            email: dto.email,
            password,
            role: dto.role,
        }));
        return {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            customerCount: 0,
            createdAt: user.createdAt,
        };
    }
    async update(userId, dto, currentUserId) {
        const user = await this.findOne(userId);
        if (dto.role !== undefined &&
            dto.role !== user.role &&
            userId === currentUserId) {
            throw new BadRequestException('ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้');
        }
        if (dto.email !== undefined) {
            await this.assertEmailAvailable(dto.email, userId);
        }
        if (dto.name !== undefined) {
            user.name = dto.name;
        }
        if (dto.email !== undefined) {
            user.email = dto.email;
        }
        if (dto.role !== undefined) {
            user.role = dto.role;
        }
        if (dto.password) {
            user.password = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
        }
        const saved = await this.usersRepository.save(user);
        return {
            userId: saved.userId,
            name: saved.name,
            email: saved.email,
            role: saved.role,
            customerCount: await this.customerCount(saved.userId),
            createdAt: saved.createdAt,
        };
    }
    async remove(userId, currentUserId) {
        const user = await this.findOne(userId);
        if (userId === currentUserId) {
            throw new BadRequestException('ไม่สามารถลบบัญชีของตัวเองได้');
        }
        const references = await this.references(userId);
        if (references.customerCount > 0 ||
            references.documentCount > 0) {
            const parts = [];
            if (references.customerCount > 0) {
                parts.push(`มีลูกค้าที่ระบุผู้รับผิดชอบ ${references.customerCount} ราย`);
            }
            if (references.documentCount > 0) {
                parts.push(`มีเอกสารที่สร้าง ${references.documentCount} ฉบับ`);
            }
            throw new ConflictException(`ลบไม่ได้ เพราะ${parts.join(' และ')} กรุณาย้ายงานออกจากผู้ใช้นี้ก่อน`);
        }
        await this.usersRepository.remove(user);
        return { userId, deleted: true };
    }
    async findOne(userId) {
        const user = await this.usersRepository.findOne({
            where: { userId },
        });
        if (!user) {
            throw new NotFoundException('ไม่พบผู้ใช้รายนี้');
        }
        return user;
    }
    async assertEmailAvailable(email, ignoreUserId) {
        const query = this.usersRepository
            .createQueryBuilder('user')
            .where('user.email = :email', { email });
        if (ignoreUserId !== undefined) {
            query.andWhere('user.userId != :ignoreUserId', {
                ignoreUserId,
            });
        }
        const clash = await query.getOne();
        if (clash) {
            throw new ConflictException(`อีเมล "${email}" ถูกใช้ไปแล้ว`);
        }
    }
    async customerCount(userId) {
        const rows = await this.customersRepository.manager.query(`SELECT COUNT(*)::int AS count
         FROM customers
         WHERE assigned_id = $1`, [userId]);
        return Number(rows[0]?.count ?? 0);
    }
    async references(userId) {
        const rows = await this.customersRepository.manager.query(`SELECT
         (SELECT COUNT(*)::int
          FROM customers
          WHERE assigned_id = $1) AS "customerCount",
         (SELECT COUNT(*)::int
          FROM documents
          WHERE created_by = $1) AS "documentCount"`, [userId]);
        return {
            customerCount: Number(rows[0]?.customerCount ?? 0),
            documentCount: Number(rows[0]?.documentCount ?? 0),
        };
    }
};
UsersService = __decorate([
    Injectable(),
    __param(0, InjectRepository(User)),
    __param(1, InjectRepository(Customer)),
    __metadata("design:paramtypes", [Repository,
        Repository])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map