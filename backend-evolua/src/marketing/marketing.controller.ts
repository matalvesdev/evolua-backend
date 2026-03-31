import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateLeadDto,
  UpdateLeadDto,
  SearchLeadsDto,
  CreateFollowUpDto,
  CreateContentPostDto,
  UpdateContentPostDto,
  SearchContentPostsDto,
} from './dto';

@ApiTags('Marketing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Leads
  // ─────────────────────────────────────────────────────────────────────────

  @Post('leads')
  @ApiOperation({ summary: 'Criar lead' })
  createLead(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.marketingService.createLead(user.clinicId, dto);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Listar leads' })
  findAllLeads(@CurrentUser() user: AuthUser, @Query() query: SearchLeadsDto) {
    return this.marketingService.findAllLeads(user.clinicId, query);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Buscar lead por ID' })
  findOneLead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketingService.findOneLead(id, user.clinicId);
  }

  @Patch('leads/:id')
  @ApiOperation({ summary: 'Atualizar lead' })
  updateLead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.marketingService.updateLead(id, user.clinicId, dto);
  }

  @Delete('leads/:id')
  @ApiOperation({ summary: 'Remover lead' })
  removeLead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketingService.removeLead(id, user.clinicId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Follow-ups
  // ─────────────────────────────────────────────────────────────────────────

  @Post('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Registrar follow-up do lead' })
  createFollowUp(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateFollowUpDto,
  ) {
    return this.marketingService.createFollowUp(id, user.clinicId, dto);
  }

  @Get('leads/:id/follow-ups')
  @ApiOperation({ summary: 'Listar follow-ups do lead' })
  findFollowUps(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketingService.findFollowUps(id, user.clinicId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Content Posts
  // ─────────────────────────────────────────────────────────────────────────

  @Post('content')
  @ApiOperation({ summary: 'Criar conteúdo' })
  createContentPost(@CurrentUser() user: AuthUser, @Body() dto: CreateContentPostDto) {
    return this.marketingService.createContentPost(user.clinicId, dto);
  }

  @Get('content')
  @ApiOperation({ summary: 'Listar conteúdos' })
  findAllContentPosts(@CurrentUser() user: AuthUser, @Query() query: SearchContentPostsDto) {
    return this.marketingService.findAllContentPosts(user.clinicId, query);
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Buscar conteúdo por ID' })
  findOneContentPost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketingService.findOneContentPost(id, user.clinicId);
  }

  @Patch('content/:id')
  @ApiOperation({ summary: 'Atualizar conteúdo' })
  updateContentPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateContentPostDto,
  ) {
    return this.marketingService.updateContentPost(id, user.clinicId, dto);
  }

  @Delete('content/:id')
  @ApiOperation({ summary: 'Remover conteúdo' })
  removeContentPost(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketingService.removeContentPost(id, user.clinicId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Analytics
  // ─────────────────────────────────────────────────────────────────────────

  @Get('analytics')
  @ApiOperation({ summary: 'Métricas de marketing' })
  getAnalytics(@CurrentUser() user: AuthUser) {
    return this.marketingService.getAnalytics(user.clinicId);
  }
}
