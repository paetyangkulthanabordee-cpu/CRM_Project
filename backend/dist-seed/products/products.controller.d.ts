import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListCatalogDto } from './dto/list-catalog.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateCategoryDto } from './dto/category.dto.js';
import { UpdateCategoryDto } from './dto/category.dto.js';
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
    findAllGroups(query: ListCatalogDto): Promise<{
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
    findAllUnits(query: ListCatalogDto): Promise<{
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
    createGroup(dto: CreateCategoryDto): Promise<import("./entities/category.entity.js").Category>;
    updateGroup(id: number, dto: UpdateCategoryDto): Promise<import("./entities/category.entity.js").Category>;
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
