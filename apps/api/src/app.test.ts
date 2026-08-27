import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

describe('application boot', () => {
  it('registers every route before Fastify becomes ready', async () => {
    const app = await buildApp();

    await app.ready();
    const versionResponse = await app.inject({ method: 'GET', url: '/version' });
    expect(versionResponse.statusCode).toBe(200);
    expect(versionResponse.json()).toMatchObject({
      service: 'evolua-api',
      version: '2.0.1',
      environment: 'test',
    });

    const response = await app.inject({ method: 'GET', url: '/api/teleconsulta/sessions' });
    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
