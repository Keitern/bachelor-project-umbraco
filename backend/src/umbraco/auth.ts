import { config } from '../config.ts';
import { randomUUID } from 'node:crypto';

const { apiBase, clientId, clientSecret} = config;
// Fetches a client-credentials token from Umbraco and caches it until expiry.
// Code to start from: step 1 in spike/spike.mjs.

/**
 * requestToken()
 *
 * Asks Umbraco for a new token. Not exported: only getToken() uses it.
 *   POST {apiBase}/security/back-office/token
 *   Content-Type: application/x-www-form-urlencoded
 *   Body: grant_type=client_credentials, client_id, client_secret (use URLSearchParams)

 * @returns {Promise<{ access_token: string, expires_in: number }>}
 *          expires_in was 299 seconds in the spike.
 */

const tokenRes = await fetch(`${apiBase}/security/back-office/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
});
if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status} ${await tokenRes.text()}`);
const { access_token: token, expires_in } = await tokenRes.json();
console.log(`1. Token OK (expires in ${expires_in}s)`);



/**
 * getToken()  (exported)
 *
 * Returns a valid token, only fetching a new one when needed:
 *   - If cachedToken exists and Date.now() < expiresAt -> return cachedToken.
 *   - Otherwise call requestToken(), store the token and set
 *     expiresAt = Date.now() + (expires_in - 30) * 1000
 *     (30 seconds margin, so a token never expires in the middle of a request).
 *
 * @returns {Promise<string>}
 */

/**
 * clearToken()  (exported)
 *
 * Resets the cache (cachedToken = null). client.ts calls this when Umbraco answers 401,
 * so the next call fetches a fresh token. Also useful in tests.
 */
