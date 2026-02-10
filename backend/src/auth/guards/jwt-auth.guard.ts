import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não fornecido');
    }

    // Validate token via Supabase Auth API — no local JWT secret needed
    const { data, error } = await this.supabase.authClient.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const supabaseUser = data.user;

    // Look up or auto-provision user in Prisma DB
    let user = await this.prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { id: true, email: true, clinicId: true, role: true },
    });

    if (!user) {
      this.logger.log(`Auto-provisioning user ${supabaseUser.id} (${supabaseUser.email})`);
      try {
        // Create a default clinic for the new user
        const clinic = await this.prisma.clinic.create({
          data: {
            name: `Consultório de ${supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0]}`,
          },
        });

        user = await this.prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email!,
            fullName:
              supabaseUser.user_metadata?.full_name ||
              supabaseUser.email!.split('@')[0],
            role: 'therapist',
            clinicId: clinic.id,
          },
          select: { id: true, email: true, clinicId: true, role: true },
        });
      } catch (err) {
        this.logger.error(`Failed to auto-provision user: ${err}`);
        throw new UnauthorizedException('Não foi possível provisionar o usuário');
      }
    }

    // If user exists but has no clinic, create one
    if (!user.clinicId) {
      try {
        const clinic = await this.prisma.clinic.create({
          data: { name: `Consultório de ${user.email.split('@')[0]}` },
        });
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { clinicId: clinic.id },
          select: { id: true, email: true, clinicId: true, role: true },
        });
      } catch (err) {
        this.logger.error(`Failed to create clinic for user: ${err}`);
      }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      clinicId: user.clinicId ?? '',
      role: user.role,
    };
    request.user = authUser;

    return true;
  }

  private extractToken(request: { headers: { authorization?: string } }): string | null {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }
}
