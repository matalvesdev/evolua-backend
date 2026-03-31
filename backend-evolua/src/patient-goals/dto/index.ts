import {
  IsString,
  IsOptional,
  IsDateString,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

const GOAL_STATUSES = ['in_progress', 'completed', 'on_hold', 'abandoned'] as const;
const GOAL_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

/**
 * DTO para criar uma nova meta terapêutica
 */
export class CreatePatientGoalDto {
  @ApiProperty({ description: 'Título da meta' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada da meta' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID do paciente' })
  @IsUUID()
  @IsNotEmpty()
  patientId: string;

  @ApiPropertyOptional({ description: 'Data alvo para conclusão' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Prioridade da meta', enum: GOAL_PRIORITIES })
  @IsOptional()
  @IsIn(GOAL_PRIORITIES)
  priority?: string;
}

/**
 * DTO para atualizar uma meta terapêutica
 */
export class UpdatePatientGoalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(GOAL_PRIORITIES)
  priority?: string;
}

/**
 * DTO para criar um snapshot de progresso
 */
export class CreateGoalProgressSnapshotDto {
  @ApiProperty({ description: 'Valor do progresso (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @ApiPropertyOptional({ description: 'Notas sobre o progresso' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para criar um milestone
 */
export class CreateGoalMilestoneDto {
  @ApiProperty({ description: 'Título do milestone' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Descrição do milestone' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Data de vencimento (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;
}

/**
 * DTO para filtrar metas
 */
export class SearchPatientGoalsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID do paciente para filtro' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Status para filtro', enum: GOAL_STATUSES })
  @IsOptional()
  @IsIn(GOAL_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Prioridade para filtro', enum: GOAL_PRIORITIES })
  @IsOptional()
  @IsIn(GOAL_PRIORITIES)
  priority?: string;

  @ApiPropertyOptional({ description: 'Buscar por título' })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO para marcar milestone como concluído
 */
export class CompleteMilestoneDto {
  @ApiProperty({ description: 'ID do milestone' })
  @IsUUID()
  @IsNotEmpty()
  milestoneId: string;
}

/**
 * DTO para completar uma meta
 */
export class CompleteGoalDto {
  @ApiPropertyOptional({ description: 'Notas finais sobre a meta' })
  @IsOptional()
  @IsString()
  notes?: string;
}
