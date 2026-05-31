import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface LeadInput {
  nome: string;
  email: string;
  whatsapp: string;
  cidade?: string;
  pacientesMes?: string;
  comoConheceu?: string;
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
          status: 'new',
        }),
      });

      if (!res.ok && res.status !== 409) {
        const text = await res.text();
        logger.warn({ status: res.status, error: text }, 'Failed to save lead to Supabase');
        return { success: false, error: 'Failed to save lead' };
      }

      return { success: true };
    } catch (err) {
      logger.warn({ err }, 'Failed to capture lead');
      return { success: false, error: 'Internal error' };
    }
  }
}

export const leadsService = new LeadsService();
