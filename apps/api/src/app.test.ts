import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('application boot', () => {
  it('registers every route before Fastify becomes ready', async () => {
    const app = await buildApp();

    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/api/teleconsulta/sessions' });
    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
