// @ts-check
// GET endpoints the task pane uses to fill its dropdowns. Read-only, no mapping.
// Exports an Express Router: export const metadataRouter = express.Router();
// index.js mounts it at /api, so paths here start at '/'.

/**
 * listDocumentTypes(req, res)   ->  router.get('/document-types', listDocumentTypes)
 *
 * First dropdown in the pane: which document type to add or update.
 *   1. types = await getDocumentTypes()            (client.js)
 *   2. Leave out element types (isElement: true) and folders - they cannot be created as nodes.
 *   3. res.json([{ id, name, icon }])
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * listFields(req, res)   ->  router.get('/document-types/:id/fields', listFields)
 *
 * Field dropdown in the pane: which property the marked text should go into.
 *   1. properties = await getDocumentTypeProperties(req.params.id)   (client.js)
 *   2. For each property add `supported: isSupportedEditor(editorAlias)` (converters.js),
 *      so the pane can grey out fields we cannot fill from text (e.g. a content picker).
 *   3. res.json([{ alias, name, editorAlias, mandatory, supported }])
 * `mandatory` lets the pane warn before saving a NEW node without a required field.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * listDocuments(req, res)   ->  router.get('/documents?documentTypeId=...', listDocuments)
 *
 * "Update existing" dropdown in the pane: existing nodes of the chosen document type.
 *   1. nodes = await getDocumentsByType(req.query.documentTypeId)   (client.js)
 *   2. res.json([{ id, name, state }])   state = 'Published' | 'Draft' ...
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * listParents(req, res)   ->  router.get('/content-tree?parentId=...', listParents)  (optional)
 *
 * Only needed if the user should choose WHERE a new node is created. Start with root only
 * (parentId null) and add this later if there is time.
 *   1. nodes = await getContentChildren(req.query.parentId ?? null)   (client.js)
 *   2. res.json([{ id, name, hasChildren }])
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
