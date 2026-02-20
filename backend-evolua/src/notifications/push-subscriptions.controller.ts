import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { CreatePushSubscriptionDto } from './dto';

@ApiTags('Assinaturas Push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push-subscriptions')
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar assinatura push' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePushSubscriptionDto,
  ) {
    return this.pushSubscriptionsService.create(user.id, user.clinicId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover assinatura push' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.pushSubscriptionsService.remove(id, user.id, user.clinicId);
  }
}
