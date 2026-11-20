// Responsible for all calls from the task pane to OUR backend (never to Umbraco directly).
//
// The backend runs on https://localhost:3001 (npm run dev:backend in the project root).
// Every function here = one backend endpoint.

const BACKEND_URL = "https://localhost:3001/api";

// A document type as the backend sends it (GET /api/document-types)
export interface DocumentType {
  id: string;
  name: string;
  icon: string;
}

// Calls one GET endpoint and returns its JSON.
// Throws an Error with the backend's own message (e.g. "Query parameter ... is required"),
// or a clear message when the backend can't be reached at all.
async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`);
  } catch (err) {
    // fetch only throws when there is no answer at all: backend not running, certificate not
    // trusted, or the browser blocked the call (CORS). The reason is added for debugging.
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Can't reach the backend at ${BACKEND_URL} (${reason}). Is it running?`);
  }

  const body = await res.json().catch(() => {
    return null;
  });
  if (!res.ok) {
    const message = body && typeof body.error === "string" ? body.error : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

// Lists the document types that can be created as pages, e.g. [{ id, name: 'Article', icon }].
// Use: the first dropdown in the task pane.
export async function getDocumentTypes(): Promise<DocumentType[]> {
  return getJson<DocumentType[]>("/document-types");
}
