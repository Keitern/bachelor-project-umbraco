// @ts-check
// Management API calls: create, update, publish, read document.
// The ONLY file that talks to Umbraco's content endpoints. Code to start from: steps 2-4 in
// spike/spike.mjs. Verify formats in Swagger: {UMBRACO_URL}/umbraco/openapi/index.html

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

/**
 * createDocument(requestBody)  (exported)
 *
 * POST /document
 * requestBody is built by toUmbraco.js and contains: id, parent, documentType, template,
 * variants, values. Because we generate the id ourselves, return requestBody.id.
 *
 * @param {object} requestBody
 * @returns {Promise<string>} the new document's id (GUID)
 */

/**
 * updateDocument(id, requestBody)  (exported)
 *
 * PUT /document/{id}
 * Used when the Word document already has a node key stored ("save again").
 * Body: variants + values (+ template). Check in Swagger which fields PUT accepts;
 * it does NOT take parent or documentType.
 *
 * @param {string} id
 * @param {object} requestBody
 * @returns {Promise<void>}
 */

/**
 * publishDocument(id)  (exported)
 *
 * PUT /document/{id}/publish
 * Body: { publishSchedules: [{ culture: null }] }   (Article is invariant -> culture null)
 *
 * @param {string} id
 * @returns {Promise<void>}
 */

/**
 * getDocument(id)  (exported)
 *
 * GET /document/{id}
 * Returns the stored document (variants, values, state). Useful to check that a node
 * still exists before updating it, and for e2e tests.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */

/**
 * documentExists(id)  (exported, optional)
 *
 * Calls getDocument and returns false on 404 instead of throwing.
 * Used by the service/route to decide: update if the node exists, otherwise create a new one
 * (e.g. when someone deleted the node in the backoffice).
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */

// ─── Later (phase 5, routes/metadata.js) ─────────────────────────────────────

/**
 * getDocumentTypes()  (exported, later)
 *
 * GET /tree/document-type/root  -> list of { id, name } for the dropdown in the add-in.
 *
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */

/**
 * getContentChildren(parentId)  (exported, later)
 *
 * GET /tree/document/root  (parentId null) or GET /tree/document/children?parentId=...
 * -> list of nodes for the parent picker in the add-in.
 *
 * @param {string | null} parentId
 * @returns {Promise<Array<{ id: string, name: string, hasChildren: boolean }>>}
 */
