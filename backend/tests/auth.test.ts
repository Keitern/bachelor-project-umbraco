// Unit tests for src/umbraco/auth.ts
// No real Umbraco: `fetch` is replaced by a fake (vi.stubGlobal), and config.ts is replaced
// by fixed test values (vi.mock), so no .env file is needed.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/config.ts', () => {
  return {
    config: {
      apiBase: 'https://umbraco.test/umbraco/management/api/v1',
      clientId: 'umbraco-back-office-test',
      clientSecret: 'test-secret'
    }
  };
});

// A fake fetch. Each test decides what it answers.
const fetchMock = vi.fn();

// auth.ts keeps the token in a module-level variable. To get a clean cache in every test,
// we clear Vitest's module cache and import auth.ts again (the mocks stay in place).
async function loadAuth() {
  return await import('../src/umbraco/auth.ts');
}

// A fresh Response each time (a Response body can only be read once)
function answerWithToken(accessToken = 'abc', expiresIn = 299): void {
  fetchMock.mockImplementation(async () => {
    return new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn }), {
      status: 200
    });
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('getToken', () => {
  it('asks Umbraco for a token on the first call, sending the credentials form-encoded', async () => {
    answerWithToken('abc');
    const { getToken } = await loadAuth();

    const token = await getToken();

    expect(token).toBe('abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://umbraco.test/umbraco/management/api/v1/security/back-office/token');
    expect(init.method).toBe('POST');

    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('umbraco-back-office-test');
    expect(body.get('client_secret')).toBe('test-secret');
  });

  it('returns the cached token on the second call (fetch called only once)', async () => {
    answerWithToken('abc');
    const { getToken } = await loadAuth();

    const first = await getToken();
    const second = await getToken();

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('renews 30 seconds before expires_in runs out', async () => {
    vi.useFakeTimers();
    answerWithToken('abc', 299); // should be renewed after 299 - 30 = 269 seconds
    const { getToken } = await loadAuth();

    await getToken();

    vi.advanceTimersByTime(268_000); // 1 second before the renewal point: still cached
    await getToken();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000); // now past the renewal point: a new token is fetched
    await getToken();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when Umbraco answers with an error status (e.g. 401 invalid_client)', async () => {
    fetchMock.mockImplementation(async () => {
      return new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 });
    });
    const { getToken } = await loadAuth();

    await expect(getToken()).rejects.toThrow();
  });
});

describe('clearToken', () => {
  it('makes the next getToken call fetch a new token', async () => {
    answerWithToken('abc');
    const { getToken, clearToken } = await loadAuth();

    await getToken();
    clearToken();
    await getToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
