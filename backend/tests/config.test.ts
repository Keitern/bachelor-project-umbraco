import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const VALID_ENV = {
  UMBRACO_URL: 'https://localhost:44363',
  UMBRACO_CLIENT_ID: 'umbraco-back-office-test',
  UMBRACO_CLIENT_SECRET: 'test-secret',
  ALLOWED_ORIGIN: 'https://localhost:3000'
};

async function loadConfig() {
  const { config } = await import('../src/config.ts');
  return config;
}

beforeEach(() => {
  vi.resetModules();
  for (const [name, value] of Object.entries(VALID_ENV)) {
    vi.stubEnv(name, value);
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('config', () => {
  it('reads all values from the environment', async () => {
    const config = await loadConfig();

    expect(config.umbracoUrl).toBe('https://localhost:44363');
    expect(config.clientId).toBe('umbraco-back-office-test');
    expect(config.clientSecret).toBe('test-secret');
    expect(config.allowedOrigin).toBe('https://localhost:3000');
  });

  it('builds apiBase from UMBRACO_URL and removes a trailing slash', async () => {
    vi.stubEnv('UMBRACO_URL', 'https://localhost:44363/');

    const config = await loadConfig();

    expect(config.umbracoUrl).toBe('https://localhost:44363');
    expect(config.apiBase).toBe('https://localhost:44363/umbraco/management/api/v1');
    expect(config.apiBase).not.toContain('//umbraco');
  });

  it('uses port 3001 when PORT is not set, and turns PORT into a number', async () => {
    vi.stubEnv('PORT', undefined);
    expect((await loadConfig()).port).toBe(3001);

    vi.resetModules();
    vi.stubEnv('PORT', '4000');
    expect((await loadConfig()).port).toBe(4000);
  });

  it('trims spaces around values', async () => {
    vi.stubEnv('UMBRACO_CLIENT_SECRET', '  test-secret  ');

    const config = await loadConfig();

    expect(config.clientSecret).toBe('test-secret');
  });
});
