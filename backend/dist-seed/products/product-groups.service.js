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
import { Injectable, NotFoundException, } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductGroup } from './entities/product-group.entity.js';
let ProductGroupsService = class ProductGroupsService {
    groupsRepository;
    constructor(groupsRepository) {
        this.groupsRepository = groupsRepository;
    }
    async findAll(query) {
        const builder = this.groupsRepository
            .createQueryBuilder('group')
            .orderBy('group.name', 'ASC');
        if (query.search) {
            builder.andWhere('(group.name ILIKE :search OR group.description ILIKE :search)', { search: `%${query.search}%` });
        }
        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
        const [data, total] = await builder
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findOne(id) {
        const group = await this.groupsRepository.findOne({
            where: { id },
        });
        if (!group) {
            throw new NotFoundException('ไม่พบกลุ่มสินค้ารายการนี้');
        }
        return group;
    }
    async create(dto) {
        const group = this.groupsRepository.create({
            name: dto.name,
            description: dto.description ?? null,
        });
        return this.groupsRepository.save(group);
    }
    async update(id, dto) {
        const group = await this.findOne(id);
        const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
        Object.assign(group, changes);
        return this.groupsRepository.save(group);
    }
    async remove(id) {
        const group = await this.findOne(id);
        await this.groupsRepository.remove(group);
        return { id, deleted: true };
    }
};
ProductGroupsService = __decorate([
    Injectable(),
    __param(0, InjectRepository(ProductGroup)),
    __metadata("design:paramtypes", [Repository])
], ProductGroupsService);
export { ProductGroupsService };
//# sourceMappingURL=product-groups.service.js.map