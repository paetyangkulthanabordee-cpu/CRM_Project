var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, } from 'typeorm';
let PipelineStage = class PipelineStage {
    stageId;
    stageKey;
    label;
    color;
    position;
    createdAt;
    updatedAt;
};
__decorate([
    PrimaryGeneratedColumn({
        name: 'stage_id',
    }),
    __metadata("design:type", Number)
], PipelineStage.prototype, "stageId", void 0);
__decorate([
    Column({
        name: 'stage_key',
        type: 'varchar',
        length: 50,
        unique: true,
    }),
    __metadata("design:type", String)
], PipelineStage.prototype, "stageKey", void 0);
__decorate([
    Column({
        type: 'varchar',
        length: 100,
    }),
    __metadata("design:type", String)
], PipelineStage.prototype, "label", void 0);
__decorate([
    Column({
        type: 'varchar',
        length: 20,
        default: '#64748b',
    }),
    __metadata("design:type", String)
], PipelineStage.prototype, "color", void 0);
__decorate([
    Column({
        type: 'int',
        default: 0,
    }),
    __metadata("design:type", Number)
], PipelineStage.prototype, "position", void 0);
__decorate([
    CreateDateColumn({
        name: 'created_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], PipelineStage.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({
        name: 'updated_at',
        type: 'timestamptz',
    }),
    __metadata("design:type", Date)
], PipelineStage.prototype, "updatedAt", void 0);
PipelineStage = __decorate([
    Entity('pipeline_stages')
], PipelineStage);
export { PipelineStage };
//# sourceMappingURL=pipeline-stage.entity.js.map