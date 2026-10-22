import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Customer } from '../customers/entities/customer.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderPipeline } from '../order-pipeline/entities/order-pipeline.entity.js';

import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';

import type {
  CreateIssueOrderDto,
  IssueOrderDetailDto,
  UpdateIssueOrderDto,
} from './dto/issue-order.dto.js';

@Injectable()
export class IssueOrdersService {
  constructor(
    @InjectRepository(IssueOrder)
    private readonly ordersRepository: Repository<IssueOrder>,
    @InjectRepository(IssueOrderDetail)
    private readonly detailsRepository: Repository<IssueOrderDetail>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(OrderPipeline)
    private readonly stagesRepository: Repository<OrderPipeline>,
  ) {}

  async findAll(): Promise<IssueOrder[]> {
    return this.ordersRepository.find({
      relations: {
        customer: true,
        orderPipeline: true,
        details: {
          product: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const order =
      await this.ordersRepository.findOne({
        where: { id },
        relations: {
          customer: true,
          orderPipeline: true,
          details: {
            product: true,
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }

    return order;
  }

  async create(dto: CreateIssueOrderDto) {
    await this.assertCustomerExists(dto.customerId);
    await this.assertStageExists(dto.orderPipelineId);

    const lines =
      await this.resolveDetails(dto.details);

    const amount = lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPrice,
      0,
    );

    const orderId = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const order =
          await manager.save(
            IssueOrder,
            manager.create(IssueOrder, {
              customerId: dto.customerId,
              orderPipelineId: dto.orderPipelineId,
              amount: round2(amount),
              note: dto.note ?? null,
            }),
          );

        await manager.save(
          IssueOrderDetail,
          lines.map((line) =>
            manager.create(IssueOrderDetail, {
              issueOrderId: order.id,
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            }),
          ),
        );

        return order.id;
      },
    );

    /*
     * อ่านกลับหลัง transaction จบแล้ว
     * ถ้าอ่านข้างใน transaction จะเป็นคนละ connection
     * อาจยังไม่เห็นข้อมูลที่เพิ่ง insert
     */
    return this.findOne(orderId);
  }

  async update(
    id: number,
    dto: UpdateIssueOrderDto,
  ) {
    const order = await this.findOne(id);

    if (dto.customerId !== undefined) {
      await this.assertCustomerExists(
        dto.customerId,
      );
      order.customerId = dto.customerId;
    }

    if (dto.orderPipelineId !== undefined) {
      await this.assertStageExists(
        dto.orderPipelineId,
      );
      order.orderPipelineId = dto.orderPipelineId;
    }

    if (dto.note !== undefined) {
      order.note = dto.note;
    }

    /*
     * ถ้าส่งรายละเอียดสินค้าใหม่ ให้แทนที่ของเดิมทั้งหมด
     * และคำนวณยอดรวมใหม่จากรายการล่าสุด
     */
    if (dto.details !== undefined) {
      const lines =
        await this.resolveDetails(dto.details);

      order.amount = round2(
        lines.reduce(
          (sum, line) =>
            sum + line.quantity * line.unitPrice,
          0,
        ),
      );

      await this.ordersRepository.manager.transaction(
        async (manager) => {
          await manager.delete(
            IssueOrderDetail,
            { issueOrderId: id },
          );

          await manager.save(
            IssueOrderDetail,
            lines.map((line) =>
              manager.create(IssueOrderDetail, {
                issueOrderId: id,
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
              }),
            ),
          );
        },
      );
    }

    await this.ordersRepository.save(order);

    return this.findOne(id);
  }

  async moveStage(
    id: number,
    orderPipelineId: number,
  ) {
    const order = await this.findOne(id);

    await this.assertStageExists(orderPipelineId);

    order.orderPipelineId = orderPipelineId;

    await this.ordersRepository.save(order);

    return this.findOne(id);
  }

  async remove(id: number) {
    const order = await this.findOne(id);

    /*
     * issue_order_detail มี ON DELETE CASCADE
     * ลบรายละเอียดทิ้งก่อนเพื่อไม่ให้เหลือข้อมูลค้าง
     */
    await this.ordersRepository.manager.transaction(
      async (manager) => {
        await manager.delete(IssueOrderDetail, {
          issueOrderId: id,
        });

        await manager.delete(IssueOrder, { id });
      },
    );

    return {
      id,
      deleted: true,
    };
  }

  /*
   * เตรียมรายละเอียดสินค้าให้พร้อมบันทึก
   * - เช็คว่าสินค้ามีอยู่จริง
   * - ถ้าไม่ได้ระบุราคา ให้ใช้ราคาปัจจุบันของสินค้า
   * - ถ้าไม่ได้ระบุจำนวน ให้ใช้ 1
   */
  private async resolveDetails(
    details: IssueOrderDetailDto[],
  ): Promise<
    {
      productId: number;
      quantity: number;
      unitPrice: number;
    }[]
  > {
    const productIds = details.map(
      (detail) => detail.productId,
    );

    const products =
      await this.productsRepository.find({
        where: productIds.map((id) => ({
          id,
        })),
      });

    const productById = new Map(
      products.map((product) => [
        product.id,
        product,
      ]),
    );

    return details.map((detail) => {
      const product = productById.get(
        detail.productId,
      );

      if (!product) {
        throw new NotFoundException(
          `ไม่พบสินค้า #${detail.productId}`,
        );
      }

      return {
        productId: detail.productId,
        quantity: detail.quantity ?? 1,
        unitPrice: detail.unitPrice ?? product.price,
      };
    });
  }

  private async assertCustomerExists(
    customerId: number,
  ) {
    const exists =
      await this.customersRepository.exists({
        where: { customerId },
      });

    if (!exists) {
      throw new NotFoundException(
        'ไม่พบลูกค้ารายนี้',
      );
    }
  }

  private async assertStageExists(
    orderPipelineId: number,
  ) {
    const exists =
      await this.stagesRepository.exists({
        where: { id: orderPipelineId },
      });

    if (!exists) {
      throw new NotFoundException(
        'ไม่พบขั้นตอนนี้ในท่อออเดอร์',
      );
    }
  }
}

/*
 * ยอดเงินเก็บเป็น numeric(15,2)
 * ต้องปัดเศษทศนิยมก่อนบันทึก ไม่งั้นจะเกิด floating point error
 */
function round2(value: number): number {
  return Math.round(
    (value + Number.EPSILON) * 100,
  ) / 100;
}
