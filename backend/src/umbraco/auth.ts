/**
 * @file Responsible for logging the backend in to Umbraco as the API user (getting and caching tokens).
 *
 * Gets a token from the Management API (apiBase = the Management API) and caches it,
 * so the backend stays logged in as the API user.
 */
import { config } from '../config.ts';

const { apiBase, clientId, clientSecret } = config;

/** The JSON Umbraco sends back from the token endpoint. */
interface TokenResponse {
  /** The token itself, sent as "Authorization: Bearer ..." on every API call. */
  access_token: string;
  /** How long the token lives, in seconds (299 in the spike). */
  expires_in: number;
}

//=============================== Request a new token =====================================
/**
 * Asks Umbraco for a new token (client credentials login). Not exported: only getToken() uses it.
 * Use: getToken(), when there is no cached token or it is about to expire.
 *
 * @returns Umbraco's token response: the token and how many seconds it lives.
 * @throws {Error} If Umbraco does not answer 2xx (e.g. wrong client id or secret).
 */
async function requestToken(): Promise<TokenResponse> {
  const tokenRes = await fetch(`${apiBase}/security/back-office/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  if (!tokenRes.ok) {
    throw new Error(`Token failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  return (await tokenRes.json()) as TokenResponse;
}
//===========================================================================================

//=============================== Cache the token ===========================================
// Cache: kept between calls because these live at module level (outside any function).
let cachedToken: string | null = null; // the access_token, null = no token yet
let expiresAt = 0; // when the token expires, in ms since 1970 (same unit as Date.now())
/** Renew the token this many seconds BEFORE it really expires. */
const EXPIRY_MARGIN_SECONDS = 30;

/**
 * Returns a valid token, only asking Umbraco for a new one when needed.
 * Use: client.ts, before every call to the Management API.
 *
 * First call: cachedToken = null, expiresAt = 0 -> requestToken() is called, the token and its
 * expiry time are stored, and the token is returned.
 * Later calls: the cached token is returned until it is about to expire.
 *
 * @returns The access token.
 * @throws {Error} If a new token is needed and Umbraco refuses it (see requestToken).
 */
export async function getToken(): Promise<string> {
  if (cachedToken !== null && Date.now() < expiresAt) {
    return cachedToken;
  }

  const { access_token, expires_in } = await requestToken();

  cachedToken = access_token;
  expiresAt = Date.now() + (expires_in - EXPIRY_MARGIN_SECONDS) * 1000;

  return cachedToken;
}
//===============================================================================================

//=============================== Clear the token cache ========================================
/**
 * Empties the cache, so the next getToken() call asks Umbraco for a fresh token.
 * Use: client.ts, when Umbraco answers 401 (the token was rejected), before trying again.
 */
export function clearToken(): void {
  cachedToken = null;
  expiresAt = 0;
}
//===============================================================================================
