// Reads and validates environment variables. 
// Every other file imports config from here instead of reading process.env directly, so all settings live in one place.

// The shape of the config object. Files that import config get autocomplete and type checking.
// `readonly` = cannot be reassigned (checked by TypeScript, Object.freeze does the same at runtime).
export interface Config {
  readonly port: number;
  readonly umbracoUrl: string;
  readonly apiBase: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly allowedOrigin: string;
}


// Reads one environment variable by name and returns its value.
// process.env is a global object, it finds our environment variables from the .env file
// Throws an error if it is missing or empty, e.g.
// process.env[name] is `string | undefined`, so TypeScript forces us to handle undefined.

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing environment variable ${name} (see .env.example)`);
  }
  return value.trim();
}

const umbracoUrl = requireEnv('UMBRACO_URL').replace(/\/+$/, '');

// `: Config` checks the object against the interface: a missing property, a typo or a wrong type throws an error
export const config: Config = Object.freeze({
  port: Number(process.env.PORT ?? 3001),
  umbracoUrl,
  apiBase: `${umbracoUrl}/umbraco/management/api/v1`,
  clientId: requireEnv('UMBRACO_CLIENT_ID'),
  clientSecret: requireEnv('UMBRACO_CLIENT_SECRET'),
  allowedOrigin: requireEnv('ALLOWED_ORIGIN')
});
