// @ts-check
// POST /api/content, PUT /api/content/:id
// HTTP layer: read the request, validate it, call mapping + client, send the response.
// Exports an Express Router: export const contentRouter = express.Router();
// index.js mounts it at /api/content, so paths here start at '/'.
//
// Workflow (task pane in Word):
//   1. User picks a document type, then either an existing node ("update") or "new".
//   2. User marks text in Word, picks a field (property) and clicks "Fill field".
//      The add-in only collects these in a list - nothing is sent yet.
//   3. User clicks "Save as draft" or "Save and publish". The add-in sends ALL filled
//      fields in ONE request to the routes below, with publish: false / true.
//
// Express 5 passes errors from async handlers to the error handler automatically,
// so you can just `throw` (no try/catch + next(err) needed).

/**
 * validateSaveRequest(body, isNew)
 *
 * Checks the JSON the add-in sends and throws an error with status 400 if it is invalid.
 * Expected body:
 *   {
 *     source:         'word'                    - decides which normalize function to use
 *     documentTypeId: string                    - required when creating (isNew)
 *     parentId:       string | null             - only when creating, null = root
 *     name:           string                    - node name; required when creating
 *     publish:        boolean                   - false = "Save as draft", true = "Save and publish"
 *     fields: [                                 - at least one
 *       { alias: 'title',    html: '<p>My title</p>' },
 *       { alias: 'bodyText', html: '<p>...</p><ul>...</ul>' }
 *     ]
 *   }
 * `html` is the marked text from Office.js getSelection().getHtml().
 * Also check that no alias appears twice in fields.
 * Tip: create the error as Object.assign(new Error('fields is required'), { status: 400 }).
 *
 * @param {any} body      req.body
 * @param {boolean} isNew true for POST (create), false for PUT (update)
 * @returns {{ source: string, documentTypeId?: string, parentId?: string | null,
 *             name?: string, publish: boolean, fields: Array<{ alias: string, html: string }> }}
 */

/**
 * createContent(req, res)   ->  router.post('/', createContent)
 *
 * Creates a NEW node of the chosen document type and fills the chosen fields:
 *   1. validateSaveRequest(req.body, true)
 *   2. properties = await getDocumentTypeProperties(documentTypeId)   (client.js)
 *      -> tells us the editorAlias (data type) of every field
 *   3. values = convertFields(fields, properties, source)              (convertFields.js)
 *   4. requestBody = buildCreateBody({ documentTypeId, parentId, name, values })   (requestBodies.js)
 *   5. id = await createDocument(requestBody)
 *   6. if (publish) await publishDocument(id)
 *   7. res.status(201).json({ id, name, published: publish })
 * The add-in stores this id in the Word document, so next time the pane pre-selects the node.
 * If Umbraco rejects the request (e.g. a mandatory field is missing), pass its validation
 * message on to the add-in with status 400 so the user sees what is wrong.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

/**
 * updateContent(req, res)   ->  router.put('/:id', updateContent)
 *
 * Updates an EXISTING node. Only the fields the user filled are changed; all other
 * fields keep their current value. Filled fields REPLACE the existing content.
 *   1. validateSaveRequest(req.body, false), id = req.params.id
 *   2. existing = await getDocument(id)  -> 404 { error: 'Node not found' } if it was deleted,
 *      so the add-in can forget the stored id
 *   3. properties = await getDocumentTypeProperties(existing.documentType.id)
 *   4. newValues = convertFields(fields, properties, source)
 *   5. requestBody = buildUpdateBody(existing, newValues, name)   (requestBodies.js)
 *      (keeps existing values, replaces the filled ones - see requestBodies.js)
 *   6. await updateDocument(id, requestBody)
 *   7. if (publish) await publishDocument(id)
 *   8. res.json({ id, published: publish })
 *
 * Why read first: PUT /document/{id} expects ALL values. Leaving a value out may empty it in
 * Umbraco, so we send the existing values back together with the replaced ones.
 * (Verify this behaviour once with the spike.)
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
