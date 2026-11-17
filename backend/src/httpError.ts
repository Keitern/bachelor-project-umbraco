// Responsible for errors that should reach the add-in with a status, e.g. 400 for bad input.
//
// Creates an error with an HTTP status. errorHandler (index.ts) turns it into a response with
// that status and { error: message }.
// Use: routes and mapping throw these for bad input, e.g. httpError(400, 'fields is required').
export function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { status });
}
