import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InjectRepository,
} from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PipelineStage } from './entities/pipeline-stage.entity.js';
import {
  CreatePipelineStageDto,
  ReorderStagesDto,
  UpdatePipelineStageDto,
} from './dto/pipeline-stage.dto.js';

export interface StageWithCount {
  stageId: number;
  stageKey: string;
  label: string;
  color: string;
  position: number;
  customerCount: number;
}

@Injectable()
export class PipelineStagesService {
  constructor(
    @InjectRepository(PipelineStage)
    private readonly stagesRepository: Repository<PipelineStage>,
  ) {}

  async findAll(): Promise<StageWithCount[]> {
    const stages = await this.stagesRepository.find({
      order: { position: 'ASC', stageId: 'ASC' },
    });

    const rows: {
      stageKey: string;
      count: string;
    }[] = await this.stagesRepository.manager.query(
      `SELECT status AS "stageKey", COUNT(*)::int AS count
       FROM customers
       GROUP BY status`,
    );

    const counts = new Map<string, number>(
      rows.map((row) => [
        row.stageKey,
        Number(row.count),
      ]),
    );

    return stages.map((stage) => ({
      stageId: stage.stageId,
      stageKey: stage.stageKey,
      label: stage.label,
      color: stage.color,
      position: stage.position,
      customerCount:
        counts.get(stage.stageKey) ?? 0,
    }));
  }

  async findKeys(): Promise<string[]> {
    const stages = await this.stagesRepository.find({
      select: { stageKey: true },
    });

    return stages.map((stage) => stage.stageKey);
  }

  async exists(stageKey: string) {
    const count = await this.stagesRepository.count({
      where: { stageKey },
    });

    return count > 0;
  }

  async customerCount(
    stageKey: string,
  ): Promise<number> {
    const rows: { count: number }[] =
      await this.stagesRepository.manager.query(
        `SELECT COUNT(*)::int AS count
         FROM customers
         WHERE status = $1`,
        [stageKey],
      );

    return Number(rows[0]?.count ?? 0);
  }

  async create(
    dto: CreatePipelineStageDto,
  ): Promise<StageWithCount> {
    await this.assertKeyAvailable(
      dto.stageKey,
    );

    const max = await this.stagesRepository
      .createQueryBuilder('stage')
      .select('MAX(stage.position)', 'max')
      .getRawOne<{ max: string | null }>();

    const position =
      Number(max?.max ?? 0) + 1;

    const stage =
      await this.stagesRepository.save(
        this.stagesRepository.create({
          stageKey: dto.stageKey,
          label: dto.label,
          color: dto.color ?? '#64748b',
          position,
        }),
      );

    return {
      stageId: stage.stageId,
      stageKey: stage.stageKey,
      label: stage.label,
      color: stage.color,
      position: stage.position,
      customerCount: 0,
    };
  }

  async update(
    stageId: number,
    dto: UpdatePipelineStageDto,
  ): Promise<StageWithCount> {
    const stage = await this.findOne(stageId);

    if (dto.stageKey && dto.stageKey !== stage.stageKey) {
      await this.assertKeyAvailable(
        dto.stageKey,
        stageId,
      );
    }

    const previousStageKey = stage.stageKey;

    const renaming =
      dto.stageKey !== undefined &&
      dto.stageKey !== previousStageKey;

    const nextStageKey =
      dto.stageKey ?? previousStageKey;

    Object.assign(stage, {
      ...(dto.stageKey
        ? { stageKey: dto.stageKey }
        : {}),
      ...(dto.label ? { label: dto.label } : {}),
      ...(dto.color ? { color: dto.color } : {}),
    });

    /*
     * customers.status มี FK อ้าง stage_key
     * จึงต้องบันทึกคีย์ใหม่ก่อน แล้วค่อยย้ายลูกค้าไปคีย์ใหม่
     */
    await this.stagesRepository.manager.transaction(
      async (manager) => {
        await manager.save(
          PipelineStage,
          stage,
        );

        if (renaming) {
          await manager.query(
            `UPDATE customers
             SET status = $1, updated_at = NOW()
             WHERE status = $2`,
            [nextStageKey, previousStageKey],
          );
        }
      },
    );

    const saved = stage;

    return {
      stageId: saved.stageId,
      stageKey: saved.stageKey,
      label: saved.label,
      color: saved.color,
      position: saved.position,
      customerCount: await this.customerCount(
        saved.stageKey,
      ),
    };
  }

  async reorder(
    dto: ReorderStagesDto,
  ): Promise<StageWithCount[]> {
    const stages = await this.stagesRepository.find();

    const existing = new Set(
      stages.map((stage) => stage.stageId),
    );

    const ids = dto.stageIds ?? [];

    if (ids.length !== stages.length) {
      throw new BadRequestException(
        'ลำดับคอลัมน์ไม่ครบทุกคอลัมน์ที่มีอยู่',
      );
    }

    const hasUnknown = ids.some(
      (id) => !existing.has(id),
    );

    if (hasUnknown) {
      throw new BadRequestException(
        'พบคอลัมน์ที่ไม่มีอยู่จริงในระบบ',
      );
    }

    await this.stagesRepository.manager.transaction(
      async (manager) => {
        for (const [index, stageId] of ids.entries()) {
          await manager.query(
            `UPDATE pipeline_stages
             SET position = $1, updated_at = NOW()
             WHERE stage_id = $2`,
            [index + 1, stageId],
          );
        }
      },
    );

    return this.findAll();
  }

  async remove(stageId: number) {
    const stage = await this.findOne(stageId);

    const count = await this.customerCount(
      stage.stageKey,
    );

    if (count > 0) {
      throw new ConflictException(
        `ลบไม่ได้ เพราะคอลัมน์ "${stage.label}" ยังมีลูกค้าอยู่ ${count} ราย กรุณาย้ายลูกค้าออกให้หมดก่อน`,
      );
    }

    const total =
      await this.stagesRepository.count();

    if (total <= 1) {
      throw new BadRequestException(
        'ต้องมีคอลัมน์อย่างน้อย 1 คอลัมน์',
      );
    }

    await this.stagesRepository.remove(stage);

    const stages = await this.stagesRepository.find({
      order: { position: 'ASC', stageId: 'ASC' },
    });

    await this.stagesRepository.manager.transaction(
      async (manager) => {
        for (const [index, item] of
          stages.entries()) {
          await manager.query(
            `UPDATE pipeline_stages
             SET position = $1
             WHERE stage_id = $2`,
            [index + 1, item.stageId],
          );
        }
      },
    );

    return {
      stageId,
      deleted: true,
    };
  }

  private async findOne(
    stageId: number,
  ): Promise<PipelineStage> {
    const stage =
      await this.stagesRepository.findOne({
        where: { stageId },
      });

    if (!stage) {
      throw new NotFoundException(
        'ไม่พบคอลัมน์นี้',
      );
    }

    return stage;
  }

  private async assertKeyAvailable(
    stageKey: string,
    ignoreStageId?: number,
  ) {
    const query = this.stagesRepository
      .createQueryBuilder('stage')
      .where('stage.stageKey = :stageKey', {
        stageKey,
      });

    if (ignoreStageId !== undefined) {
      query.andWhere(
        'stage.stageId != :ignoreStageId',
        { ignoreStageId },
      );
    }

    const clash = await query.getOne();

    if (clash) {
      throw new ConflictException(
        `รหัสคอลัมน์ "${stageKey}" ถูกใช้ไปแล้ว`,
      );
    }
  }
}