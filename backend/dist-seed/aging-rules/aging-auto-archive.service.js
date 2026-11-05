var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgingAutoArchiveService_1;
import { Injectable, Logger, } from '@nestjs/common';
import { IssueOrdersService } from '../issue-orders/issue-orders.service.js';
import { AgingRulesService } from './aging-rules.service.js';
let AgingAutoArchiveService = AgingAutoArchiveService_1 = class AgingAutoArchiveService {
    agingRulesService;
    issueOrdersService;
    logger = new Logger(AgingAutoArchiveService_1.name);
    intervalTimer = null;
    bootTimer = null;
    running = false;
    constructor(agingRulesService, issueOrdersService) {
        this.agingRulesService = agingRulesService;
        this.issueOrdersService = issueOrdersService;
    }
    onModuleInit() {
        const intervalMs = resolveIntervalMs();
        this.intervalTimer = setInterval(() => {
            void this.runOnce();
        }, intervalMs);
        this.bootTimer = setTimeout(() => {
            void this.runOnce();
        }, BOOT_DELAY_MS);
        this.intervalTimer.unref?.();
        this.bootTimer.unref?.();
        this.logger.log(`auto-archive scheduler: ตรวจทุก ${Math.round(intervalMs / 1000)} วินาที (รอบแรกหลัง boot ${BOOT_DELAY_MS / 1000} วินาที)`);
    }
    onModuleDestroy() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
        if (this.bootTimer) {
            clearTimeout(this.bootTimer);
            this.bootTimer = null;
        }
    }
    async runOnce() {
        if (this.running) {
            return 0;
        }
        this.running = true;
        try {
            const rules = await this.loadAutoArchiveRules();
            if (rules.length === 0) {
                return 0;
            }
            let archived = 0;
            for (const rule of rules) {
                const archiveAfterDays = rule.archiveAfterDays ?? rule.criticalAfterDays;
                const candidateIds = await this.issueOrdersService.findArchiveCandidateIds(archiveAfterDays, rule.stageKey);
                for (const orderId of candidateIds) {
                    try {
                        await this.issueOrdersService.archive(orderId);
                        archived += 1;
                        this.logger.log(`auto-archive: ซ่อนใบสั่งซื้อ #${orderId} ออกจากบอร์ด (rule "${rule.ruleName}", ไม่มีกิจกรรม ${archiveAfterDays} วัน)`);
                    }
                    catch (error) {
                        this.logger.warn(`auto-archive: ซ่อนใบสั่งซื้อ #${orderId} ไม่สำเร็จ (${error.message})`);
                    }
                }
            }
            if (archived > 0) {
                this.logger.log(`auto-archive: รอบนี้ซ่อนการ์ดรวม ${archived} ใบ (ไม่มีการลบข้อมูล)`);
            }
            return archived;
        }
        finally {
            this.running = false;
        }
    }
    async loadAutoArchiveRules() {
        const rules = await this.agingRulesService.findAll();
        const active = rules.filter((rule) => rule.isActive &&
            rule.actionType === 'auto_archive' &&
            rule.boardType === 'order_pipeline');
        return active.sort((a, b) => (a.archiveAfterDays ?? a.criticalAfterDays) -
            (b.archiveAfterDays ?? b.criticalAfterDays));
    }
};
AgingAutoArchiveService = AgingAutoArchiveService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AgingRulesService,
        IssueOrdersService])
], AgingAutoArchiveService);
export { AgingAutoArchiveService };
const BOOT_DELAY_MS = 15 * 1000;
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
function resolveIntervalMs() {
    const raw = Number(process.env.AUTO_ARCHIVE_INTERVAL_MS);
    return Number.isFinite(raw) && raw >= 1000
        ? raw
        : DEFAULT_INTERVAL_MS;
}
//# sourceMappingURL=aging-auto-archive.service.js.map