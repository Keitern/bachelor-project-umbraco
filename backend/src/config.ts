/**
 * @file Responsible for the backend settings (Umbraco address, API user, port, allowed add-in).
 *
 * Reads and validates environment variables.
 * Every other file imports config from here instead of reading process.env directly, so all
 * settings live in one place.
 */

/**
 * The shape of the config object. Files that import config get autocomplete and type checking.
 * `readonly` = cannot be reassigned (checked by TypeScript, Object.freeze does the same at runtime).
 */
export interface Config {
  /** Port the backend listens on (PORT, default 3001). */
  readonly port: number;
  /** Umbraco's address without a trailing slash, e.g. https://localhost:44363 (UMBRACO_URL). */
  readonly umbracoUrl: string;
  /** Base URL of the Umbraco Management API: umbracoUrl + /umbraco/management/api/v1. */
  readonly apiBase: string;
  /** The API user's client id, starts with umbraco-back-office- (UMBRACO_CLIENT_ID). */
  readonly clientId: string;
  /** The API user's secret (UMBRACO_CLIENT_SECRET). Only lives in .env, never committed. */
  readonly clientSecret: string;
  /** The only browser origin that may call the backend: the Word add-in (ALLOWED_ORIGIN). */
  readonly allowedOrigin: string;
}

/**
 * Reads one environment variable by name and returns its value.
 * Use: building the config object below, for every setting that must be in .env.
 *
 * process.env is a global object, it finds our environment variables from the .env file.
 * process.env[name] is `string | undefined`, so TypeScript forces us to handle undefined.
 *
 * @param name - Name of the environment variable, e.g. 'UMBRACO_URL'.
 * @returns The value, with spaces around it removed.
 * @throws {Error} If the variable is missing or empty.
 */
function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }
  return value.trim();
}

const umbracoUrl = requireEnv('UMBRACO_URL').replace(/\/+$/, '');

/**
 * All backend settings, read once when the backend starts. Frozen, so nothing can change them.
 * `: Config` checks the object against the interface: a missing property, a typo or a wrong
 * type throws an error.
 */
export const config: Config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  umbracoUrl,
  apiBase: `${umbracoUrl}/umbraco/management/api/v1`,
  clientId: requireEnv('UMBRACO_CLIENT_ID'),
  clientSecret: requireEnv('UMBRACO_CLIENT_SECRET'),
  allowedOrigin: requireEnv('ALLOWED_ORIGIN')
});
