import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateProductGroupDto } from './dto/product-group.dto.js';
import { UpdateProductGroupDto } from './dto/product-group.dto.js';
import { CreateProductUnitDto } from './dto/product-unit.dto.js';
import { UpdateProductUnitDto } from './dto/product-unit.dto.js';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    stats(): Promise<{
        totalProducts: number;
        totalValue: number;
        groupCount: number;
        unitCount: number;
    }>;
    findAll(query: ListProductsDto): Promise<{
        data: import("./entities/product.entity.js").Product[];
        total: number;
        page: number;
        limit: number;
    }>;
    findAllGroups(): Promise<{
        id: number;
        name: string;
        description: string | null;
        productCount: number;
    }[]>;
    findAllUnits(): Promise<{
        id: number;
        name: string;
        productCount: number;
    }[]>;
    findOne(id: number): Promise<import("./entities/product.entity.js").Product>;
    create(dto: CreateProductDto): Promise<import("./entities/product.entity.js").Product>;
    update(id: number, dto: UpdateProductDto): Promise<import("./entities/product.entity.js").Product>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    createGroup(dto: CreateProductGroupDto): Promise<import("./entities/product-group.entity.js").ProductGroup>;
    updateGroup(id: number, dto: UpdateProductGroupDto): Promise<import("./entities/product-group.entity.js").ProductGroup>;
    removeGroup(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    createUnit(dto: CreateProductUnitDto): Promise<import("./entities/product-unit.entity.js").ProductUnit>;
    updateUnit(id: number, dto: UpdateProductUnitDto): Promise<import("./entities/product-unit.entity.js").ProductUnit>;
    removeUnit(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
}
