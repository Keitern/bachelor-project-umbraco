// @ts-check
// Management API calls. The ONLY file that talks to Umbraco's endpoints (besides auth.js).
// Code to start from: steps 2-4 in spike/spike.mjs.
// Verify every path and body in Swagger: {UMBRACO_URL}/umbraco/openapi/index.html

/**
 * request(method, path, body)
 *
 * Shared helper used by every function below. Not exported.
 *   1. token = await getToken()                       (from auth.js)
 *   2. fetch(`${config.apiBase}${path}`, { method, headers: { Authorization: `Bearer ${token}`,
 *      'Content-Type': 'application/json' }, body: JSON.stringify(body) })
 *   3. If status is 401: clearToken() and retry once (token may have expired).
 *   4. If not ok: throw an error with status and Umbraco's response text
 *      (Umbraco returns useful validation details in the body - keep them).
 *   5. Return parsed JSON, or null when the body is empty
 *      (POST /document and PUT /publish return no body).
 *
 * @param {string} method   'GET' | 'POST' | 'PUT'
 * @param {string} path     e.g. '/document' or `/document/${id}/publish`
 * @param {object} [body]
 * @returns {Promise<any>}
 */

// ─── Documents (content nodes) ──────────────────────────────────────────────

/**
 * createDocument(requestBody)  (exported)
 *
 * POST /document
 * requestBody is built by requestBodies.buildCreateBody: id, parent, documentType, template,
 * variants, values. Because we generate the id ourselves, return requestBody.id.
 *
 * @param {object} requestBody
 * @returns {Promise<string>} the new document's id (GUID)
 */

/**
 * getDocument(id)  (exported)
 *
 * GET /document/{id}
 * Returns the stored node: documentType, variants (name, state), values.
 * Used before an update, so we can keep the values the user did not change.
 * Throw an error with status 404 when Umbraco answers 404.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */

/**
 * updateDocument(id, requestBody)  (exported)
 *
 * PUT /document/{id}
 * requestBody is built by requestBodies.buildUpdateBody: template, variants, values
 * (no parent or documentType - check the exact fields in Swagger).
 *
 * @param {string} id
 * @param {object} requestBody
 * @returns {Promise<void>}
 */

/**
 * publishDocument(id)  (exported)
 *
 * PUT /document/{id}/publish
 * Body: { publishSchedules: [{ culture: null }] }   (invariant document types -> culture null)
 * Called after create/update when the user clicked "Save and publish".
 *
 * @param {string} id
 * @returns {Promise<void>}
 */

/**
 * getDocumentsByType(documentTypeId)  (exported)
 *
 * Returns existing nodes of one document type, for the "update existing" dropdown.
 * There is no single "all nodes of type X" endpoint, so pick one approach (check Swagger):
 *   a) Walk the tree: GET /tree/document/root, then /tree/document/children?parentId=...
 *      and keep items where item.documentType.id === documentTypeId
 *      (fine for a small site; stop at a reasonable depth).
 *   b) Search: GET /item/document/search?query=... if it supports filtering by document type.
 * Return [{ id, name, state }] with name/state taken from item.variants[0].
 *
 * @param {string} documentTypeId
 * @returns {Promise<Array<{ id: string, name: string, state: string }>>}
 */

/**
 * getContentChildren(parentId)  (exported, optional)
 *
 * GET /tree/document/root (parentId null) or GET /tree/document/children?parentId=...
 * Only needed if the user can choose where a new node is created.
 *
 * @param {string | null} parentId
 * @returns {Promise<Array<{ id: string, name: string, hasChildren: boolean }>>}
 */

// ─── Document types and data types ──────────────────────────────────────────

/**
 * getDocumentTypes()  (exported)
 *
 * GET /tree/document-type/root  (and children if you use folders)
 * Returns [{ id, name, icon, isElement, isFolder }] for the document type dropdown.
 *
 * @returns {Promise<Array<{ id: string, name: string, icon: string,
 *                          isElement: boolean, isFolder: boolean }>>}
 */

/**
 * getDocumentTypeProperties(documentTypeId)  (exported)
 *
 * Returns the fields of a document type WITH their editor, which decides the value format:
 *   1. type = GET /document-type/{id}
 *      -> type.properties: [{ alias, name, dataType: { id }, validation: { mandatory } }]
 *   2. For each distinct dataType.id: GET /data-type/{id} -> { editorAlias, values (config) }
 *      e.g. editorAlias 'Umbraco.RichText', 'Umbraco.TextBox'
 *   3. Return [{ alias, name, mandatory, editorAlias, config }]
 * Also include properties from compositions (type.compositions) if your document types
 * use them. Cache the result for a minute - the pane and both save routes call this.
 *
 * @param {string} documentTypeId
 * @returns {Promise<Array<{ alias: string, name: string, mandatory: boolean,
 *                          editorAlias: string, config: Array<{ alias: string, value: unknown }> }>>}
 */

// ─── Media (only for the Media Picker field type, phase 7) ──────────────────

/**
 * uploadImage(fileBuffer, fileName)  (exported, optional)
 *
 * 1. POST /temporary-file (multipart/form-data: Id = new UUID, File = the image)
 * 2. POST /media with mediaType Image and the temporary file id as the umbracoFile value
 * 3. Return the new media item's id, so converters.toMediaPicker can reference it.
 *
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @returns {Promise<string>} media id
 */
