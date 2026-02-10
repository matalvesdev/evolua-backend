import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FinancesService } from './finances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTransactionDto, UpdateTransactionDto, SearchTransactionsDto } from './dto';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finances')
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar transação' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.financesService.create(user.clinicId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar transações' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchTransactionsDto) {
    return this.financesService.findAll(user.clinicId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro' })
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financesService.getSummary(user.clinicId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar transação por ID' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financesService.findOne(id, user.clinicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar transação' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.financesService.update(id, user.clinicId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover transação' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financesService.remove(id, user.clinicId);
  }
}
