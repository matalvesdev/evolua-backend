import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Lead DTOs
// ─────────────────────────────────────────────────────────────────────────────

const LEAD_SOURCES = ['tiktok', 'instagram', 'whatsapp', 'referral', 'website', 'other'] as const;
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
const LEAD_POTENTIALS = ['high', 'medium', 'low'] as const;

export class CreateLeadDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiProperty({ enum: LEAD_SOURCES }) @IsIn(LEAD_SOURCES) source: string;
  @ApiPropertyOptional({ enum: LEAD_STATUSES }) @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: LEAD_POTENTIALS }) @IsOptional() @IsIn(LEAD_POTENTIALS) potential?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
}

export class UpdateLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional({ enum: LEAD_SOURCES }) @IsOptional() @IsIn(LEAD_SOURCES) source?: string;
  @ApiPropertyOptional({ enum: LEAD_STATUSES }) @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: LEAD_POTENTIALS }) @IsOptional() @IsIn(LEAD_POTENTIALS) potential?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[];
}

export class SearchLeadsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: LEAD_STATUSES }) @IsOptional() @IsIn(LEAD_STATUSES) status?: string;
  @ApiPropertyOptional({ enum: LEAD_POTENTIALS }) @IsOptional() @IsIn(LEAD_POTENTIALS) potential?: string;
  @ApiPropertyOptional({ enum: LEAD_SOURCES }) @IsOptional() @IsIn(LEAD_SOURCES) source?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up DTOs
// ─────────────────────────────────────────────────────────────────────────────

const FOLLOWUP_CHANNELS = ['whatsapp', 'instagram_dm', 'email', 'phone'] as const;

export class CreateFollowUpDto {
  @ApiProperty({ enum: FOLLOWUP_CHANNELS }) @IsIn(FOLLOWUP_CHANNELS) channel: string;
  @ApiProperty() @IsString() notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ContentPost DTOs
// ─────────────────────────────────────────────────────────────────────────────

const CONTENT_PLATFORMS = ['tiktok', 'instagram'] as const;
const CONTENT_FORMATS = ['reel', 'carousel', 'video', 'story'] as const;
const CONTENT_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;

export class CreateContentPostDto {
  @ApiProperty({ enum: CONTENT_PLATFORMS }) @IsIn(CONTENT_PLATFORMS) platform: string;
  @ApiProperty({ enum: CONTENT_FORMATS }) @IsIn(CONTENT_FORMATS) format: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() hook: string;
  @ApiPropertyOptional() @IsOptional() @IsString() script?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cta?: string;
  @ApiPropertyOptional({ enum: CONTENT_STATUSES }) @IsOptional() @IsIn(CONTENT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
}

export class UpdateContentPostDto {
  @ApiPropertyOptional({ enum: CONTENT_PLATFORMS }) @IsOptional() @IsIn(CONTENT_PLATFORMS) platform?: string;
  @ApiPropertyOptional({ enum: CONTENT_FORMATS }) @IsOptional() @IsIn(CONTENT_FORMATS) format?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hook?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() script?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cta?: string;
  @ApiPropertyOptional({ enum: CONTENT_STATUSES }) @IsOptional() @IsIn(CONTENT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() scheduledAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() publishedAt?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) views?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) engagement?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) clicks?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) leadsCount?: number;
}

export class SearchContentPostsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: CONTENT_PLATFORMS }) @IsOptional() @IsIn(CONTENT_PLATFORMS) platform?: string;
  @ApiPropertyOptional({ enum: CONTENT_STATUSES }) @IsOptional() @IsIn(CONTENT_STATUSES) status?: string;
}
