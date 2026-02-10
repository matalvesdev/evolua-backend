import { IsString, IsOptional, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

const REPORT_TYPES = ['evaluation', 'evolution', 'progress', 'discharge', 'monthly', 'school', 'medical', 'custom'] as const;
const REPORT_STATUSES = ['draft', 'pending_review', 'reviewed', 'approved', 'sent', 'archived'] as const;

export class CreateReportDto {
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsIn(REPORT_TYPES) type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() periodStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() periodEndDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
}

export class UpdateReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() content?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() periodStartDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() periodEndDate?: string;
}

export class SearchReportsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Busca por título ou nome do paciente' })
  @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() therapistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(REPORT_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(REPORT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}

export class ReviewReportDto {
  @ApiProperty() @IsString() reviewNotes: string;
}
