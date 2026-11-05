import { Repository } from 'typeorm';
import { CreateProductGroupDto } from './dto/create-product-group.dto.js';
import { ListProductGroupsDto } from './dto/list-product-groups.dto.js';
import { UpdateProductGroupDto } from './dto/update-product-group.dto.js';
import { ProductGroup } from './entities/product-group.entity.js';
export declare class ProductGroupsService {
    private readonly groupsRepository;
    constructor(groupsRepository: Repository<ProductGroup>);
    findAll(query: ListProductGroupsDto): Promise<{
        data: ProductGroup[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<ProductGroup>;
    create(dto: CreateProductGroupDto): Promise<ProductGroup>;
    update(id: number, dto: UpdateProductGroupDto): Promise<ProductGroup>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
}
