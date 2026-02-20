import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePushSubscriptionDto } from './dto';

@Injectable()
export class PushSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, clinicId: string, dto: CreatePushSubscriptionDto) {
    return this.prisma.pushSubscription.create({
      data: {
        userId,
        clinicId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
      },
    });
  }

  async remove(id: string, userId: string, clinicId: string): Promise<void> {
    const subscription = await this.prisma.pushSubscription.findFirst({
      where: { id, userId, clinicId },
    });

    if (!subscription) {
      throw new NotFoundException('Push subscription not found');
    }

    await this.prisma.pushSubscription.delete({ where: { id } });
  }

  async findByUser(userId: string, clinicId: string) {
    return this.prisma.pushSubscription.findMany({
      where: { userId, clinicId },
    });
  }

  async removeByEndpoint(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }
}
