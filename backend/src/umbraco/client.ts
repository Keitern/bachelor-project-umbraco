/**
 * @file Responsible for all communication with Umbraco: reading, creating, updating and publishing.
 *
 * Management API calls. The ONLY file that talks to Umbraco's endpoints (besides auth.ts).
 * Code to start from: steps 2-4 in spike/spike.mjs.
 * Verify every path and body in Swagger: {UMBRACO_URL}/umbraco/openapi/index.html
 */

import { config } from '../config.ts';
import { getToken, clearToken } from './auth.ts';

/** The HTTP methods we use against the Management API. */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Error thrown when Umbraco answers with a non-2xx status.
 * Keeps the status (e.g. 404) and Umbraco's response text, so errorHandler (index.ts) can pass
 * both on to the add-in.
 */
export class UmbracoApiError extends Error {
  /** Umbraco's HTTP status, e.g. 400 or 404. */
  status: number;
  /** Umbraco's response body, usually JSON that explains what was wrong. */
  responseText: string;

  /**
   * @param status - Umbraco's HTTP status.
   * @param message - Short description, e.g. "PUT /document/abc -> 400".
   * @param responseText - Umbraco's response body.
   */
  constructor(status: number, message: string, responseText: string) {
    super(message);
    this.name = 'UmbracoApiError';
    this.status = status;
    this.responseText = responseText;
  }
}

/**
 * Sends one HTTP request to the Management API with a token, and returns the raw response.
 * Use: only called by request(), which also uses it to resend after a rejected token.
 *
 * @param method - HTTP method.
 * @param path - Path after apiBase, e.g. '/document/abc'.
 * @param body - Optional body, sent as JSON. Without a body no Content-Type header is sent.
 * @returns The raw fetch Response (not checked for errors here).
 */
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

/**
 * Sends a request via send(), retries once on 401, throws on errors and returns the parsed JSON.
 * Use: every client function below calls this to talk to Umbraco.
 *
 * @typeParam finalType - The shape of the JSON Umbraco answers with, e.g. DocumentResponse.
 * @param method - HTTP method.
 * @param path - Path after apiBase, e.g. '/document/abc'.
 * @param body - Optional body, sent as JSON.
 * @returns The parsed JSON, or null when Umbraco answers with an empty body.
 * @throws {UmbracoApiError} If Umbraco answers with a non-2xx status (after the 401 retry).
 */
