import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { UserRole } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn(),
  };

  const mockPermissionsService = {
    getForRole: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should return access token, user and permissions on valid login', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      userId: 1,
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash(
        'secret123',
        10,
      ),
      role: UserRole.ADMIN,
    });
    mockJwtService.sign.mockReturnValue('jwt-token-123');
    mockPermissionsService.getForRole.mockResolvedValue({
      dashboard: true,
      customers: true,
      salesPipeline: true,
      documents: true,
      reports: true,
      administration: true,
      permissions: true,
      auditLogs: true,
    });

    const result = await service.login('alice@example.com', 'secret123');

    expect(mockUsersService.findByEmail).toHaveBeenCalledWith('alice@example.com');
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      sub: 1,
      email: 'alice@example.com',
      role: UserRole.ADMIN,
    });
    expect(result).toEqual({
      accessToken: 'jwt-token-123',
      user: {
        userId: 1,
        name: 'Alice',
        email: 'alice@example.com',
        role: UserRole.ADMIN,
      },
      permissions: {
        dashboard: true,
        customers: true,
        salesPipeline: true,
        documents: true,
        reports: true,
        administration: true,
        permissions: true,
        auditLogs: true,
      },
    });
    expect(
      mockPermissionsService.getForRole,
    ).toHaveBeenCalledWith(UserRole.ADMIN);
  });

  it('should reject a wrong password', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      userId: 1,
      name: 'Alice',
      email: 'alice@example.com',
      password: await bcrypt.hash(
        'secret123',
        10,
      ),
      role: UserRole.ADMIN,
    });

    await expect(
      service.login(
        'alice@example.com',
        'wrong-password',
      ),
    ).rejects.toThrow(
      'Email หรือ Password ไม่ถูกต้อง',
    );

    expect(
      mockJwtService.sign,
    ).not.toHaveBeenCalled();
  });

  it('should reject a plaintext password once hashing is in use', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      userId: 1,
      name: 'Alice',
      email: 'alice@example.com',
      password: 'secret123',
      role: UserRole.ADMIN,
    });

    await expect(
      service.login(
        'alice@example.com',
        'secret123',
      ),
    ).rejects.toThrow(
      'Email หรือ Password ไม่ถูกต้อง',
    );
  });
});
