import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { Customer } from '../customers/entities/customer.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { User, UserRole } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;

  const saved: any[] = [];

  const mockUsersRepository = {
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn(),
    create: vi.fn((payload: unknown) => payload),
    save: vi.fn(async (payload: any) => {
      saved.push(payload);
      return {
        userId: 99,
        createdAt: new Date('2026-01-01'),
        ...payload,
      };
    }),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
    manager: {
      query: vi.fn().mockResolvedValue([]),
    },
  };

  const mockCustomersRepository = {
    manager: {
      query: vi.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    saved.length = 0;

    mockUsersRepository.manager.query.mockResolvedValue(
      [],
    );
    mockCustomersRepository.manager.query.mockResolvedValue(
      [],
    );

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: getRepositoryToken(User),
            useValue: mockUsersRepository,
          },
          {
            provide: getRepositoryToken(Customer),
            useValue: mockCustomersRepository,
          },
        ],
      }).compile();

    service = module.get<UsersService>(UsersService);
  });

  function dto(
    overrides: Partial<CreateUserDto> = {},
  ): CreateUserDto {
    return {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      role: UserRole.SALES,
      ...overrides,
    };
  }

  function queryBuilderReturning(
    user: unknown,
  ) {
    return {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(user),
    } as {
      where: ReturnType<typeof vi.fn>;
      andWhere: ReturnType<typeof vi.fn>;
      getOne: ReturnType<typeof vi.fn>;
    };
  }

  it('should hash the password on create', async () => {
    mockUsersRepository.createQueryBuilder.mockReturnValue(
      queryBuilderReturning(null),
    );

    const result = await service.create(dto());

    expect(result).not.toHaveProperty('password');

    const [payload] = saved;

    expect(payload.password).not.toBe(
      'secret123',
    );
    expect(
      await bcrypt.compare(
        'secret123',
        payload.password,
      ),
    ).toBe(true);
  });

  it('should reject a duplicate email on create', async () => {
    mockUsersRepository.createQueryBuilder.mockReturnValue(
      queryBuilderReturning({ userId: 1 }),
    );

    await expect(
      service.create(dto()),
    ).rejects.toThrow(
      /ถูกใช้ไปแล้ว/,
    );

    expect(
      mockUsersRepository.save,
    ).not.toHaveBeenCalled();
  });

  it('should allow keeping the same email when editing', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 5,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'old-hash',
      role: UserRole.SALES,
      createdAt: new Date(),
    });

    const builder =
      queryBuilderReturning(null);

    mockUsersRepository.createQueryBuilder.mockReturnValue(
      builder,
    );

    await service.update(
      5,
      { email: 'alice@example.com' },
      1,
    );

    expect(
      builder.andWhere,
    ).toHaveBeenCalledWith(
      'user.userId != :ignoreUserId',
      { ignoreUserId: 5 },
    );
  });

  it('should rehash a new password on update', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 5,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'old-hash',
      role: UserRole.SALES,
      createdAt: new Date(),
    });

    const result = await service.update(
      5,
      { password: 'brand-new-1' },
      1,
    );

    expect(result).not.toHaveProperty('password');
    expect(saved[0].password).not.toBe(
      'brand-new-1',
    );
    expect(
      await bcrypt.compare(
        'brand-new-1',
        saved[0].password,
      ),
    ).toBe(true);
  });

  it('should not downgrade your own role', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 1,
      name: 'System Admin',
      email: 'admin@gmail.com',
      password: 'old-hash',
      role: UserRole.ADMIN,
      createdAt: new Date(),
    });

    await expect(
      service.update(
        1,
        { role: UserRole.SALES },
        1,
      ),
    ).rejects.toThrow(
      /ไม่สามารถเปลี่ยนสิทธิ์ของตัวเอง/,
    );
  });

  it('should refuse to delete your own account', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 1,
      name: 'System Admin',
      email: 'admin@gmail.com',
      password: 'old-hash',
      role: UserRole.ADMIN,
      createdAt: new Date(),
    });

    await expect(
      service.remove(1, 1),
    ).rejects.toThrow(
      /ไม่สามารถลบบัญชีของตัวเอง/,
    );

    expect(
      mockUsersRepository.remove,
    ).not.toHaveBeenCalled();
  });

  it('should refuse to delete a user still referenced', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 3,
      name: 'Somchai',
      email: 'sales1@gmail.com',
      password: 'old-hash',
      role: UserRole.SALES,
      createdAt: new Date(),
    });

    mockCustomersRepository.manager.query.mockResolvedValue([
      { customerCount: 2, documentCount: 5 },
    ]);

    await expect(
      service.remove(3, 1),
    ).rejects.toThrow(/ลบไม่ได้/);

    expect(
      mockUsersRepository.remove,
    ).not.toHaveBeenCalled();
  });

  it('should delete an unreferenced user', async () => {
    mockUsersRepository.findOne.mockResolvedValue({
      userId: 3,
      name: 'Somchai',
      email: 'sales1@gmail.com',
      password: 'old-hash',
      role: UserRole.SALES,
      createdAt: new Date(),
    });

    mockCustomersRepository.manager.query.mockResolvedValue([
      { customerCount: 0, documentCount: 0 },
    ]);

    const result = await service.remove(3, 1);

    expect(result).toEqual({
      userId: 3,
      deleted: true,
    });
    expect(
      mockUsersRepository.remove,
    ).toHaveBeenCalled();
  });

  it('should never leak the password from findAll', async () => {
    mockUsersRepository.find.mockResolvedValue([
      {
        userId: 1,
        name: 'System Admin',
        email: 'admin@gmail.com',
        password: 'secret-hash',
        role: UserRole.ADMIN,
        createdAt: new Date(),
      },
    ]);

    mockCustomersRepository.manager.query.mockResolvedValue([
      { assignedId: 1, count: 4 },
    ]);

    const [user] = await service.findAll();

    expect(user).not.toHaveProperty('password');
    expect(user.customerCount).toBe(4);
  });
});
