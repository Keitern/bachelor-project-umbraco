/**
 * Responsible for all calls from the task pane to OUR backend (never to Umbraco directly).
 *
 * The backend runs on https://localhost:3001 (npm run dev:backend in the project root).
 * Every exported function here = one backend endpoint.
 *
 * @module
 */

/** Base address of the backend's API. */
const BACKEND_URL = "https://localhost:3001/api";

/** A document type, e.g. Article (GET /api/document-types). */
export interface DocumentType {
  id: string;
  name: string;
  icon: string;
}

/** An existing page of a document type (GET /api/documents?documentTypeId=...). */
export interface DocumentSummary {
  id: string;
  name: string;
  /** e.g. "Published", "Draft". */
  state: string;
}

/** A field of a document type (GET /api/document-types/:id/fields). */
export interface Field {
  alias: string;
  name: string;
  editorAlias: string;
  mandatory: boolean;
  /** false = can't be filled from marked text (e.g. a content picker). */
  supported: boolean;
}

/** One field filled with marked text, as the save routes expect it. */
export interface FilledField {
  alias: string;
  html: string;
}

/**
 * Sends one request to the backend and returns its JSON.
 * Use: every exported function in this file.
 *
 * @typeParam ResponseType - The shape of the JSON the backend sends back, e.g. DocumentType[].
 * @param method - HTTP method.
 * @param path - Path after BACKEND_URL, e.g. "/document-types".
 * @param body - Optional body, sent as JSON.
 * @returns The backend's JSON answer.
 * @throws {Error} With the backend's own message (e.g. "name is required when creating"),
 *   or a clear message when the backend can't be reached at all.
 */
export async function callBackend<ResponseType>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<ResponseType> {
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
  return json as ResponseType;
}

/**
 * Lists the document types that can be created as pages.
 * Use: step 1 in the task pane.
 *
 * @returns The document types.
 */
export async function getDocumentTypes(): Promise<DocumentType[]> {
  return callBackend<DocumentType[]>("GET", "/document-types");
}

/**
 * Lists the existing pages of one document type.
 * Use: step 2 in the task pane.
 *
 * @param documentTypeId - The chosen document type's id.
 * @returns The pages of that type.
 */
export async function getDocuments(documentTypeId: string): Promise<DocumentSummary[]> {
  return callBackend<DocumentSummary[]>(
    "GET",
    `/documents?documentTypeId=${encodeURIComponent(documentTypeId)}`
  );
}

/**
 * Lists the fields of one document type.
 * Use: the field cards in step 3.
 *
 * @param documentTypeId - The chosen document type's id.
 * @returns The fields, with `supported` telling which can be filled from text.
 */
export async function getFields(documentTypeId: string): Promise<Field[]> {
  return callBackend<Field[]>(
    "GET",
    `/document-types/${encodeURIComponent(documentTypeId)}/fields`
  );
}

/** One page with a short preview text per field alias (GET /api/documents/:id/values). */
export interface DocumentValues {
  id: string;
  name: string;
  /** Preview text per field alias, e.g. { title: "My article" }. */
  values: Record<string, string>;
}

/**
 * Gets the current content of a page as short previews.
 * Use: the grey preview line on the field cards in step 3.
 *
 * @param id - The page's id.
 * @returns The page's name and a preview per field.
 */
export async function getDocumentValues(id: string): Promise<DocumentValues> {
  return callBackend<DocumentValues>("GET", `/documents/${encodeURIComponent(id)}/values`);
}

/**
 * Saves filled fields on an EXISTING page (other fields keep their value).
 * Use: "Save as draft" / "Save & Publish" when an existing page was chosen.
 *
 * @param id - The page's id.
 * @param request - The filled fields, and whether to publish.
 * @returns The page's id and whether it was published.
 */
export async function updateContent(
  id: string,
  request: { fields: FilledField[]; publish: boolean }
): Promise<{ id: string; published: boolean }> {
  return callBackend("PUT", `/content/${encodeURIComponent(id)}`, { source: "word", ...request });
}

/**
 * Creates a NEW page of a document type with the filled fields, at the top of the content tree.
 * Use: "Save as draft" / "Save & Publish" after "Add new ...".
 *
 * @param request - Document type, name of the new page, the filled fields, and whether to publish.
 * @returns The new page's id and name, and whether it was published.
 */
export async function createContent(request: {
  documentTypeId: string;
  name: string;
  fields: FilledField[];
  publish: boolean;
}): Promise<{ id: string; name: string; published: boolean }> {
  return callBackend("POST", "/content", { source: "word", parentId: null, ...request });
}
