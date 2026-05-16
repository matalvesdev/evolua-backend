import type { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  SignUpSchema,
  SignInSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  AuthResponseSchema,
  AuthSessionSchema,
  ProfileSchema,
  ErrorResponseSchema,
} from '@evolua/contracts';
import { authService } from './auth.service.js';

const authRoutes: FastifyPluginAsync = async (app) => {
  const route = app.withTypeProvider<ZodTypeProvider>();

  // ── Públicos (rate-limit agressivo contra brute force) ──────────────────

  route.post(
    '/signup',
    {
      config: { rateLimit: { max: 3, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Criar conta',
        body: SignUpSchema,
        response: { 201: AuthResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const result = await authService.signUp(req.body);
      return rep.code(201).send(result);
    },
  );

  route.post(
    '/signin',
    {
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Login',
        body: SignInSchema,
        response: { 200: AuthResponseSchema, 401: ErrorResponseSchema },
      },
    },
    async (req) => authService.signIn(req.body),
  );

  route.post(
    '/refresh',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Renovar sess\u00e3o (refresh token)',
        body: z.object({ refreshToken: z.string().min(1) }),
        response: { 200: AuthSessionSchema, 401: ErrorResponseSchema },
      },
    },
    async (req) => authService.refresh(req.body.refreshToken),
  );

  // ── Protegidos ─────────────────────────────────────────────────────────

  route.get(
    '/profile',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Obter perfil do usu\u00e1rio',
        response: { 200: ProfileSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, rep) => {
      const profile = await authService.getProfile(req.user.id);
      if (!profile) {
        return rep.code(404).send({ error: 'NotFound', message: 'Profile not found' });
      }
      return profile;
    },
  );

  route.patch(
    '/profile',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Atualizar perfil',
        body: UpdateProfileSchema,
        response: { 200: ProfileSchema },
      },
    },
    async (req) => authService.updateProfile(req.user.id, req.body),
  );

  route.post(
    '/change-password',
    {
      onRequest: [app.authenticate],
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
      schema: {
        tags: ['auth'],
        summary: 'Alterar senha',
        body: ChangePasswordSchema,
        response: { 204: z.null() },
      },
    },
    async (req, rep) => {
      const auth = req.headers.authorization ?? '';
      const token = auth.replace(/^Bearer\s+/i, '');
      await authService.changePassword(token, req.body.newPassword);
      return rep.code(204).send(null);
    },
  );

  route.post(
    '/signout',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Logout (invalida refresh token no Supabase)',
        response: { 204: z.null() },
      },
    },
    async (req, rep) => {
      const auth = req.headers.authorization ?? '';
      const token = auth.replace(/^Bearer\s+/i, '');
      await authService.signOut(token);
      return rep.code(204).send(null);
    },
  );
};

export default authRoutes;
