var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Res, StreamableFile, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator.js';
import { UPLOAD_ALLOWED_MIME_TYPES, UPLOAD_MAX_BYTES, UPLOAD_INVALID_TYPE_MESSAGE, IssueOrderAttachmentsService, } from './issue-order-attachments.service.js';
let IssueOrderAttachmentsController = class IssueOrderAttachmentsController {
    attachmentsService;
    constructor(attachmentsService) {
        this.attachmentsService = attachmentsService;
    }
    list(orderId) {
        return this.attachmentsService.list(orderId);
    }
    upload(orderId, file, user, documentTypeIdRaw) {
        return this.attachmentsService.upload(orderId, file, user?.sub ?? null, parseDocumentTypeId(documentTypeIdRaw));
    }
    async download(orderId, attachmentId, res) {
        const file = await this.attachmentsService.getFile(orderId, attachmentId);
        const asciiFallback = file.originalName
            .replace(/[^\x20-\x7e]/g, '_')
            .replace(/["\\]/g, '_');
        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
            'Content-Length': String(file.buffer.length),
        });
        return new StreamableFile(file.buffer);
    }
    remove(orderId, attachmentId) {
        return this.attachmentsService.remove(orderId, attachmentId);
    }
};
__decorate([
    Get(),
    __param(0, Param('id', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], IssueOrderAttachmentsController.prototype, "list", null);
__decorate([
    Post(),
    UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: UPLOAD_MAX_BYTES },
        fileFilter: (_req, file, callback) => {
            if (UPLOAD_ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                callback(null, true);
                return;
            }
            callback(new BadRequestException(UPLOAD_INVALID_TYPE_MESSAGE), false);
        },
    })),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, UploadedFile()),
    __param(2, CurrentUser()),
    __param(3, Body('documentTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object, Object, String]),
    __metadata("design:returntype", void 0)
], IssueOrderAttachmentsController.prototype, "upload", null);
__decorate([
    Get(':attachmentId/file'),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Param('attachmentId', ParseIntPipe)),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, Object]),
    __metadata("design:returntype", Promise)
], IssueOrderAttachmentsController.prototype, "download", null);
__decorate([
    Delete(':attachmentId'),
    HttpCode(200),
    __param(0, Param('id', ParseIntPipe)),
    __param(1, Param('attachmentId', ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], IssueOrderAttachmentsController.prototype, "remove", null);
IssueOrderAttachmentsController = __decorate([
    Controller('issue-orders/:id/attachments'),
    RequirePermissions('orderPipeline'),
    __metadata("design:paramtypes", [IssueOrderAttachmentsService])
], IssueOrderAttachmentsController);
export { IssueOrderAttachmentsController };
function parseDocumentTypeId(raw) {
    if (raw === undefined || raw.trim() === '') {
        return null;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new BadRequestException('documentTypeId ต้องเป็นจำนวนเต็มบวก');
    }
    return value;
}
//# sourceMappingURL=issue-order-attachments.controller.js.map