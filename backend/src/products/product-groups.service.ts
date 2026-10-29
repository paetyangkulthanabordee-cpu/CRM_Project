import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProductGroupDto } from './dto/create-product-group.dto.js';
import { ListProductGroupsDto } from './dto/list-product-groups.dto.js';
import { UpdateProductGroupDto } from './dto/update-product-group.dto.js';
import { ProductGroup } from './entities/product-group.entity.js';

@Injectable()
export class ProductGroupsService {
  constructor(
    @InjectRepository(ProductGroup)
    private readonly groupsRepository: Repository<ProductGroup>,
  ) {}

  /* =====================================================
     PRODUCT GROUPS (ตาราง master: ชื่อกลุ่ม + คำอธิบาย)
  ===================================================== */

  async findAll(query: ListProductGroupsDto) {
    const builder = this.groupsRepository
      .createQueryBuilder('group')
      .orderBy('group.name', 'ASC');

    if (query.search) {
      builder.andWhere(
        '(group.name ILIKE :search OR group.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const page = Math.max(
      1,
      Number(query.page) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, Number(query.limit) || 50),
    );

    const [data, total] = await builder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number) {
    const group =
      await this.groupsRepository.findOne({
        where: { id },
      });

    if (!group) {
      throw new NotFoundException(
        'ไม่พบกลุ่มสินค้ารายการนี้',
      );
    }

    return group;
  }

  async create(dto: CreateProductGroupDto) {
    const group = this.groupsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    return this.groupsRepository.save(group);
  }

  async update(id: number, dto: UpdateProductGroupDto) {
    const group = await this.findOne(id);

    const changes = Object.fromEntries(
      Object.entries(dto).filter(
        ([, value]) => value !== undefined,
      ),
    );

    Object.assign(group, changes);

    return this.groupsRepository.save(group);
  }

  async remove(id: number) {
    const group = await this.findOne(id);

    await this.groupsRepository.remove(group);

    return { id, deleted: true };
  }
}
