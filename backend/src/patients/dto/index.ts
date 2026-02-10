import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

const PATIENT_STATUSES = ['active', 'inactive', 'discharged', 'on-hold'] as const;

export class AddressDto {
  @ApiPropertyOptional() @IsOptional() @IsString() street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() number?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() complement?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() neighborhood?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() zipCode?: string;
}

export class MedicalHistoryDto {
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) diagnosis?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreatePatientDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianRelationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() therapistId?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: MedicalHistoryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHistoryDto)
  medicalHistory?: MedicalHistoryDto;
}

export class UpdatePatientDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cpf?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(PATIENT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guardianRelationship?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() therapistId?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: MedicalHistoryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MedicalHistoryDto)
  medicalHistory?: MedicalHistoryDto;
}

export class SearchPatientsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(PATIENT_STATUSES) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() therapistId?: string;
}

export class ChangeStatusDto {
  @ApiProperty() @IsIn(PATIENT_STATUSES) status: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}
