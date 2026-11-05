import { ProductGroupsService } from './product-groups.service.js';
import { CreateProductGroupDto } from './dto/create-product-group.dto.js';
import { ListProductGroupsDto } from './dto/list-product-groups.dto.js';
import { UpdateProductGroupDto } from './dto/update-product-group.dto.js';
export declare class ProductGroupsController {
    private readonly productGroupsService;
    constructor(productGroupsService: ProductGroupsService);
    findAll(query: ListProductGroupsDto): Promise<{
        data: import("./entities/product-group.entity.js").ProductGroup[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<import("./entities/product-group.entity.js").ProductGroup>;
    create(dto: CreateProductGroupDto): Promise<import("./entities/product-group.entity.js").ProductGroup>;
    update(id: number, dto: UpdateProductGroupDto): Promise<import("./entities/product-group.entity.js").ProductGroup>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
}
