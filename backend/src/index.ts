// Responsible for starting the backend: sets up the server, routes and error handling.
//
// Starts the server (CORS for the Word add-in origin).
// This is the entry point: `npm run dev:backend` runs this file.

import express from 'express';
import type { Express, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.ts';
import { UmbracoApiError } from './umbraco/client.ts';
import { metadataRouter } from './routes/metadata.ts';
import { contentRouter } from './routes/content.ts';
// Enable for HTTPS (after yo office has installed office-addin-dev-certs, see startServer):
// import https from 'node:https';
// import { getHttpsServerOptions } from 'office-addin-dev-certs';

// Builds the Express app (middleware + routes + error handler) without starting it.
// Use: startServer() below, and tests (supertest) that need the app without opening a port.
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

  // Must be registered LAST, so it catches errors from everything above.
  app.use(errorHandler);

  return app;
}

// Turns any thrown error into a JSON response, instead of Express' default HTML page.
// Use: Express calls it automatically when a route throws (Express 5 also catches async errors).
// Express only treats a middleware as an error handler when it has exactly 4 parameters,
// so `next` must stay even though it is not used.
// eslint-disable-next-line max-params
function errorHandler(
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

// Starts the app on config.port.
// Use: runs when this file is started directly (npm run dev:backend), not when tests import it.
// HTTP for now; switch to HTTPS once the Word add-in exists (Office requires HTTPS).
function startServer(): void {
  createApp().listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
  });
}

// HTTPS version of startServer. To switch:
//   1. npm install -D office-addin-dev-certs   (root package.json; yo office installs it in
//      word-addin/ too, and the certificate it creates is shared on this machine)
//   2. Enable the two HTTPS imports at the top of this file
//   3. Replace startServer above with this one, and change the call at the bottom to
//      `await startServer();` (it is async because loading the certificate takes a moment)
//   4. In the add-in, call the backend on https://localhost:<PORT> instead of http://
//
// async function startServer(): Promise<void> {
//   // The same trusted localhost certificate the Word add-in's dev server uses
//   const httpsOptions = await getHttpsServerOptions();
//
//   https.createServer(httpsOptions, createApp()).listen(config.port, () => {
//     console.log(`Backend running on https://localhost:${config.port}`);
//   });
// }

// import.meta.main is true only when this file is the one Node was started with.
if (import.meta.main) {
  startServer();
}
