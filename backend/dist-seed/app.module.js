var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
import { DocumentTypesModule } from './document-types/document-types.module.js';
import { QuotationsModule } from './quotations/quotations.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ProductsModule } from './products/products.module.js';
import { OrderPipelineModule } from './order-pipeline/order-pipeline.module.js';
import { IssueOrdersModule } from './issue-orders/issue-orders.module.js';
import { WorkflowRulesModule } from './workflow-rules/workflow-rules.module.js';
import { AgingRulesModule } from './aging-rules/aging-rules.module.js';
import { AgingAutoArchiveModule } from './aging-rules/aging-auto-archive.module.js';
const requiredEnvVars = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '.env.local'],
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
            DocumentTypesModule,
            QuotationsModule,
            InvoicesModule,
            ReceiptsModule,
            PermissionsModule,
            PipelineStagesModule,
            AuditLogsModule,
            DashboardModule,
            ProductsModule,
            OrderPipelineModule,
            IssueOrdersModule,
            WorkflowRulesModule,
            AgingRulesModule,
            AgingAutoArchiveModule,
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
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map