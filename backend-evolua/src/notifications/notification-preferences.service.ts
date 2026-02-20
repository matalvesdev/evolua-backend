import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePreferencesDto } from './dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string, clinicId: string) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_clinicId: { userId, clinicId },
      },
      create: {
        userId,
        clinicId,
        emailEnabled: true,
        pushEnabled: true,
        appointmentRemindersEnabled: true,
        reportNotificationsEnabled: true,
      },
      update: {},
    });
  }

  async update(userId: string, clinicId: string, dto: UpdatePreferencesDto) {
    // Ensure the record exists first
    await this.getOrCreate(userId, clinicId);

    return this.prisma.notificationPreference.update({
      where: {
        userId_clinicId: { userId, clinicId },
      },
      data: dto,
    });
  }
}
