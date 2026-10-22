import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductGroupDto } from './dto/product-group.dto.js';
import { UpdateProductGroupDto } from './dto/product-group.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';
import { Product } from './entities/product.entity.js';
import { Category } from './entities/category.entity.js';
import { ProductUnit } from './entities/product-unit.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly groupsRepository: Repository<Category>,
    @InjectRepository(ProductUnit)
    private readonly unitsRepository: Repository<ProductUnit>,
  ) {}

  /* =====================================================
     PRODUCTS
  ===================================================== */

  async findAll(query: ListProductsDto) {
    const builder = this.productsRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect(
        'product.productGroup',
        'group',
      )
      .leftJoinAndSelect(
        'product.productUnit',
        'unit',
      )
      .orderBy('product.name', 'ASC');

    if (query.groupId) {
      builder.andWhere(
        'product.productGroupId = :groupId',
        { groupId: query.groupId },
      );
    }

    if (query.search) {
      builder.andWhere(
        '(product.name ILIKE :search OR product.sku_code ILIKE :search OR group.name ILIKE :search)',
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
    const product =
      await this.productsRepository.findOne({
        where: { id },
        relations: {
          productGroup: true,
          productUnit: true,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'ไม่พบสินค้ารายการนี้',
      );
    }

    return product;
  }

  async stats() {
    const row = await this.productsRepository
      .createQueryBuilder('product')
      .select('COUNT(product.id)', 'totalProducts')
      .addSelect(
        'COALESCE(SUM(product.price), 0)',
        'totalValue',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM category)',
        'groupCount',
      )
      .addSelect(
        '(SELECT COUNT(*) FROM product_unit)',
        'unitCount',
      )
      .getRawOne<{
        totalProducts: string;
        totalValue: string | null;
        groupCount: string;
        unitCount: string;
      }>();

    return {
      totalProducts: Number(
        row?.totalProducts ?? 0,
      ),
      totalValue: Number(row?.totalValue ?? 0),
      groupCount: Number(row?.groupCount ?? 0),
      unitCount: Number(row?.unitCount ?? 0),
    };
  }

  async create(dto: CreateProductDto) {
    await this.assertSkuCodeAvailable(dto.skuCode);
    await this.assertGroupExists(dto.productGroupId);
    await this.assertUnitExists(dto.productUnitId);

    const product =
      this.productsRepository.create({
        name: dto.name,
        skuCode: dto.skuCode ?? null,
        productGroupId: dto.productGroupId,
        description: dto.description ?? null,
        price: dto.price,
        productUnitId: dto.productUnitId,
      });

    return this.productsRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (
      dto.skuCode !== undefined &&
      dto.skuCode !== product.skuCode
    ) {
      await this.assertSkuCodeAvailable(dto.skuCode, id);
    }

    if (dto.productGroupId !== undefined) {
      await this.assertGroupExists(dto.productGroupId);
    }

    if (dto.productUnitId !== undefined) {
      await this.assertUnitExists(dto.productUnitId);
    }

    const changes = Object.fromEntries(
      Object.entries(dto).filter(
        ([, value]) => value !== undefined,
      ),
    );

    Object.assign(product, changes);

    return this.productsRepository.save(product);
  }

  async remove(id: number) {
    const product = await this.findOne(id);

    await this.productsRepository.remove(product);

    return { id, deleted: true };
  }

  private normalizeSkuCode(
    skuCode?: string | null,
  ): string | null {
    const trimmed = (skuCode ?? '').trim();

    return trimmed === '' ? null : trimmed;
  }

  private async assertSkuCodeAvailable(
    skuCode?: string | null,
    ignoreId?: number,
  ) {
    const normalized = this.normalizeSkuCode(skuCode);

    if (!normalized) {
      return;
    }

    const query = this.productsRepository
      .createQueryBuilder('product')
      .where('product.sku_code = :skuCode', {
        skuCode: normalized,
      });

    if (ignoreId !== undefined) {
      query.andWhere('product.id != :id', {
        id: ignoreId,
      });
    }

    const clash = await query.getOne();

    if (clash) {
      throw new ConflictException(
        `รหัสสินค้า (SKU Code) "${normalized}" ถูกใช้ไปแล้ว`,
      );
    }
  }

  private async assertGroupExists(groupId: number) {
    const count = await this.groupsRepository.count(
      { where: { id: groupId } },
    );

    if (count === 0) {
      throw new NotFoundException(
        'ไม่พบกลุ่มสินค้าที่เลือก',
      );
    }
  }

  private async assertUnitExists(unitId: number) {
    const count = await this.unitsRepository.count(
      { where: { id: unitId } },
    );

    if (count === 0) {
      throw new NotFoundException(
        'ไม่พบหน่วยสินค้าที่เลือก',
      );
    }
  }

  /* =====================================================
     PRODUCT GROUPS
  ===================================================== */

  async findAllGroups() {
    const groups = await this.groupsRepository.find({
      order: { name: 'ASC' },
    });

    const counts: { productGroupId: number; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.productGroupId', 'productGroupId')
        .addSelect('COUNT(product.id)', 'count')
        .groupBy('product.productGroupId')
        .getRawMany();

    const countMap = new Map<number, number>(
      counts.map((row) => [
        Number(row.productGroupId),
        Number(row.count),
      ]),
    );

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      productCount:
        countMap.get(group.id) ?? 0,
    }));
  }

  async createGroup(dto: CreateProductGroupDto) {
    const group = this.groupsRepository.create({
      name: dto.name,
      description: dto.description ?? null,
    });

    return this.groupsRepository.save(group);
  }

  async updateGroup(
    id: number,
    dto: UpdateProductGroupDto,
  ) {
    const group = await this.findGroup(id);

    const changes = Object.fromEntries(
      Object.entries(dto).filter(
        ([, value]) => value !== undefined,
      ),
    );

    Object.assign(group, changes);

    return this.groupsRepository.save(group);
  }

  async removeGroup(id: number) {
    const group = await this.findGroup(id);

    const count = await this.productsRepository.count(
      { where: { productGroupId: id } },
    );

    if (count > 0) {
      throw new ConflictException(
        `ลบไม่ได้ เพราะกลุ่ม "${group.name}" ยังมีสินค้าอยู่ ${count} รายการ กรุณาย้ายสินค้าออกก่อน`,
      );
    }

    await this.groupsRepository.remove(group);

    return { id, deleted: true };
  }

  private async findGroup(id: number) {
    const group =
      await this.groupsRepository.findOne({
        where: { id },
      });

    if (!group) {
      throw new NotFoundException(
        'ไม่พบกลุ่มสินค้านี้',
      );
    }

    return group;
  }

  /* =====================================================
     PRODUCT UNITS
  ===================================================== */

  async findAllUnits() {
    const units = await this.unitsRepository.find({
      order: { name: 'ASC' },
    });

    const counts: { productUnitId: number; count: string }[] =
      await this.productsRepository
        .createQueryBuilder('product')
        .select('product.productUnitId', 'productUnitId')
        .addSelect('COUNT(product.id)', 'count')
        .groupBy('product.productUnitId')
        .getRawMany();

    const countMap = new Map<number, number>(
      counts.map((row) => [
        Number(row.productUnitId),
        Number(row.count),
      ]),
    );

    return units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      productCount:
        countMap.get(unit.id) ?? 0,
    }));
  }

  async createUnit(dto: CreateProductUnitDto) {
    const unit = this.unitsRepository.create({
      name: dto.name,
    });

    return this.unitsRepository.save(unit);
  }

  async updateUnit(
    id: number,
    dto: UpdateProductUnitDto,
  ) {
    const unit = await this.findUnit(id);

    Object.assign(unit, dto);

    return this.unitsRepository.save(unit);
  }

  async removeUnit(id: number) {
    const unit = await this.findUnit(id);

    const count = await this.productsRepository.count(
      { where: { productUnitId: id } },
    );

    if (count > 0) {
      throw new ConflictException(
        `ลบไม่ได้ เพราะหน่วย "${unit.name}" ยังมีสินค้าอยู่ ${count} รายการ กรุณาย้ายสินค้าออกก่อน`,
      );
    }

    await this.unitsRepository.remove(unit);

    return { id, deleted: true };
  }

  private async findUnit(id: number) {
    const unit =
      await this.unitsRepository.findOne({
        where: { id },
      });

    if (!unit) {
      throw new NotFoundException(
        'ไม่พบหน่วยสินค้านี้',
      );
    }

    return unit;
  }
}
