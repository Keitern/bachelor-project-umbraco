// Responsible for all calls from the task pane to OUR backend (never to Umbraco directly).
//
// The backend runs on https://localhost:3001 (npm run dev:backend in the project root).
// Every exported function here = one backend endpoint.

const BACKEND_URL = "https://localhost:3001/api";

// A document type, e.g. Article (GET /api/document-types)
export interface DocumentType {
  id: string;
  name: string;
  icon: string;
}

// An existing page of a document type (GET /api/documents?documentTypeId=...)
export interface DocumentSummary {
  id: string;
  name: string;
  state: string; // e.g. "Published", "Draft"
}

// A field of a document type (GET /api/document-types/:id/fields)
export interface Field {
  alias: string;
  name: string;
  editorAlias: string;
  mandatory: boolean;
  supported: boolean; // false = can't be filled from marked text (e.g. a content picker)
}

// One field filled with marked text, as the save routes expect it
export interface FilledField {
  alias: string;
  html: string;
}

// Sends one request to the backend and returns its JSON.
// Throws an Error with the backend's own message (e.g. "name is required when creating"),
// or a clear message when the backend can't be reached at all.
async function callBackend<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    // fetch only throws when there is no answer at all: backend not running, certificate not
    // trusted, or the browser blocked the call (CORS). The reason is added for debugging.
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Can't reach the backend at ${BACKEND_URL} (${reason}). Is it running?`);
  }

  const json = await res.json().catch(() => {
    return null;
  });
  if (!res.ok) {
    const message = json && typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json as T;
}

// Lists the document types that can be created as pages. Use: the first dropdown.
export async function getDocumentTypes(): Promise<DocumentType[]> {
  return callBackend<DocumentType[]>("GET", "/document-types");
}

// Lists the existing pages of one document type. Use: the "page" dropdown.
export async function getDocuments(documentTypeId: string): Promise<DocumentSummary[]> {
  return callBackend<DocumentSummary[]>(
    "GET",
    `/documents?documentTypeId=${encodeURIComponent(documentTypeId)}`
  );
}

// Lists the fields of one document type. Use: the "field" dropdown.
export async function getFields(documentTypeId: string): Promise<Field[]> {
  return callBackend<Field[]>(
    "GET",
    `/document-types/${encodeURIComponent(documentTypeId)}/fields`
  );
}

// One page with a short preview text per field alias (GET /api/documents/:id/values)
export interface DocumentValues {
  id: string;
  name: string;
  values: Record<string, string>;
}

// Gets the current content of a page as short previews. Use: the field cards.
export async function getDocumentValues(id: string): Promise<DocumentValues> {
  return callBackend<DocumentValues>("GET", `/documents/${encodeURIComponent(id)}/values`);
}

// Saves filled fields on an EXISTING page (other fields keep their value).
export async function updateContent(
  id: string,
  request: { fields: FilledField[]; publish: boolean }
): Promise<{ id: string; published: boolean }> {
  return callBackend("PUT", `/content/${encodeURIComponent(id)}`, { source: "word", ...request });
}

// Creates a NEW page of a document type with the filled fields.
export async function createContent(request: {
  documentTypeId: string;
  name: string;
  fields: FilledField[];
  publish: boolean;
}): Promise<{ id: string; name: string; published: boolean }> {
  return callBackend("POST", "/content", { source: "word", parentId: null, ...request });
}
