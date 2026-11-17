// Responsible for logging the backend in to Umbraco as the API user (getting and caching tokens).
//
// Henter token fra management API (apibase = management API) og cacher den, 
// hjælper backend med at med at forblive logget ind som API user
import { config } from '../config.ts';

const { apiBase, clientId, clientSecret } = config;

// The JSON Umbraco sends back from the token endpoint
interface TokenResponse {
  access_token: string;
  expires_in: number; // seconds (299 in the spike)
}


//=============================== Request a new token =====================================
 // Asks Umbraco for a new token. Not exported: only getToken() uses it.
 // Throws error Umbraco does not answer 2xx
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
const EXPIRY_MARGIN_SECONDS = 30; //Renew the token this many seconds BEFORE it really expires


 // Returns a valid token, only asking Umbraco for a new one when needed
 // First call: cachedToken = null, expiresAt = 0 -> requestToken() called
 // Second call: requestToken(), store the token and its expiry time, return it 
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
// Empties the cache, so the next getToken() call asks Umbraco for a fresh token. 
export function clearToken(): void {
  cachedToken = null;
  expiresAt = 0;
}
//===============================================================================================