import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListCatalogDto } from './dto/list-catalog.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateCategoryDto } from './dto/category.dto.js';
import { UpdateCategoryDto } from './dto/category.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';
import { Product } from './entities/product.entity.js';
import { Category } from './entities/category.entity.js';
import { ProductGroup } from './entities/product-group.entity.js';
import { ProductUnit } from './entities/product-unit.entity.js';
export declare class ProductsService {
    private readonly productsRepository;
    private readonly categoriesRepository;
    private readonly productGroupsRepository;
    private readonly unitsRepository;
    constructor(productsRepository: Repository<Product>, categoriesRepository: Repository<Category>, productGroupsRepository: Repository<ProductGroup>, unitsRepository: Repository<ProductUnit>);
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
    private assertCategoryExists;
    private assertGroupExists;
    private assertUnitExists;
    findAllGroups(query?: ListCatalogDto): Promise<{
        id: number;
        name: string;
        description: string | null;
        productGroupId: number | null;
        productGroup: {
            id: number;
            name: string;
        } | null;
        productCount: number;
    }[]>;
    createGroup(dto: CreateCategoryDto): Promise<Category>;
    updateGroup(id: number, dto: UpdateCategoryDto): Promise<Category>;
    removeGroup(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    private findGroup;
    findAllUnits(query?: ListCatalogDto): Promise<{
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
