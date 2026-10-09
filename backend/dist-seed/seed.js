import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { CustomersService } from './customers/customers.service';
import { PipelineStagesService } from './pipeline-stages/pipeline-stages.service';
import { UserRole } from './users/entities/user.entity';
async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const usersService = app.get(UsersService);
    const customersService = app.get(CustomersService);
    const stagesService = app.get(PipelineStagesService);
    const stages = await stagesService.findAll();
    if (stages.length === 0) {
        await stagesService.create({
            stageKey: 'lead',
            label: 'Lead',
            color: '#64748b',
        });
        await stagesService.create({
            stageKey: 'qualified',
            label: 'Qualified',
            color: '#0f62fe',
        });
        await stagesService.create({
            stageKey: 'send_quotation',
            label: 'Send Quotation',
            color: '#eab308',
        });
        await stagesService.create({
            stageKey: 'payment',
            label: 'Payment',
            color: '#16a34a',
        });
        await stagesService.create({
            stageKey: 'contract',
            label: 'Contract',
            color: '#7c3aed',
        });
    }
    const existingUsers = await usersService.findAll();
    if (existingUsers.length === 0) {
        await usersService.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: UserRole.ADMIN,
        });
        await usersService.create({
            name: 'Sales One',
            email: 'sales1@example.com',
            password: 'sales123',
            role: UserRole.SALES,
        });
        await usersService.create({
            name: 'Sales Two',
            email: 'sales2@example.com',
            password: 'sales123',
            role: UserRole.SALES,
        });
    }
    const existingCustomers = await customersService.findAll({ onlyInactive: true });
    if (existingCustomers.length === 0) {
        const customers = [
            { companyName: 'บริษัท เทคโนโลยี จำกัด', email: 'contact@tech.co.th', phone: '02-123-4567', status: 'lead' },
            { companyName: 'บริษัท ดิจิทัล โซลูชั่น', email: 'info@digital.co.th', phone: '02-234-5678', status: 'qualified' },
            { companyName: 'บริษัท สมาร์ท ซิสเต็ม', email: 'hello@smart.co.th', phone: '02-345-6789', status: 'send_quotation' },
            { companyName: 'บริษัท คราวด์ เซิร์ฟเวอร์', email: 'support@cloud.co.th', phone: '02-456-7890', status: 'payment' },
            { companyName: 'บริษัท อินเตอร์เน็ต จำกัด', email: 'admin@internet.co.th', phone: '02-567-8901', status: 'contract' },
            { companyName: 'บริษัท ซอฟต์แวร์ ดีไซน์', email: 'design@software.co.th', phone: '02-678-9012', status: 'lead' },
            { companyName: 'บริษัท เน็ตเวิร์ก โซลูชั่น', email: 'net@network.co.th', phone: '02-789-0123', status: 'qualified' },
            { companyName: 'บริษัท เดต้า เซ็นเตอร์', email: 'data@datacenter.co.th', phone: '02-890-1234', status: 'send_quotation' },
            { companyName: 'บริษัท คลาวด์ เทค', email: 'cloud@cloudtech.co.th', phone: '02-901-2345', status: 'payment' },
            { companyName: 'บริษัท ไซเบอร์ ซิคเคิร์ตี้', email: 'security@cyber.co.th', phone: '02-012-3456', status: 'contract' },
            { companyName: 'บริษัท มือถือ แอพ', email: 'mobile@mobile.co.th', phone: '02-111-2222', status: 'lead' },
            { companyName: 'บริษัท อีคอมเมิร์ซ', email: 'shop@ecommerce.co.th', phone: '02-333-4444', status: 'qualified' },
        ];
        for (const customer of customers) {
            await customersService.create(customer);
        }
    }
    console.log('Seed completed!');
    await app.close();
}
await seed();
//# sourceMappingURL=seed.js.map