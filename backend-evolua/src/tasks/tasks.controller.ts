import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto, SearchTasksDto } from './dto';

@ApiTags('Tarefas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Criar tarefa' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.clinicId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tarefas' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: SearchTasksDto) {
    return this.tasksService.findAll(user.clinicId, user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tarefa por ID' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.findOne(id, user.clinicId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tarefa' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, user.clinicId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover tarefa' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tasksService.remove(id, user.clinicId);
  }
}
