// @ts-check
// Fetches a client-credentials token from Umbraco and caches it until expiry.
// Code to start from: step 1 in spike/spike.mjs.

/**
 * Module-level cache (variables, not functions):
 *   let cachedToken = null;   // the access_token string
 *   let expiresAt = 0;        // timestamp in ms (Date.now() based)
 */

/**
 * requestToken()
 *
 * Asks Umbraco for a new token. Not exported: only getToken() uses it.
 *   POST {apiBase}/security/back-office/token
 *   Content-Type: application/x-www-form-urlencoded
 *   Body: grant_type=client_credentials, client_id, client_secret (use URLSearchParams)
 * Throws an error with status + response text if Umbraco does not answer 200
 * (e.g. 401 invalid_client = wrong id/secret or API user not set up).
 *
 * @returns {Promise<{ access_token: string, expires_in: number }>}
 *          expires_in was 299 seconds in the spike.
 */

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
 * Resets the cache (cachedToken = null). client.js calls this when Umbraco answers 401,
 * so the next call fetches a fresh token. Also useful in tests.
 */
