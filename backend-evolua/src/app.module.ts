import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ReportsModule } from './reports/reports.module';
import { TasksModule } from './tasks/tasks.module';
import { FinancesModule } from './finances/finances.module';
import { AudioModule } from './audio/audio.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { MessagesModule } from './messages/messages.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    ReportsModule,
    TasksModule,
    FinancesModule,
    AudioModule,
    AiChatModule,
    MessagesModule,
    HealthModule,
  ],
})
export class AppModule {}