async function request<finalType = unknown>(
  method: HttpMethod,
  path: string,
  body?: unknown
): Promise<finalType> {
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

/**
 * One property value on a document,
 * e.g. { alias: 'title', culture: null, segment: null, value: 'Hi' }.
 */
export interface DocumentValue {
  /** The field's alias, e.g. 'title'. */
  alias: string;
  /** Language, or null for fields that are the same in every language (invariant). */
  culture: string | null;
  /** Segment, null in this project. */
  segment: string | null;
  /** The value itself. Its format depends on the field's editor (see converters.ts). */
  value: unknown;
}

/** One language/segment version of a document. Invariant types have one, with culture null. */
export interface DocumentVariant {
  culture: string | null;
  segment: string | null;
  /** The node's name in this variant, shown in the content tree. */
  name: string;
}

/** Body for POST /document (built by requestBodies.buildCreateBody). */
export interface CreateDocumentBody {
  /** New id, chosen by us, so we know it without reading Umbraco's answer. */
  id: string;
  /** Where the node goes in the content tree, or null for the top level. */
  parent: { id: string } | null;
  documentType: { id: string };
  template: { id: string } | null;
  variants: DocumentVariant[];
  values: DocumentValue[];
}

/**
 * Body for PUT /document/{id} (built by requestBodies.buildUpdateBody).
 * Values that are left out are emptied by Umbraco, so it must contain ALL values.
 */
export interface UpdateDocumentBody {
  template: { id: string } | null;
  variants: DocumentVariant[];
  values: DocumentValue[];
}

/** What GET /document/{id} returns (only what we use). */
export interface DocumentResponse {
  id: string;
  documentType: { id: string };
  template: { id: string } | null;
  /** Each variant also has a state, e.g. 'Published' or 'Draft'. */
  variants: Array<DocumentVariant & { state: string }>;
  /** Each value also says which editor it belongs to, e.g. 'Umbraco.RichText'. */
  values: Array<DocumentValue & { editorAlias: string }>;
}

/** Item in GET /tree/document/root and /tree/document/children. */
interface DocumentTreeItem {
  id: string;
  hasChildren: boolean;
  documentType: { id: string };
  variants: Array<{ name: string; state: string }>;
}

/** Item in GET /tree/document-type/root and /tree/document-type/children. */
export interface DocumentTypeTreeItem {
  id: string;
  name: string;
  /** Umbraco's icon name, e.g. 'icon-document'. */
  icon: string;
  /** Element types are only used inside blocks, never as pages, so they are skipped. */
  isElement: boolean;
  /** Folders only group document types; we look inside them. */
  isFolder: boolean;
  hasChildren: boolean;
}

/** What GET /document-type/{id} returns (only what we use). */
interface DocumentTypeResponse {
  id: string;
  properties: Array<{
    alias: string;
    name: string;
    dataType: { id: string };
    validation: { mandatory: boolean };
  }>;
}

/** What GET /data-type/{id} returns (only what we use). */
interface DataTypeResponse {
  id: string;
  /** Decides the value format, e.g. 'Umbraco.TextBox'. */
  editorAlias: string;
  /** The data type's settings, e.g. { alias: 'maxChars', value: 100 }. */
  values: Array<{ alias: string; value: unknown }>;
}

/**
 * Tree endpoints return one page of results: { total, items }.
 * @typeParam Item - The type of one item in the page.
 */
interface Paged<Item> {
  total: number;
  items: Item[];
}

/** Simplified node for the add-in's dropdowns. */
export interface DocumentSummary {
  id: string;
  name: string;
  /** e.g. 'Published', 'Draft'. */
  state: string;
  hasChildren: boolean;
}

/** A field of a document type, with the editor that decides the value format. */
export interface DocumentTypeProperty {
  alias: string;
  name: string;
  mandatory: boolean;
  /** e.g. 'Umbraco.RichText'. */
  editorAlias: string;
  /** Data type settings, e.g. maxChars. */
  config: Array<{ alias: string; value: unknown }>;
}

/** Max items per tree request. Umbraco pages the tree; 500 is plenty for this project. */
const TREE_PAGE_SIZE = 500;

/**
 * Shrinks one of Umbraco's tree items down to { id, name, state, hasChildren }.
 * Use: turns tree results into the simple list the add-in's dropdowns show.
 *
 * @param item - A raw item from a /tree/document endpoint.
 * @returns The simplified node. Missing name/state become '(no name)' / 'Unknown'.
 */
function toSummary(item: DocumentTreeItem): DocumentSummary {
  return {
    id: item.id,
    name: item.variants[0]?.name ?? '(no name)',
    state: item.variants[0]?.state ?? 'Unknown',
    hasChildren: item.hasChildren
  };
}

// ─── Documents (content nodes) ──────────────────────────────────────────────

/**
 * Creates a new node in Umbraco and returns its id.
 * Use: when the user picks "New" in the task pane and clicks a save button.
 *
 * @param requestBody - The full create body (see requestBodies.buildCreateBody).
 * @returns The new node's id (the one we chose in requestBody.id).
 * @throws {UmbracoApiError} If Umbraco refuses, e.g. 400 for an invalid value.
 */
export async function createDocument(requestBody: CreateDocumentBody): Promise<string> {
  await request('POST', '/document', requestBody);
  return requestBody.id;
}

/**
 * Reads one node with all its values, or returns null if it no longer exists.
 * Use: before an update, so the values the user did not change can be kept.
 *
 * @param id - The node's id.
 * @returns The node, or null if Umbraco answers 404.
 * @throws {UmbracoApiError} On any other non-2xx answer.
 */
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

/**
 * Saves all values on an existing node (fields left out get emptied).
 * Use: when the user picked an existing node in the task pane and clicks a save button.
 *
 * @param id - The node's id.
 * @param requestBody - ALL values of the node (see requestBodies.buildUpdateBody).
 * @throws {UmbracoApiError} If Umbraco refuses, e.g. 404 or 400.
 */
export async function updateDocument(id: string, requestBody: UpdateDocumentBody): Promise<void> {
  await request('PUT', `/document/${id}`, requestBody);
}

/**
 * Publishes a node so it is visible on the website.
 * Use: after create/update, when the user clicked "Save and publish".
 *
 * @param id - The node's id.
 * @throws {UmbracoApiError} If Umbraco refuses, e.g. a mandatory field is empty.
 */
export async function publishDocument(id: string): Promise<void> {
  await request('PUT', `/document/${id}/publish`, { publishSchedules: [{ culture: null }] });
}

// =============================== Tree endpoints (content and document types) =========================
/**
 * Fetches the raw nodes at one level of the content tree (null = top level).
 * Use: shared by getContentChildren and getDocumentsByType.
 *
 * @param parentId - The parent node's id, or null for the top level.
 * @returns The raw tree items (max TREE_PAGE_SIZE).
 */
async function getTreeItems(parentId: string | null): Promise<DocumentTreeItem[]> {
  const path =
    parentId === null
      ? `/tree/document/root?take=${TREE_PAGE_SIZE}`
      : `/tree/document/children?parentId=${parentId}&take=${TREE_PAGE_SIZE}`;

  const page = await request<Paged<DocumentTreeItem>>('GET', path);
  return page.items;
}

/**
 * Lists the nodes directly under a node, or the top-level nodes when parentId is null.
 * Use: a parent picker in the task pane, to choose where a new node goes (optional).
 *
 * @param parentId - The parent node's id, or null for the top level.
 * @returns The child nodes as summaries.
 */
export async function getContentChildren(parentId: string | null): Promise<DocumentSummary[]> {
  const items = await getTreeItems(parentId);
  return items.map((item) => {
    return toSummary(item);
  });
}

/**
 * Finds all nodes of one document type by walking the content tree, level by level.
 * Use: fills the page list in the task pane after the user picks a document type.
 *
 * Umbraco's search endpoint needs a search word, so the tree is walked instead.
 *
 * @param documentTypeId - The document type to look for.
 * @param maxDepth - How many levels deep to look (default 5).
 * @returns All matching nodes as summaries.
 */
export async function getDocumentsByType(
  documentTypeId: string,
  maxDepth = 5
): Promise<DocumentSummary[]> {
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

// ─── Document types and data types ──────────────────────────────────────────

/**
 * Lists all document types that can be created as pages (skips folders and element types).
 * Use: fills the first step in the task pane ("what kind of page?").
 *
 * Looks inside folders too, level by level, until there are no more folders.
 *
 * @returns The document types, without folders and element types.
 */
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

/**
 * How long getDocumentTypeProperties keeps a result: 120000 ms = 2 minutes.
 * The pane and both save routes ask for the same type, and document types rarely change.
 */
const PROPERTIES_CACHE_MS = 120000;
/** Cache for getDocumentTypeProperties. Key = document type id. */
const propertiesCache = new Map<
  string,
  { expiresAt: number; properties: DocumentTypeProperty[] }
>();

/**
 * Lists the fields of a document type with their editor alias and settings (cached 2 min).
 * Use: fills the field cards, and tells the save route how to convert the marked text.
 *
 * Fetches the document type, then each of its data types once (several fields often share
 * one data type).
 *
 * @param documentTypeId - The document type's id.
 * @returns One entry per field, in the document type's order.
 * @throws {UmbracoApiError} If the document type or a data type can't be read.
 */
export async function getDocumentTypeProperties(
  documentTypeId: string
): Promise<DocumentTypeProperty[]> {
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

// uploadImage(fileBuffer, fileName)  (exported, optional) - NOT IMPLEMENTED YET
//
// Needs a multipart/form-data upload, which send() does not support (it only sends JSON).
// 1. POST /temporary-file (multipart/form-data: Id = new UUID, File = the image)
// 2. POST /media with mediaType Image and the temporary file id as the umbracoFile value
// 3. Return the new media item's id, so converters.toMediaPicker can reference it.
