// @ts-check
// Reads and validates environment variables. Every other file imports config from here
// instead of reading process.env directly, so all settings live in one place.

/**
 * requireEnv(name)
 *
 * Reads one environment variable by name and returns its value.
 * Throws a clear error if it is missing or empty, e.g.
 * "Missing environment variable UMBRACO_CLIENT_SECRET (see .env.example)".
 * This makes the server fail at startup instead of later with a confusing 401.
 *
 * @param {string} name   e.g. 'UMBRACO_URL'
 * @returns {string}
 */

/**
 * config (exported object, not a function)
 *
 * Built once when the file is loaded, using requireEnv for required values:
 *   - port            Number(process.env.PORT) or 3001 as default
 *   - umbracoUrl      UMBRACO_URL, without trailing slash
 *   - apiBase         `${umbracoUrl}/umbraco/management/api/v1`
 *   - clientId        UMBRACO_CLIENT_ID
 *   - clientSecret    UMBRACO_CLIENT_SECRET
 *   - allowedOrigin   ALLOWED_ORIGIN (the Word add-in, https://localhost:3000)
 *
 * export const config = { ... };
 */
