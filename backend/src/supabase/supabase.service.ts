import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  /** Admin client (service role) — for storage, DB operations, etc. */
  public readonly client: SupabaseClient;

  /** Auth client (anon key) — for token validation via auth.getUser() */
  public readonly authClient: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const anonKey = this.config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    // Auth client always uses anon key (which is always valid)
    this.authClient = createClient(url, anonKey);

    // Admin client uses service role key if available, falls back to anon key
    if (serviceRoleKey && serviceRoleKey !== 'your-service-role-key') {
      this.client = createClient(url, serviceRoleKey);
    } else {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY not configured — using anon key. ' +
        'Storage and admin operations may be limited.',
      );
      this.client = createClient(url, anonKey);
    }
  }

  /** Returns a Supabase client authenticated with the user's access token */
  getClientWithToken(accessToken: string): SupabaseClient {
    return createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );
  }

  /** Access Supabase Storage */
  get storage() {
    return this.client.storage;
  }
}
