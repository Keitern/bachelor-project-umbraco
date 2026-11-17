// Responsible for all communication with Umbraco: reading, creating, updating and publishing.
//
// Management API calls. The ONLY file that talks to Umbraco's endpoints (besides auth.ts).
// Code to start from: steps 2-4 in spike/spike.mjs.
// Verify every path and body in Swagger: {UMBRACO_URL}/umbraco/openapi/index.html

import { config } from '../config.ts';
import { getToken, clearToken } from './auth.ts';

// The HTTP methods we use against the Management API
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Error thrown when Umbraco answers with a non-2xx status.
// Keeps the status (e.g. 404) and Umbraco's response text,
export class UmbracoApiError extends Error {
  status: number;
  responseText: string;
  constructor(status: number, message: string, responseText: string) {
    super(message);
    this.name = 'UmbracoApiError';
    this.status = status;
    this.responseText = responseText;
  }
}

// Sends one HTTP request to the Management API with a token, and returns the raw response.
// Use: only called by request(), which also uses it to resend after a rejected token.
async function send(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  const token = await getToken();

  return fetch(`${config.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'Content-Type': 'application/json' })
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
}

// Sends a request via send(), retries once on 401, throws on errors and returns the parsed JSON.
// Use: every client function below calls this to talk to Umbraco.
async function request<finalType = unknown>(method: HttpMethod, path: string, body?: unknown): Promise<finalType> {
  let res = await send(method, path, body);

  if (res.status === 401) {
    clearToken();
    res = await send(method, path, body);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new UmbracoApiError(res.status, `${method} ${path} -> ${res.status}`, text);
  }

  return (text ? JSON.parse(text) : null) as finalType;
}

// ─── Types (shapes from Swagger: /umbraco/openapi/index.html) ───────────────
// Only the fields we use are listed; Umbraco sends more.

// One property value on a document, e.g. { alias: 'title', culture: null, segment: null, value: 'Hi' }
export interface DocumentValue {
  alias: string;
  culture: string | null;
  segment: string | null;
  value: unknown;
}

// One language/segment version of a document. Invariant types have one, with culture null.
export interface DocumentVariant {
  culture: string | null;
  segment: string | null;
  name: string;
}

// Body for POST /document (built by requestBodies.buildCreateBody)
export interface CreateDocumentBody {
  id: string;
  parent: { id: string } | null;
  documentType: { id: string };
  template: { id: string } | null;
  variants: DocumentVariant[];
  values: DocumentValue[];
}

// Body for PUT /document/{id} (built by requestBodies.buildUpdateBody)
export interface UpdateDocumentBody {
  template: { id: string } | null;
  variants: DocumentVariant[];
  values: DocumentValue[];
}

// What GET /document/{id} returns (only what we use)
export interface DocumentResponse {
  id: string;
  documentType: { id: string };
  template: { id: string } | null;
  variants: Array<DocumentVariant & { state: string }>;
  values: Array<DocumentValue & { editorAlias: string }>;
}

// Item in GET /tree/document/root and /tree/document/children
interface DocumentTreeItem {
  id: string;
  hasChildren: boolean;
  documentType: { id: string };
  variants: Array<{ name: string; state: string }>;
}

// Item in GET /tree/document-type/root and /tree/document-type/children
export interface DocumentTypeTreeItem {id: string;
  name: string;
  icon: string;
  isElement: boolean;
  isFolder: boolean;
  hasChildren: boolean;
}

// What GET /document-type/{id} returns (only what we use)
interface DocumentTypeResponse {
  id: string;
  properties: Array<{
    alias: string;
    name: string;
    dataType: { id: string };
    validation: { mandatory: boolean };
  }>;
}

// What GET /data-type/{id} returns (only what we use)
interface DataTypeResponse {
id: string;
  editorAlias: string;
  values: Array<{ alias: string; value: unknown }>;
}

// Tree endpoints return one page of results: { total, items }
interface Paged<Item> {
  total: number;
  items: Item[];
}

// Simplified node for the add-in's dropdowns
export interface DocumentSummary {
  id: string;
  name: string;
  state: string; // e.g. 'Published', 'Draft'
  hasChildren: boolean;
}

// A field of a document type, with the editor that decides the value format
export interface DocumentTypeProperty {
  alias: string;
  name: string;
  mandatory: boolean;
  editorAlias: string; // e.g. 'Umbraco.RichText'
  config: Array<{ alias: string; value: unknown }>; // data type settings, e.g. maxChars
}

// Max items per tree request. Umbraco pages the tree; 500 is plenty for this project.
const TREE_PAGE_SIZE = 500;

// Shrinks one of Umbraco's tree items down to { id, name, state, hasChildren }.
// Use: turns tree results into the simple list the add-in's dropdowns show.
function toSummary(item: DocumentTreeItem): DocumentSummary {
  return {
    id: item.id,
    name: item.variants[0]?.name ?? '(no name)',
    state: item.variants[0]?.state ?? 'Unknown',
    hasChildren: item.hasChildren
  };
}

// ─── Documents (content nodes) ──────────────────────────────────────────────

// Creates a new node in Umbraco and returns its id.
// Use: when the user picks "New" in the task pane and clicks a save button.
export async function createDocument(requestBody: CreateDocumentBody): Promise<string> {
  await request('POST', '/document', requestBody);
  return requestBody.id;
}

// Reads one node with all its values, or returns null if it no longer exists.
// Use: before an update, so the values the user did not change can be kept.
export async function getDocument(id: string): Promise<DocumentResponse | null> {
  try {
    return await request<DocumentResponse>('GET', `/document/${id}`);
  } catch (err) {
    if (err instanceof UmbracoApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// Saves all values on an existing node (fields left out get emptied).
// Use: when the user picked an existing node in the task pane and clicks a save button.
export async function updateDocument(id: string, requestBody: UpdateDocumentBody): Promise<void> {
  await request('PUT', `/document/${id}`, requestBody);
}

// Publishes a node so it is visible on the website.
// Use: after create/update, when the user clicked "Save and publish".
export async function publishDocument(id: string): Promise<void> {
  await request('PUT', `/document/${id}/publish`, { publishSchedules: [{ culture: null }] });
}

// =============================== Tree endpoints (content and document types) =========================
// Fetches the raw nodes at one level of the content tree (null = top level).
// Use: shared by getContentChildren and getDocumentsByType.
async function getTreeItems(parentId: string | null): Promise<DocumentTreeItem[]> {
  const path =
    parentId === null
      ? `/tree/document/root?take=${TREE_PAGE_SIZE}`
      : `/tree/document/children?parentId=${parentId}&take=${TREE_PAGE_SIZE}`;

  const page = await request<Paged<DocumentTreeItem>>('GET', path);
  return page.items;
}

// Lists the nodes directly under a node, or the top-level nodes when parentId is null.
// Use: a parent picker in the task pane, to choose where a new node goes (optional).
export async function getContentChildren(parentId: string | null): Promise<DocumentSummary[]> {
  const items = await getTreeItems(parentId);
  return items.map((item) => {
    return toSummary(item);
  });
}

// Finds all nodes of one document type by walking the content tree (max 5 levels deep).
// Use: fills the "update existing" dropdown after the user picks a document type.
export async function getDocumentsByType(documentTypeId: string, maxDepth = 5): Promise<DocumentSummary[]> {
  const result: DocumentSummary[] = [];
  let level: Array<string | null> = [null]; // null = root

  for (let depth = 0; depth < maxDepth && level.length > 0; depth++) {
    const nextLevel: string[] = [];

    for (const parentId of level) {
      const items = await getTreeItems(parentId);

      for (const item of items) {
        if (item.documentType.id === documentTypeId) {
          result.push(toSummary(item));
        }
        if (item.hasChildren) {
          nextLevel.push(item.id);
        }
      }
    }

    level = nextLevel;
  }

  return result;
}
// =============================== Document types and data types =========================


// ─── Document types and data types ──────────────────────────────────────────

// Lists all document types that can be created as pages (skips folders and element types).
// Use: fills the first dropdown in the task pane ("what kind of page?").
export async function getDocumentTypes(): Promise<DocumentTypeTreeItem[]> {
  const result: DocumentTypeTreeItem[] = [];
  let level: Array<string | null> = [null]; // null = root

  while (level.length > 0) {
    const nextLevel: string[] = [];

    for (const parentId of level) {
      const path =
        parentId === null
          ? `/tree/document-type/root?take=${TREE_PAGE_SIZE}`
          : `/tree/document-type/children?parentId=${parentId}&take=${TREE_PAGE_SIZE}`;
      const page = await request<Paged<DocumentTypeTreeItem>>('GET', path);

      for (const item of page.items) {
        if (item.isFolder) {
          nextLevel.push(item.id);
        } else if (!item.isElement) {
          result.push(item);
        }
      }
    }

    level = nextLevel;
  }

  return result;
}

// Cache for getDocumentTypeProperties: the pane and both save routes ask for the same type,
// and document types rarely change. Key = document type id.
const PROPERTIES_CACHE_MS = 120000;
const propertiesCache = new Map<
  string,{ expiresAt: number; properties: DocumentTypeProperty[] } 
>();

// Lists the fields of a document type with their editor alias and settings (cached 1 min).
// Use: fills the field dropdown, and tells the save route how to convert the marked text.
export async function getDocumentTypeProperties(documentTypeId: string): Promise<DocumentTypeProperty[]> {
  
  const cached = propertiesCache.get(documentTypeId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.properties;
  }

  // The document type's own fields. Find the ID of each field's data type.
  const type = await request<DocumentTypeResponse>('GET', `/document-type/${documentTypeId}`);
  const rawProperties = type.properties;

  // Fetch each data type once based on its ID
  // .map collects the IDs
  const dataTypeIds = new Set(
    rawProperties.map((p) => {
      return p.dataType.id;
    })
  );
  // new Set removes duplicates
  const dataTypes = new Map<string, DataTypeResponse>();
  for (const dataTypeId of dataTypeIds) {
    dataTypes.set(dataTypeId, await request<DataTypeResponse>('GET', `/data-type/${dataTypeId}`));
  }

  // Build the final list of properties with their alias and config values
  const properties = rawProperties.map((p) => {
    const dataType = dataTypes.get(p.dataType.id);
    return {
      alias: p.alias,
      name: p.name,
      mandatory: p.validation.mandatory,
      editorAlias: dataType?.editorAlias ?? 'Unknown',
      config: dataType?.values ?? []
    };
  });

  // Cache the result for a while, so the next call does not hit Umbraco again
  propertiesCache.set(documentTypeId, { expiresAt: Date.now() + PROPERTIES_CACHE_MS, properties });
  return properties;
}

// ─── Media (only for the Media Picker field type, phase 7) ──────────────────

/**
 * uploadImage(fileBuffer, fileName)  (exported, optional) - NOT IMPLEMENTED YET
 *
 * Needs a multipart/form-data upload, which send() does not support (it only sends JSON).
 * 1. POST /temporary-file (multipart/form-data: Id = new UUID, File = the image)
 * 2. POST /media with mediaType Image and the temporary file id as the umbracoFile value
 * 3. Return the new media item's id, so converters.toMediaPicker can reference it.
 */
