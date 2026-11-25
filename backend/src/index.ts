/**
 * Responsible for starting the backend: sets up the server, routes and error handling.
 *
 * Starts the server (CORS for the Word add-in origin).
 * This is the entry point: `npm run dev:backend` runs this file.
 *
 * @module
 */

import express from 'express';
import type { Express, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.ts';
import { UmbracoApiError } from './umbraco/client.ts';
import { metadataRouter } from './routes/metadata.ts';
import { contentRouter } from './routes/content.ts';
import https from 'node:https';
import { getHttpsServerOptions } from 'office-addin-dev-certs';

/**
 * Builds the Express app (middleware + routes + error handler) without starting it.
 * Use: startServer() below, and tests that start the app on a random port.
 *
 * @returns The configured Express app.
 */
export function createApp(): Express {
  const app = express();

  // Only the Word add-in's origin may call the backend from a browser.
  app.use(cors({ origin: config.allowedOrigin }));
  // Reads JSON request bodies into req.body. Word HTML for several fields can be large.
  app.use(express.json({ limit: '5mb' }));
  // Quick "is the backend running?" check.
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', metadataRouter); // dropdown data
  app.use('/api/content', contentRouter); // save routes

  app.use(errorHandler);

  return app;
}

/**
 * Turns any thrown error into a JSON response, instead of Express' default HTML page.
 * Use: Express calls it automatically when a route throws an error.
 *
 * Express only treats a middleware as an error handler when it has exactly 4 parameters,
 * so `next` is there even though it isn't used.
 *
 * @param err - Whatever was thrown: UmbracoApiError, an httpError, or anything else.
 * @param req - The request that failed (not used).
 * @param res - Used to send the error response.
 * @param next - Not used, but required for Express to see this as an error handler.
 */
// eslint-disable-next-line max-params
export function errorHandler(
  err: unknown,
  req: express.Request,
  res: express.Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  console.error(err);

  // Umbraco said no (e.g. 400 validation, 404 not found): pass on its status and explanation.
  if (err instanceof UmbracoApiError) {
    res.status(err.status).json({ error: err.message, details: err.responseText });
    return;
  }
  // Our own errors with a status (e.g. 400 from validation), or Express' own (e.g. invalid JSON).
  if (err instanceof Error && 'status' in err && typeof err.status === 'number') {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Anything else is a bug on our side. Don't leak details to the add-in.
  res.status(500).json({ error: 'Internal server error' });
}

/**
 * Starts the app over HTTPS on config.port.
 * Use: once, when this file is run with `npm run dev:backend` / `npm run start:backend`.
 *
 * HTTPS because the Word add-in runs on https://localhost:3000, and a browser blocks calls
 * from an HTTPS page to an HTTP backend. Async because loading the certificate takes a moment.
 */
export async function startServer(): Promise<void> {
  // Same localhost certificate the Word add-in's dev server uses
  // (created by office-addin-dev-certs the first time `npm start` runs in the add-in).
  const httpsOptions = await getHttpsServerOptions();

  https.createServer(httpsOptions, createApp()).listen(config.port, () => {
    console.log(`Backend running on https://localhost:${config.port}`);
  });
}

// import.meta.main is true only when this file is the one Node was started with.
if (import.meta.main) {
  await startServer();
}
