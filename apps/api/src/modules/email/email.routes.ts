import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { emailService } from './email.service.js';
import { env } from '../../config/env.js';

const LEAD_MAGNETS: Record<string, { title: string }> = {
  'checklist-gestao': { title: 'Checklist de Gestão Clínica' },
  'planilha-financeiro': { title: 'Planilha de Controle Financeiro' },
  'ebook-tendencias': { title: 'E-book: Tendências em Fonoaudiologia 2026' },
  'template-relatorio': { title: 'Template de Relatório Clínico' },
};

const emailRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // POST /lead-magnet — public landing page endpoint
  route.post('/lead-magnet', {
    schema: {
      tags: ['email'],
      summary: 'Request a lead magnet download (public)',
      body: z.object({
        email: z.string().email('Email inválido'),
        magnetId: z.string().min(1),
      }),
      response: {
        200: z.object({ success: z.literal(true) }),
        500: z.object({ error: z.string(), message: z.string() }),
      },
    },
  }, async (req, rep) => {
    const { email, magnetId } = req.body;
    req.log.info({ email, magnetId }, 'lead magnet download requested');

    const magnet = LEAD_MAGNETS[magnetId];
    const title = magnet?.title ?? magnetId;

    const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const downloadLink = `${frontendUrl}/materiais/${magnetId}`;

    const result = await emailService.sendLeadMagnetDelivery(email, email, title, downloadLink);
    if (!result.success) {
      req.log.error({ email, magnetId, error: result.error }, 'lead magnet delivery email failed');
      return rep.code(500).send({ error: 'SendFailed', message: 'Falha ao enviar email' });
    }

    return { success: true as const };
  });

  route.post(
    '/test',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['email'],
        summary: 'Enviar e-mail de teste para o usuário logado',
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
          400: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (req, rep) => {
      if (!emailService.isEnabled()) {
        return rep.code(400).send({
          error: 'EmailNotConfigured',
          message: 'Notifica não está configurado (NOTIFICA_API_KEY ausente)',
        });
      }

      const result = await emailService.sendWelcome(
        req.user.email ?? req.user.id,
        req.user.email ?? 'Usuário',
      );

      if (!result.success) {
        return rep.code(400).send({
          error: 'SendFailed',
          message: result.error ?? 'Falha ao enviar e-mail de teste',
        });
      }

      return { success: true, message: 'E-mail de teste enviado com sucesso' };
    },
  );
};

export default emailRoutes;
