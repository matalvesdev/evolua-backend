import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { NotificaService } from './notifica.service';

@ApiTags('Notifica')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifica')
export class NotificaConfigController {
  constructor(private readonly notificaService: NotificaService) {}

  @Get('config')
  @ApiOperation({ summary: 'Obter configuração Notifica para o frontend' })
  getConfig(
    @CurrentUser() user: AuthUser,
  ): { publishableKey: string; subscriberId: string } {
    return {
      publishableKey: this.notificaService.getPublishableKey(),
      subscriberId: user.id,
    };
  }
}
