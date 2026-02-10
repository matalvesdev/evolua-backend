import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly prisma: PrismaService,
  ) {}

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { clinic: true },
    });
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string; avatarUrl?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName && { fullName: data.fullName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
      },
    });
  }

  async changePassword(accessToken: string, newPassword: string) {
    const { data, error } = await this.supabase
      .getClientWithToken(accessToken)
      .auth.updateUser({ password: newPassword });

    if (error) throw error;
    return data;
  }
}
