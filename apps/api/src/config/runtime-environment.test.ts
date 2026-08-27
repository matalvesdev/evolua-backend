import { describe, expect, it } from 'vitest';
import { resolveDefaultNodeEnvironment } from './runtime-environment.js';

describe('resolveDefaultNodeEnvironment', () => {
  it('fails closed to production on Render', () => {
    expect(resolveDefaultNodeEnvironment('true')).toBe('production');
  });

  it('keeps local execution in development by default', () => {
    expect(resolveDefaultNodeEnvironment(undefined)).toBe('development');
    expect(resolveDefaultNodeEnvironment('false')).toBe('development');
  });
});
