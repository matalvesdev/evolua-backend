import { describe, expect, it } from 'vitest';
import { resolveRuntimeNodeEnvironment } from './runtime-environment.js';

describe('resolveRuntimeNodeEnvironment', () => {
  it('fails closed to production on Render when unset or misconfigured as development', () => {
    expect(resolveRuntimeNodeEnvironment(undefined, 'true')).toBe('production');
    expect(resolveRuntimeNodeEnvironment('development', 'true')).toBe('production');
  });

  it('preserves explicit staging and test environments', () => {
    expect(resolveRuntimeNodeEnvironment('staging', 'true')).toBe('staging');
    expect(resolveRuntimeNodeEnvironment('test', 'true')).toBe('test');
  });

  it('keeps local execution in development by default', () => {
    expect(resolveRuntimeNodeEnvironment(undefined, undefined)).toBe('development');
    expect(resolveRuntimeNodeEnvironment('development', 'false')).toBe('development');
  });
});
