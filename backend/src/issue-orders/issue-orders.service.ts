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
import { User } from '../users/entities/user.entity.js';
import { WorkflowRulesService } from '../workflow-rules/workflow-rules.service.js';

import { IssueOrder } from './entities/issue-order.entity.js';
import { IssueOrderDetail } from './entities/issue-order-detail.entity.js';

import type {
  CreateIssueOrderDto,
  IssueOrderDetailDto,
  UpdateIssueOrderDto,
} from './dto/issue-order.dto.js';

import type { ListIssueOrdersDto } from './dto/list-issue-orders.dto.js';

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
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly workflowRulesService: WorkflowRulesService,
  ) {}

  async findAll(
    query: ListIssueOrdersDto = {},
  ): Promise<IssueOrder[]> {
    const builder = this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect(
        'o.orderPipeline',
        'pipeline',
      )
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.details', 'detail')
      .leftJoinAndSelect('detail.product', 'product')
      .leftJoinAndSelect('o.attachments', 'attachment')
      .orderBy('o.createdAt', 'DESC');

    const search = query.search?.trim();

    if (search) {
      /*
       * ค้นชื่อสินค้าด้วย EXISTS ไม่ใช่ join ตรง ๆ
       * เพราะ join ตรง ๆ จะคัดรายละเอียดที่ไม่ตรงคำค้นออก
       * ทำให้การ์ดหายแถวสินค้าบางบรรทัด
       */
      builder.andWhere(
        `(
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
        )`,
        { search: `%${search}%` },
      );
    }

    if (query.pipelineId !== undefined) {
      builder.andWhere(
        'o.orderPipelineId = :pipelineId',
        { pipelineId: query.pipelineId },
      );
    }

    if (query.customerId !== undefined) {
      builder.andWhere(
        'o.customerId = :customerId',
        { customerId: query.customerId },
      );
    }

    return builder.getMany();
  }

  async findOne(id: number) {
    const order =
      await this.ordersRepository.findOne({
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
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }

    return order;
  }

  async create(dto: CreateIssueOrderDto) {
    await this.assertCustomerExists(dto.customerId);
    await this.assertStageExists(dto.orderPipelineId);

    if (dto.userId !== undefined) {
      await this.assertUserExists(dto.userId);
    }

    const lines =
      await this.resolveDetails(dto.details);

    /*
     * ไม่ส่งมาก็ได้: ส่วนลดใช้ 0% และ VAT ใช้ 7%
     * amount ที่เก็บคือยอดสุทธิหลังหักส่วนลดและบวก VAT แล้ว
     */
    const discountPercent = dto.discountPercent ?? 0;
    const vatPercent = dto.vatPercent ?? 7;

    const totals = computeTotals(
      lines,
      discountPercent,
      vatPercent,
    );

    const orderId = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const order =
          await manager.save(
            IssueOrder,
            manager.create(IssueOrder, {
              customerId: dto.customerId,
              orderPipelineId: dto.orderPipelineId,
              userId: dto.userId ?? null,
              amount: totals.grandTotal,
              discountPercent,
              vatPercent,
              note: dto.note ?? null,
              /*
               * จุดเริ่มต้นนับเวลา Aging Rules
               * (DB มี DEFAULT now() อยู่แล้ว แต่เซ็ตตรง ๆ ให้ชัดเจน)
               */
              lastActivityAt: new Date(),
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
    /*
     * เช็คว่ามีใบสั่งซื้อก่อน แล้วค่อยโหลดใหม่แบบไม่เอา relation
     * เพราะ entity ที่มี relation ฝังอยู่จะถูก TypeORM ใช้ทับค่า FK
     * ตอน save ทำให้บันทึกแล้วค่าไม่เปลี่ยน
     */
    await this.findOne(id);

    if (dto.customerId !== undefined) {
      await this.assertCustomerExists(
        dto.customerId,
      );
    }

    if (dto.orderPipelineId !== undefined) {
      await this.assertStageExists(
        dto.orderPipelineId,
      );
    }

    if (dto.userId !== undefined) {
      await this.assertUserExists(dto.userId);
    }

    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }

    if (dto.customerId !== undefined) {
      order.customerId = dto.customerId;
    }

    /*
     * เปลี่ยนขั้นตอนผ่าน PATCH ทั่วไปก็ต้องผ่าน Workflow Rules
     * ก่อนเสมอ (หน้ารายละเอียดการ์ดแก้ขั้นตอนจากเส้นทางนี้ด้วย)
     */
    if (
      dto.orderPipelineId !== undefined &&
      dto.orderPipelineId !== order.orderPipelineId
    ) {
      await this.workflowRulesService.assertMoveAllowed(
        order,
        order.orderPipelineId,
        dto.orderPipelineId,
      );
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

    /*
     * ถ้าส่งรายละเอียดสินค้าใหม่ ให้แทนที่ของเดิมทั้งหมด
     * และคำนวณยอดรวมใหม่จากรายการล่าสุด
     */
    if (dto.details !== undefined) {
      const lines =
        await this.resolveDetails(dto.details);

      const totals = computeTotals(
        lines,
        order.discountPercent,
        order.vatPercent,
      );

      order.amount = totals.grandTotal;

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
    } else if (
      dto.discountPercent !== undefined ||
      dto.vatPercent !== undefined
    ) {
      /*
       * เปลี่ยนแค่ส่วนลดหรือ VAT โดยไม่แตะรายการสินค้า
       * ต้องโหลดรายการเดิมมาคำนวณ amount ใหม่ด้วย
       */
      const existingLines =
        await this.detailsRepository.find({
          where: { issueOrderId: id },
        });

      const totals = computeTotals(
        existingLines,
        order.discountPercent,
        order.vatPercent,
      );

      order.amount = totals.grandTotal;
    }

    /*
     * การแก้ไขข้อมูล = activity ใหม่ของบอร์ด
     * -> reset timer ของ Aging Rules ให้นับใหม่จากตรงนี้
     */
    order.lastActivityAt = new Date();

    await this.ordersRepository.save(order);

    return this.findOne(id);
  }

  async moveStage(
    id: number,
    orderPipelineId: number,
  ) {
    await this.assertStageExists(orderPipelineId);

    /*
     * โหลด entity แบบไม่เอา relation มาด้วย
     * ถ้าโหลด relation orderPipeline มาด้วย TypeORM จะใช้ค่าจาก object เดิม
     * ทับตอน save ทำให้ลากการ์ดแล้วคอลัมน์ไม่เปลี่ยน (บันทึกนิ่ง)
     */
    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(
        'ไม่พบใบสั่งซื้อนี้',
      );
    }

    /*
     * ตรวจ Workflow Rules ก่อนบันทึก
     * ไม่ผ่าน -> throw 400 พร้อมเหตุผล แล้วการ์ดไม่ถูกย้าย
     */
    if (order.orderPipelineId !== orderPipelineId) {
      await this.workflowRulesService.assertMoveAllowed(
        order,
        order.orderPipelineId,
        orderPipelineId,
      );
    }

    order.orderPipelineId = orderPipelineId;

    /*
     * การย้ายขั้นตอนเป็น activity ใหม่ -> reset timer ของ Aging Rules
     * (การ์ดเริ่มนับ age ใหม่จากวินาทีที่ถูกลากไปขั้นตอนถัดไป)
     */
    order.lastActivityAt = new Date();

    await this.ordersRepository.save(order);

    return this.findOne(id);
  }

  async remove(id: number) {
    // เช็คว่ามีใบสั่งซื้อก่อนลบ (findOne จะ throw 404 ถ้าไม่พบ)
    await this.findOne(id);

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

  private async assertUserExists(userId: number) {
    const exists =
      await this.usersRepository.exists({
        where: { userId },
      });

    if (!exists) {
      throw new NotFoundException(
        'ไม่พบผู้ใช้รายนี้',
      );
    }
  }
}

/*
 * คำนวณยอดเงินของใบสั่งซื้อตามลำดับ:
 * - Subtotal       = ผลรวม (Qty × Unit Price)
 * - Discount       = Subtotal × Discount (%)
 * - After Discount = Subtotal - Discount
 * - VAT            = After Discount × VAT (%)
 * - Grand Total    = After Discount + VAT
 */
function computeTotals(
  lines: { quantity: number; unitPrice: number }[],
  discountPercent: number,
  vatPercent: number,
): {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  vatAmount: number;
  grandTotal: number;
} {
  const subtotal = round2(
    lines.reduce(
      (sum, line) =>
        sum + line.quantity * line.unitPrice,
      0,
    ),
  );

  const discountAmount = round2(
    (subtotal * discountPercent) / 100,
  );

  const afterDiscount = round2(
    subtotal - discountAmount,
  );

  const vatAmount = round2(
    (afterDiscount * vatPercent) / 100,
  );

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    grandTotal: round2(afterDiscount + vatAmount),
  };
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
