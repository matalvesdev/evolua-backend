import { IsString, IsOptional, IsDateString, IsNumber, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTransactionDto {
  @ApiProperty() @IsIn(['income', 'expense']) type: string;
  @ApiProperty() @IsString() category: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsNumber() amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending', 'completed', 'cancelled', 'overdue']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SearchTransactionsDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['income', 'expense']) type?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending', 'completed', 'cancelled', 'overdue']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() patientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
}
