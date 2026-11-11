// @ts-check
// Starts the server (HTTPS + CORS for the Word add-in origin).
// This is the entry point: `npm run dev` runs this file.

/**
 * createApp()
 *
 * Builds and returns the Express app, without starting it:
 *   1. app.use(cors({ origin: config.allowedOrigin }))  - only the add-in may call us
 *   2. app.use(express.json({ limit: '5mb' }))         - Word HTML can be large
 *   3. app.get('/api/health', ...)                     - returns { ok: true }, handy for testing
 *   4. app.use('/api/content', contentRouter)          - routes from routes/content.js
 *   5. errorHandler (see below) as the LAST middleware
 *
 * Keeping this separate from startServer() lets tests use the app (e.g. with supertest)
 * without opening a port. Can later be moved to its own app.js.
 *
 * @returns {import('express').Express}
 */

/**
 * errorHandler(err, req, res, next)
 *
 * Express error middleware (must have exactly 4 parameters, so Express recognises it;
 * add an eslint-disable comment for max-params on this one).
 * Catches every error thrown in routes/services and answers with JSON instead of HTML:
 *   - status: err.status or 500
 *   - body:   { error: err.message }
 * Also logs the error with console.error so you can see it in the terminal.
 */

/**
 * startServer()
 *
 * Starts the app over HTTPS on config.port.
 * Office only loads add-ins over HTTPS, and the browser blocks calls from an HTTPS page
 * to an HTTP backend, so the backend must use HTTPS too.
 *   1. Get a localhost certificate. Easiest: reuse the one from office-addin-dev-certs
 *      (installed by yo office) via its getHttpsServerOptions() function.
 *   2. https.createServer(options, createApp()).listen(config.port)
 *   3. console.log(`Backend running on https://localhost:${config.port}`)
 *
 * Called once at the bottom of this file: startServer();
 */
