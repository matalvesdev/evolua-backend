import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

const APPOINTMENT_TYPES = ['evaluation', 'session', 'follow_up', 'reevaluation', 'parent_meeting', 'report_delivery'] as const;
const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'] as const;

export class CreateAppointmentDto {
  @ApiProperty() @IsString() patientId: string;
  @ApiProperty() @IsString() patientName: string;
  @ApiProperty() @IsString() therapistId: string;
  @ApiProperty() @IsString() therapistName: string;
  @ApiProperty() @IsDateString() dateTime: string;
  @ApiPropertyOptional({ default: 60 }) @IsOptional() @IsInt() @Min(15) duration?: number;
  @ApiProperty() @IsIn(APPOINTMENT_TYPES) type: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() dateTime?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(15) duration?: number;
  @ApiPropertyOptional() @IsOptional() @IsIn(APPOINTMENT_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sessionNotes?: string;
}

export class CancelAppointmentDto {
  @ApiProperty() @IsString() reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty() @IsString() cancelledBy: string;
}

export class SearchAppointmentsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() therapistId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(APPOINTMENT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(APPOINTMENT_TYPES) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}
