import { afterEach, describe, expect, it } from 'vitest';
import { getRuntimeInfo } from './runtime-info.js';

const originalRenderCommit = process.env.RENDER_GIT_COMMIT;

afterEach(() => {
  if (originalRenderCommit === undefined) {
    delete process.env.RENDER_GIT_COMMIT;
  } else {
    process.env.RENDER_GIT_COMMIT = originalRenderCommit;
  }
});

describe('getRuntimeInfo', () => {
  it('exposes only the abbreviated Render commit and public runtime metadata', () => {
    process.env.RENDER_GIT_COMMIT = '1234567890abcdef1234567890abcdef12345678';

    expect(getRuntimeInfo('staging')).toEqual({
      service: 'evolua-api',
      version: '2.0.2',
      commit: '1234567890ab',
      environment: 'staging',
    });
  });

  it('uses an explicit non-secret fallback outside Render', () => {
    delete process.env.RENDER_GIT_COMMIT;

    expect(getRuntimeInfo('test').commit).toBe('unknown');
  });
});
