import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductGroupDto } from './dto/product-group.dto.js';
import { UpdateProductGroupDto } from './dto/product-group.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';
import { Product } from './entities/product.entity.js';
import { ProductGroup } from './entities/product-group.entity.js';
import { ProductUnit } from './entities/product-unit.entity.js';
export declare class ProductsService {
    private readonly productsRepository;
    private readonly groupsRepository;
    private readonly unitsRepository;
    constructor(productsRepository: Repository<Product>, groupsRepository: Repository<ProductGroup>, unitsRepository: Repository<ProductUnit>);
    findAll(query: ListProductsDto): Promise<{
        data: Product[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<Product>;
    stats(): Promise<{
        totalProducts: number;
        totalValue: number;
        groupCount: number;
        unitCount: number;
    }>;
    create(dto: CreateProductDto): Promise<Product>;
    update(id: number, dto: UpdateProductDto): Promise<Product>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    private normalizeSkuCode;
    private assertSkuCodeAvailable;
    private assertGroupExists;
    private assertUnitExists;
    findAllGroups(): Promise<{
        id: number;
        name: string;
        description: string | null;
        productCount: number;
    }[]>;
    createGroup(dto: CreateProductGroupDto): Promise<ProductGroup>;
    updateGroup(id: number, dto: UpdateProductGroupDto): Promise<ProductGroup>;
    removeGroup(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    private findGroup;
    findAllUnits(): Promise<{
        id: number;
        name: string;
        productCount: number;
    }[]>;
    createUnit(dto: CreateProductUnitDto): Promise<ProductUnit>;
    updateUnit(id: number, dto: UpdateProductUnitDto): Promise<ProductUnit>;
    removeUnit(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    private findUnit;
}
