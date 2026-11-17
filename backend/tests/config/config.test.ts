// Unit tests for src/config.ts
// config.ts reads process.env THE MOMENT it is imported, so each test:
//   1. sets the environment variables it wants (vi.stubEnv)
//   2. clears Vitest's module cache (vi.resetModules), so the next import runs config.ts again
//   3. imports config.ts with `await import(...)`
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

// Valid values for every required variable. Tests change or remove one at a time.
const VALID_ENV = {
  UMBRACO_URL: 'https://localhost:44363',
  UMBRACO_CLIENT_ID: 'umbraco-back-office-test',
  UMBRACO_CLIENT_SECRET: 'test-secret',
  ALLOWED_ORIGIN: 'https://localhost:3000'
};

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
  it.todo('reads all values from the environment');
  it.todo('builds apiBase from UMBRACO_URL');
  it.todo('removes a trailing slash from UMBRACO_URL');
  it.todo('uses port 3001 when PORT is not set');
  it.todo('turns PORT into a number');
  it.todo('is frozen (cannot be changed)');
});

describe('requireEnv (through config)', () => {
  it.todo('throws when a required variable is missing');
  it.todo('throws when a required variable is empty or only spaces');
  it.todo('the error message names the missing variable');
  it.todo('trims spaces around values');
});
