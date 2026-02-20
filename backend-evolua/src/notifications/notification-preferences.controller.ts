import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationPreferencesService } from './notification-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { UpdatePreferencesDto } from './dto';

@ApiTags('Preferências de Notificação')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obter preferências de notificação' })
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.preferencesService.getOrCreate(user.id, user.clinicId);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar preferências de notificação' })
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.update(user.id, user.clinicId, dto);
  }
}
