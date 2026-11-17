// Unit tests for src/umbraco/auth.ts
// No real Umbraco: `fetch` is replaced by a fake (vi.stubGlobal), and config.ts is replaced
// by fixed test values (vi.mock), so no .env file is needed.
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/config.ts', () => {
  return {
    config: {
      apiBase: 'https://umbraco.test/umbraco/management/api/v1',
      clientId: 'umbraco-back-office-test',
      clientSecret: 'test-secret'
    }
  };
});

// A fake fetch. Each test decides what it answers, e.g.
//   fetchMock.mockResolvedValue(new Response(JSON.stringify({ access_token: 'abc', expires_in: 299 })))
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('getToken', () => {
  it.todo('asks Umbraco for a token on the first call');
  it.todo(
    'sends grant_type, client_id and client_secret form-encoded to /security/back-office/token'
  );
  it.todo('returns the cached token on the second call (fetch called only once)');
  it.todo('fetches a new token after it expires (use vi.useFakeTimers + vi.advanceTimersByTime)');
  it.todo('renews 30 seconds before expires_in runs out');
  it.todo('throws when Umbraco answers with an error status (e.g. 401 invalid_client)');
});

describe('clearToken', () => {
  it.todo('makes the next getToken call fetch a new token');
});
