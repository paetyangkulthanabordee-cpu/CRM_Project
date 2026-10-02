import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './permissions/guards/permissions.guard.js';
import { PipelineStagesModule } from './pipeline-stages/pipeline-stages.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,

      autoLoadEntities: true,
      synchronize: false,
    }),

    AuthModule,
    UsersModule,
    CustomersModule,
    DocumentsModule,
    QuotationsModule,
    InvoicesModule,
    ReceiptsModule,
    PermissionsModule,
    PipelineStagesModule,
    AuditLogsModule,
    DashboardModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}