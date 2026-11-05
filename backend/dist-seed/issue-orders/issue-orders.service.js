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
import { InjectRepository, } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';
import { User } from '../users/entities/user.entity.js';
import { WorkflowRulesService } from '../workflow-rules/workflow-rules.service.js';
import { AgingRulesService } from '../aging-rules/aging-rules.service.js';
import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';
import { IssueOrderAttachmentsService } from './issue-order-attachments.service.js';
let IssueOrdersService = class IssueOrdersService {
    ordersRepository;
    detailsRepository;
    customersRepository;
    productsRepository;
    stagesRepository;
    usersRepository;
    workflowRulesService;
    agingRulesService;
    attachmentsService;
    constructor(ordersRepository, detailsRepository, customersRepository, productsRepository, stagesRepository, usersRepository, workflowRulesService, agingRulesService, attachmentsService) {
        this.ordersRepository = ordersRepository;
        this.detailsRepository = detailsRepository;
        this.customersRepository = customersRepository;
        this.productsRepository = productsRepository;
        this.stagesRepository = stagesRepository;
        this.usersRepository = usersRepository;
        this.workflowRulesService = workflowRulesService;
        this.agingRulesService = agingRulesService;
        this.attachmentsService = attachmentsService;
    }
    async findAll(query = {}) {
        const builder = this.ordersRepository
            .createQueryBuilder('o')
            .leftJoinAndSelect('o.customer', 'customer')
            .leftJoinAndSelect('o.orderPipeline', 'pipeline')
            .leftJoinAndSelect('o.user', 'user')
            .leftJoinAndSelect('o.details', 'detail')
            .leftJoinAndSelect('detail.product', 'product')
            .leftJoinAndSelect('o.attachments', 'attachment')
            .orderBy('o.createdAt', 'DESC');
        const search = query.search?.trim();
        if (search) {
            builder.andWhere(`(
          CAST(o.id AS TEXT) ILIKE :search
          OR customer.companyName ILIKE :search
          OR o.note ILIKE :search
          OR EXISTS (
            SELECT 1
            FROM issue_order_detail d
            INNER JOIN product p ON p.id = d.product_id
            WHERE d.issue_order_id = o.id
              AND p.name ILIKE :search
          )
        )`, { search: `%${search}%` });
        }
        if (query.pipelineId !== undefined) {
            builder.andWhere('o.orderPipelineId = :pipelineId', { pipelineId: query.pipelineId });
        }
        if (query.customerId !== undefined) {
            builder.andWhere('o.customerId = :customerId', { customerId: query.customerId });
        }
        if (query.archived === 'false') {
            builder.andWhere('o.is_archived = false');
        }
        else if (query.archived === 'true') {
            builder.andWhere('o.is_archived = true');
        }
        return builder.getMany();
    }
    async findOne(id) {
        const order = await this.ordersRepository.findOne({
            where: { id },
            relations: {
                customer: true,
                orderPipeline: true,
                user: true,
                details: {
                    product: true,
                },
                attachments: true,
            },
        });
        if (!order) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
        return order;
    }
    async findArchiveCandidateIds(archiveAfterDays, stageKey) {
        const DAY_MS = 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - archiveAfterDays * DAY_MS);
        const builder = this.ordersRepository
            .createQueryBuilder('o')
            .innerJoin('o.orderPipeline', 'p')
            .select('o.id', 'id')
            .where('o.updated_at <= :cutoff', { cutoff })
            .andWhere('o.is_archived = false');
        if (stageKey !== null) {
            builder.andWhere('p.stage_key = :stageKey', {
                stageKey,
            });
        }
        const rows = await builder.getRawMany();
        return rows.map((row) => Number(row.id));
    }
    async create(dto) {
        await this.assertCustomerExists(dto.customerId);
        await this.assertStageExists(dto.orderPipelineId);
        if (dto.userId !== undefined) {
            await this.assertUserExists(dto.userId);
        }
        const lines = await this.resolveDetails(dto.details);
        const discountPercent = dto.discountPercent ?? 0;
        const vatPercent = dto.vatPercent ?? 7;
        const totals = computeTotals(lines, discountPercent, vatPercent);
        const orderId = await this.ordersRepository.manager.transaction(async (manager) => {
            const order = await manager.save(IssueOrder, manager.create(IssueOrder, {
                customerId: dto.customerId,
                orderPipelineId: dto.orderPipelineId,
                userId: dto.userId ?? null,
                amount: totals.grandTotal,
                discountPercent,
                vatPercent,
                note: dto.note ?? null,
            }));
            await manager.save(IssueOrderDetail, lines.map((line) => manager.create(IssueOrderDetail, {
                issueOrderId: order.id,
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
            })));
            return order.id;
        });
        return this.findOne(orderId);
    }
    async update(id, dto) {
        const existing = await this.findOne(id);
        await this.agingRulesService.assertNotEditLocked('order_pipeline', existing.orderPipeline?.stageKey ?? null);
        if (dto.customerId !== undefined) {
            await this.assertCustomerExists(dto.customerId);
        }
        if (dto.orderPipelineId !== undefined) {
            await this.assertStageExists(dto.orderPipelineId);
        }
        if (dto.userId !== undefined) {
            await this.assertUserExists(dto.userId);
        }
        const order = await this.ordersRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
        if (dto.customerId !== undefined) {
            order.customerId = dto.customerId;
        }
        if (dto.orderPipelineId !== undefined &&
            dto.orderPipelineId !== order.orderPipelineId) {
            await this.workflowRulesService.assertMoveAllowed(order, order.orderPipelineId, dto.orderPipelineId);
        }
        if (dto.orderPipelineId !== undefined) {
            order.orderPipelineId = dto.orderPipelineId;
        }
        if (dto.note !== undefined) {
            order.note = dto.note;
        }
        if (dto.userId !== undefined) {
            order.userId = dto.userId;
        }
        if (dto.discountPercent !== undefined) {
            order.discountPercent = dto.discountPercent;
        }
        if (dto.vatPercent !== undefined) {
            order.vatPercent = dto.vatPercent;
        }
        if (dto.isArchived !== undefined) {
            order.isArchived = dto.isArchived;
        }
        if (dto.details !== undefined) {
            const lines = await this.resolveDetails(dto.details);
            const totals = computeTotals(lines, order.discountPercent, order.vatPercent);
            order.amount = totals.grandTotal;
            await this.ordersRepository.manager.transaction(async (manager) => {
                await manager.delete(IssueOrderDetail, { issueOrderId: id });
                await manager.save(IssueOrderDetail, lines.map((line) => manager.create(IssueOrderDetail, {
                    issueOrderId: id,
                    productId: line.productId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                })));
            });
        }
        else if (dto.discountPercent !== undefined ||
            dto.vatPercent !== undefined) {
            const existingLines = await this.detailsRepository.find({
                where: { issueOrderId: id },
            });
            const totals = computeTotals(existingLines, order.discountPercent, order.vatPercent);
            order.amount = totals.grandTotal;
        }
        await this.ordersRepository.save(order);
        return this.findOne(id);
    }
    async moveStage(id, orderPipelineId) {
        await this.assertStageExists(orderPipelineId);
        const order = await this.ordersRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new NotFoundException('ไม่พบใบสั่งซื้อนี้');
        }
        if (order.orderPipelineId !== orderPipelineId) {
            await this.workflowRulesService.assertMoveAllowed(order, order.orderPipelineId, orderPipelineId);
        }
        order.orderPipelineId = orderPipelineId;
        await this.ordersRepository.save(order);
        return this.findOne(id);
    }
    async archive(id) {
        await this.findOne(id);
        await this.ordersRepository.update({ id }, { isArchived: true });
        return {
            id,
            archived: true,
        };
    }
    async remove(id) {
        const order = await this.findOne(id);
        await this.agingRulesService.assertNotEditLocked('order_pipeline', order.orderPipeline?.stageKey ?? null);
        await this.attachmentsService.deleteFilesByOrderId(id);
        await this.ordersRepository.manager.transaction(async (manager) => {
            await manager.delete(IssueOrderDetail, {
                issueOrderId: id,
            });
            await manager.delete(IssueOrder, { id });
        });
        return {
            id,
            deleted: true,
        };
    }
    async resolveDetails(details) {
        const productIds = details.map((detail) => detail.productId);
        const products = await this.productsRepository.find({
            where: productIds.map((id) => ({
                id,
            })),
        });
        const productById = new Map(products.map((product) => [
            product.id,
            product,
        ]));
        return details.map((detail) => {
            const product = productById.get(detail.productId);
            if (!product) {
                throw new NotFoundException(`ไม่พบสินค้า #${detail.productId}`);
            }
            return {
                productId: detail.productId,
                quantity: detail.quantity ?? 1,
                unitPrice: detail.unitPrice ?? product.price,
            };
        });
    }
    async assertCustomerExists(customerId) {
        const exists = await this.customersRepository.exists({
            where: { customerId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบลูกค้ารายนี้');
        }
    }
    async assertStageExists(orderPipelineId) {
        const exists = await this.stagesRepository.exists({
            where: { id: orderPipelineId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบขั้นตอนนี้ในท่อออเดอร์');
        }
    }
    async assertUserExists(userId) {
        const exists = await this.usersRepository.exists({
            where: { userId },
        });
        if (!exists) {
            throw new NotFoundException('ไม่พบผู้ใช้รายนี้');
        }
    }
};
IssueOrdersService = __decorate([
    Injectable(),
    __param(0, InjectRepository(IssueOrder)),
    __param(1, InjectRepository(IssueOrderDetail)),
    __param(2, InjectRepository(Customer)),
    __param(3, InjectRepository(Product)),
    __param(4, InjectRepository(OrderPipeline)),
    __param(5, InjectRepository(User)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository,
        Repository,
        Repository,
        Repository,
        WorkflowRulesService,
        AgingRulesService,
        IssueOrderAttachmentsService])
], IssueOrdersService);
export { IssueOrdersService };
function computeTotals(lines, discountPercent, vatPercent) {
    const subtotal = round2(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
    const discountAmount = round2((subtotal * discountPercent) / 100);
    const afterDiscount = round2(subtotal - discountAmount);
    const vatAmount = round2((afterDiscount * vatPercent) / 100);
    return {
        subtotal,
        discountAmount,
        afterDiscount,
        vatAmount,
        grandTotal: round2(afterDiscount + vatAmount),
    };
}
function round2(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
//# sourceMappingURL=issue-orders.service.js.map