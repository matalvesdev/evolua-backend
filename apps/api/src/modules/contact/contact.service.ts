import { emailClient } from '../../lib/email-client.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface ContactFormData {
  nome: string;
  email: string;
  whatsapp?: string | null;
  assunto: string;
  mensagem: string;
}

export class ContactService {
  async notifyAdmin(data: ContactFormData): Promise<{ success: boolean; error?: string }> {
    const adminEmail = env.CONTACT_NOTIFICATION_EMAIL;
    if (!adminEmail) {
      logger.warn('contact notification skipped — CONTACT_NOTIFICATION_EMAIL is not configured');
      return { success: true };
    }

    const html = `
      <h2 style="margin:0 0 16px;font-size:20px;color:#1E1E2C">Novo contato pelo site</h2>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#f8f8ff;border-radius:8px;padding:16px 20px;width:100%">
        <tr><td style="font-size:15px;color:#1E1E2C">
          <strong>Nome:</strong> ${escapeHtml(data.nome)}<br/>
          <strong>Email:</strong> ${escapeHtml(data.email)}<br/>
          ${data.whatsapp ? `<strong>WhatsApp:</strong> ${escapeHtml(data.whatsapp)}<br/>` : ''}
          <strong>Assunto:</strong> ${escapeHtml(data.assunto)}<br/>
          <strong>Mensagem:</strong><br/>${escapeHtml(data.mensagem).replace(/\n/g, '<br/>')}
        </td></tr>
      </table>
    `;

    const text = `Novo contato pelo site\n\nNome: ${data.nome}\nEmail: ${data.email}\n${data.whatsapp ? `WhatsApp: ${data.whatsapp}\n` : ''}Assunto: ${data.assunto}\nMensagem: ${data.mensagem}`;

    return emailClient.sendEmail({
      to: adminEmail,
      subject: `Novo contato: ${data.assunto} — ${data.nome}`,
      html,
      text,
    });
  }
}

export const contactService = new ContactService();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
