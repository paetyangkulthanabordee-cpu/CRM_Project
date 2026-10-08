import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Customer } from '../customers/entities/customer.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

const PASSWORD_SALT_ROUNDS = 10;

/*
 * หน้าจอไม่ต้องการรหัสผ่าน และไม่ควรส่งออกไปเด็ดขาด
 */
export interface UserListItem {
  userId: number;
  name: string;
  email: string;
  role: User['role'];
  customerCount: number;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
  ) {}

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async verifyPassword(
    plain: string,
    hash: string,
  ) {
    return bcrypt.compare(plain, hash);
  }

  async findAll(): Promise<UserListItem[]> {
    const users = await this.usersRepository.find({
      order: { userId: 'ASC' },
    });

    const rows: {
      assignedId: number;
      count: number;
    }[] =
      await this.customersRepository.manager.query(
        `SELECT assigned_id AS "assignedId",
                COUNT(*)::int AS count
         FROM customers
         WHERE assigned_id IS NOT NULL
         GROUP BY assigned_id`,
      );

    const customerCounts = new Map<number, number>(
      rows.map((row) => [
        row.assignedId,
        Number(row.count),
      ]),
    );

    return users.map((user) => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      customerCount:
        customerCounts.get(user.userId) ?? 0,
      createdAt: user.createdAt,
    }));
  }

  async create(dto: CreateUserDto) {
    await this.assertEmailAvailable(dto.email);

    const password = await bcrypt.hash(
      dto.password,
      PASSWORD_SALT_ROUNDS,
    );

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        name: dto.name,
        email: dto.email,
        password,
        role: dto.role,
      }),
    );

    return {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      customerCount: 0,
      createdAt: user.createdAt,
    };
  }

  async update(
    userId: number,
    dto: UpdateUserDto,
    currentUserId: number,
  ): Promise<UserListItem> {
    const user = await this.findOne(userId);

    if (
      dto.role !== undefined &&
      dto.role !== user.role &&
      userId === currentUserId
    ) {
      throw new BadRequestException(
        'ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้',
      );
    }

    if (dto.email !== undefined) {
      await this.assertEmailAvailable(
        dto.email,
        userId,
      );
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.email !== undefined) {
      user.email = dto.email;
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(
        dto.password,
        PASSWORD_SALT_ROUNDS,
      );
    }

    const saved =
      await this.usersRepository.save(user);

    return {
      userId: saved.userId,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      customerCount: await this.customerCount(
        saved.userId,
      ),
      createdAt: saved.createdAt,
    };
  }

  async remove(
    userId: number,
    currentUserId: number,
  ) {
    const user = await this.findOne(userId);

    if (userId === currentUserId) {
      throw new BadRequestException(
        'ไม่สามารถลบบัญชีของตัวเองได้',
      );
    }

    const references =
      await this.references(userId);

    if (
      references.customerCount > 0 ||
      references.documentCount > 0
    ) {
      const parts: string[] = [];

      if (references.customerCount > 0) {
        parts.push(
          `มีลูกค้าที่ระบุผู้รับผิดชอบ ${references.customerCount} ราย`,
        );
      }

      if (references.documentCount > 0) {
        parts.push(
          `มีเอกสารที่สร้าง ${references.documentCount} ฉบับ`,
        );
      }

      throw new ConflictException(
        `ลบไม่ได้ เพราะ${parts.join(
          ' และ',
        )} กรุณาย้ายงานออกจากผู้ใช้นี้ก่อน`,
      );
    }

    await this.usersRepository.remove(user);

    return { userId, deleted: true };
  }

  private async findOne(userId: number) {
    const user = await this.usersRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(
        'ไม่พบผู้ใช้รายนี้',
      );
    }

    return user;
  }

  private async assertEmailAvailable(
    email: string,
    ignoreUserId?: number,
  ) {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email });

    if (ignoreUserId !== undefined) {
      query.andWhere('user.userId != :ignoreUserId', {
        ignoreUserId,
      });
    }

    const clash = await query.getOne();

    if (clash) {
      throw new ConflictException(
        `อีเมล "${email}" ถูกใช้ไปแล้ว`,
      );
    }
  }

  private async customerCount(userId: number) {
    const rows: { count: number }[] =
      await this.customersRepository.manager.query(
        `SELECT COUNT(*)::int AS count
         FROM customers
         WHERE assigned_id = $1`,
        [userId],
      );

    return Number(rows[0]?.count ?? 0);
  }

  private async references(userId: number) {
    const rows: {
      customerCount: number;
      documentCount: number;
    }[] = await this.customersRepository.manager.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM customers
          WHERE assigned_id = $1) AS "customerCount",
         (SELECT COUNT(*)::int
          FROM documents
          WHERE created_by = $1) AS "documentCount"`,
      [userId],
    );

    return {
      customerCount: Number(
        rows[0]?.customerCount ?? 0,
      ),
      documentCount: Number(
        rows[0]?.documentCount ?? 0,
      ),
    };
  }
}
