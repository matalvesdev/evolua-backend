import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface LeadInput {
  nome: string;
  email: string;
  whatsapp: string;
  cidade?: string;
  pacientesMes?: string;
  comoConheceu?: string;
  magnetId?: string;
}

export class LeadsService {
  async capture(data: LeadInput): Promise<{ success: boolean; error?: string }> {
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          name: data.nome,
          email: data.email,
          phone: data.whatsapp,
          city: data.cidade ?? null,
          monthly_patients: data.pacientesMes ?? null,
          source: data.comoConheceu ?? 'landing',
          magnet_id: data.magnetId ?? null,
          status: 'new',
        }),
      });

      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        logger.warn({ status: res.status, error: text }, 'Failed to save lead to Supabase');
        return { success: false, error: 'Failed to save lead' };
      }

      // Auto-disparar email de entrega se for lead magnet
      if (data.magnetId && data.email) {
        this.sendMagnetEmail(data.email, data.nome, data.magnetId).catch(() =>
          logger.warn({ magnetId: data.magnetId }, 'Failed to send magnet email'),
        );
      }

      return { success: true };
    } catch (err) {
      logger.warn({ err }, 'Failed to capture lead');
      return { success: false, error: 'Internal error' };
    }
  }

  private async sendMagnetEmail(email: string, nome: string, magnetId: string): Promise<void> {
    const apiBase = `http://localhost:${env.PORT ?? 3000}`;
    const res = await fetch(`${apiBase}/api/email/lead-magnet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, magnetId, nome }),
    });

    if (!res.ok) {
      logger.warn({ magnetId, status: res.status }, 'sendMagnetEmail: internal request failed');
    }
  }
}

export const leadsService = new LeadsService();
