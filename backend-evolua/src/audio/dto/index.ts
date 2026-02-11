import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateAudioSessionDto {
  @ApiProperty() @IsString() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
  @ApiProperty() @IsString() audioUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) audioDuration?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) fileSize?: number;
}

export class TranscribeAudioDto {
  @ApiProperty() @IsString() audioUrl: string;
  @ApiProperty() @IsString() audioSessionId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
}

export class SearchAudioSessionsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transcriptionStatus?: string;
}
