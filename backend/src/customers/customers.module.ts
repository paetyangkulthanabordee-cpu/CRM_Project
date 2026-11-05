import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Customer } from './entities/customer.entity.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { AgingRulesModule } from '../aging-rules/aging-rules.module.js';

@Module({
  imports: [
    /* AgingRulesService.assertNotEditLocked — ตรวจ edit-lock ของคอลัมน์ลูกค้า */
    AgingRulesModule,
    TypeOrmModule.forFeature([Customer]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
