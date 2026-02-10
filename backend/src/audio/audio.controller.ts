import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AudioService } from './audio.service';
import { CreateAudioSessionDto, TranscribeAudioDto, SearchAudioSessionsDto } from './dto';

@ApiTags('Audio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post('sessions')
  create(
    @CurrentUser() user: { id: string; clinicId: string },
    @Body() dto: CreateAudioSessionDto,
  ) {
    return this.audioService.create(user.clinicId, user.id, dto);
  }

  @Get('sessions')
  findAll(
    @CurrentUser() user: { id: string; clinicId: string },
    @Query() query: SearchAudioSessionsDto,
  ) {
    return this.audioService.findAll(user.clinicId, query);
  }

  @Get('sessions/:id')
  findOne(
    @CurrentUser() user: { id: string; clinicId: string },
    @Param('id') id: string,
  ) {
    return this.audioService.findOne(id, user.clinicId);
  }

  @Get('sessions/:id/transcription')
  getTranscription(
    @CurrentUser() user: { id: string; clinicId: string },
    @Param('id') id: string,
  ) {
    return this.audioService.getTranscription(id, user.clinicId);
  }

  @Post('transcribe')
  transcribe(
    @CurrentUser() user: { id: string; clinicId: string },
    @Body() dto: TranscribeAudioDto,
  ) {
    return this.audioService.transcribe(user.clinicId, dto);
  }

  @Delete('sessions/:id')
  remove(
    @CurrentUser() user: { id: string; clinicId: string },
    @Param('id') id: string,
  ) {
    return this.audioService.remove(id, user.clinicId);
  }
}
