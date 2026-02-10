import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateReportDto, UpdateReportDto, SearchReportsDto, ReviewReportDto } from './dto';

@ApiTags('Relatórios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar relatório' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.clinicId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar relatórios' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchReportsDto) {
    return this.reportsService.findAll(user.clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar relatório por ID' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.findOne(id, user.clinicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar relatório' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.update(id, user.clinicId, dto);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Enviar para revisão' })
  submitForReview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.submitForReview(id, user.clinicId);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Revisar relatório' })
  review(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: ReviewReportDto) {
    return this.reportsService.review(id, user.clinicId, user.id, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprovar relatório' })
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.approve(id, user.clinicId, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover relatório' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.remove(id, user.clinicId);
  }
}
