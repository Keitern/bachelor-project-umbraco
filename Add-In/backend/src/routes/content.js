// @ts-check
// POST /api/content, PUT /api/content/:id, POST /api/content/:id/publish
// HTTP layer: read the request, validate it, call mapping + client, send the response.
// Exports an Express Router: export const contentRouter = express.Router();
// index.js mounts it at /api/content, so paths here start at '/'.
//
// Express 5 passes errors from async handlers to the error handler automatically,
// so you can just `throw` (no try/catch + next(err) needed).

/**
 * validateContentRequest(body)
 *
 * Checks the JSON the add-in sends and throws an error with status 400 if it is invalid.
 * Expected body:
 *   {
 *     html:           string  (required, not empty) - from body.getHtml()
 *     source:         'word'  (later also 'google') - decides which normalize function to use
 *     documentTypeId: string  (optional, defaults to config.articleTypeId)
 *     parentId:       string | null  (optional, null = root)
 *   }
 * Tip: create the error as Object.assign(new Error('html is required'), { status: 400 }).
 *
 * @param {any} body   req.body
 * @returns {{ html: string, source: string, documentTypeId: string, parentId: string | null }}
 */

/**
 * mapDocument(html, source)
 *
 * Runs the mapping pipeline and returns the extracted parts:
 *   normalizeWord(html)  (or normalizeGoogle when source === 'google')
 *   -> extract(cleanHtml)
 * Throws 400 if no title was found.
 * Kept separate so create and update share it.
 *
 * @param {string} html
 * @param {string} source
 * @returns {{ title: string, teaser: string, bodyHtml: string }}
 */

/**
 * createContent(req, res)   ->  router.post('/', createContent)
 *
 * Creates a NEW node (first time the Word document is saved):
 *   1. validateContentRequest(req.body)
 *   2. mapDocument(html, source)
 *   3. toUmbraco(extracted, { documentTypeId, parentId })
 *   4. id = await createDocument(requestBody)
 *   5. res.status(201).json({ id, name: extracted.title })
 * The add-in stores this id in the Word document, so the next save calls PUT.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * updateContent(req, res)   ->  router.put('/:id', updateContent)
 *
 * Updates an EXISTING node ("save again"):
 *   1. validateContentRequest(req.body), id = req.params.id
 *   2. If !(await documentExists(id)): answer 404 { error: 'Node not found' } so the add-in
 *      can forget the stored id and create a new node instead.
 *   3. mapDocument -> toUmbracoUpdate -> updateDocument(id, requestBody)
 *   4. res.json({ id, name: extracted.title })
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * publishContent(req, res)  ->  router.post('/:id/publish', publishContent)
 *
 * Publishes a node that was created/updated before (separate Publish button in the add-in):
 *   1. await publishDocument(req.params.id)
 *   2. res.json({ id, published: true })
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
