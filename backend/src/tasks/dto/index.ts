import { IsString, IsOptional, IsDateString, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTaskDto {
  @ApiProperty() @IsString() title: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['task', 'reminder']) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['low', 'medium', 'high']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending', 'completed', 'cancelled']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['low', 'medium', 'high']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() completed?: boolean;
}

export class SearchTasksDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['task', 'reminder']) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending', 'completed', 'cancelled']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['low', 'medium', 'high']) priority?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
}
