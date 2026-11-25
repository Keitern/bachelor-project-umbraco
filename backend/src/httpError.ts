/**
 * Responsible for errors that should reach the add-in with a status, e.g. 400 for bad input.
 *
 * @module
 */

/**
 * Creates an error with an HTTP status. errorHandler (index.ts) turns it into a response with
 * that status and { error: message }.
 * Use: routes and mapping throw these for bad input, e.g. httpError(400, 'fields is required').
 *
 * @param status - HTTP status code to answer with, e.g. 400 or 404.
 * @param message - Text the add-in shows to the user.
 * @returns An Error with an extra `status` property (to be thrown, not returned to the client).
 */
export function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}
