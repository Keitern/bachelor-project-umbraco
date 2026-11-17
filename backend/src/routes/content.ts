// Responsible for "Save as draft" and "Save and publish": creating and updating pages.
//
// POST /api/content, PUT /api/content/:id
// HTTP layer: read the request, validate it, call mapping + client, send the response.
// index.ts mounts this router at /api/content, so the paths here start at '/'.
//
// Workflow (task pane in Word):
//   1. User picks a document type, then either an existing node ("update") or "new".
//   2. User marks text in Word, picks a field and clicks "Fill field".
//      The add-in only collects these in a list - nothing is sent yet.
//   3. User clicks "Save as draft" or "Save and publish". The add-in sends ALL filled
//      fields in ONE request to the routes below, with publish: false / true.
//
// Express 5 passes errors from async handlers to errorHandler automatically,
// so the handlers can just `throw` (no try/catch needed).

import express from 'express';
import { httpError } from '../httpError.ts';
import { convertFields } from '../mapping/convertFields.ts';
import type { FilledField, Source } from '../mapping/convertFields.ts';
import { buildCreateBody, buildUpdateBody } from '../mapping/requestBodies.ts';
import {
  createDocument,
  getDocument,
  getDocumentTypeProperties,
  publishDocument,
  updateDocument
} from '../umbraco/client.ts';

export const contentRouter = express.Router();

// What the add-in sends, after validateSaveRequest has checked it.
interface SaveRequest {
  source: Source; // 'word' | 'google' - decides how the HTML is cleaned
  documentTypeId?: string; // required when creating
  parentId: string | null; // only used when creating, null = root
  name?: string; // node name; required when creating, optional when updating
  publish: boolean; // false = "Save as draft", true = "Save and publish"
  fields: FilledField[]; // at least one: [{ alias: 'title', html: '<p>...</p>' }]
}

// true for a string that isn't empty or only spaces
function isFilledString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

// Checks one entry of `fields` and returns it typed. Throws 400 if it is invalid.
function validateField(field: unknown, index: number): FilledField {
  if (typeof field !== 'object' || field === null) {
    throw httpError(400, `fields[${index}] must be an object`);
  }
  const { alias, html } = field as Record<string, unknown>;
  if (!isFilledString(alias)) {
    throw httpError(400, `fields[${index}].alias is required`);
  }
  if (typeof html !== 'string') {
    throw httpError(400, `fields[${index}].html must be a string`);
  }
  return { alias: alias.trim(), html };
}

// Checks the JSON the add-in sends and returns it typed. Throws 400 if it is invalid.
// Use: both save routes, first thing. isNew = true for create, false for update.
function validateSaveRequest(body: unknown, isNew: boolean): SaveRequest {
  if (typeof body !== 'object' || body === null) {
    throw httpError(400, 'Request body must be a JSON object');
  }
  const input = body as Record<string, unknown>;

  const source = input.source ?? 'word';
  if (source !== 'word' && source !== 'google') {
    throw httpError(400, 'source must be "word" or "google"');
  }

  if (typeof input.publish !== 'boolean') {
    throw httpError(400, 'publish must be true or false');
  }

  if (!Array.isArray(input.fields) || input.fields.length === 0) {
    throw httpError(400, 'fields must contain at least one field');
  }
  const fields = input.fields.map((field, index) => {
    return validateField(field, index);
  });

  const aliases = fields.map((field) => {
    return field.alias;
  });
  const duplicate = aliases.find((alias, index) => {
    return aliases.indexOf(alias) !== index;
  });
  if (duplicate !== undefined) {
    throw httpError(400, `Field "${duplicate}" is filled more than once`);
  }

  if (isNew && !isFilledString(input.documentTypeId)) {
    throw httpError(400, 'documentTypeId is required when creating');
  }
  if (isNew && !isFilledString(input.name)) {
    throw httpError(400, 'name is required when creating');
  }
  if (input.parentId !== undefined && input.parentId !== null && !isFilledString(input.parentId)) {
    throw httpError(400, 'parentId must be an id or null');
  }

  return {
    source,
    documentTypeId: isFilledString(input.documentTypeId) ? input.documentTypeId.trim() : undefined,
    parentId: isFilledString(input.parentId) ? input.parentId.trim() : null,
    name: isFilledString(input.name) ? input.name.trim() : undefined,
    publish: input.publish,
    fields
  };
}

// Creates a NEW node of the chosen document type with the filled fields, and publishes it if asked.
// Use: POST /api/content, when the user chose "New" and clicked a save button.
// Answers 201 { id, name, published }. The add-in stores the id in the Word document.
async function createContent(req: express.Request, res: express.Response): Promise<void> {
  const request = validateSaveRequest(req.body, true);
  const documentTypeId = request.documentTypeId as string; // checked by validateSaveRequest
  const name = request.name as string; // checked by validateSaveRequest

  const properties = await getDocumentTypeProperties(documentTypeId);
  const values = convertFields(request.fields, properties, request.source);

  const id = await createDocument(
    buildCreateBody({ documentTypeId, parentId: request.parentId, name, values })
  );

  if (request.publish) {
    await publishDocument(id);
  }

  res.status(201).json({ id, name, published: request.publish });
}

// Updates an EXISTING node: the filled fields are replaced, all other fields keep their value.
// Publishes it afterwards if asked.
// Use: PUT /api/content/:id, when the user picked an existing node and clicked a save button.
// Answers 200 { id, published }, or 404 if the node was deleted (the add-in forgets the id).
async function updateContent(req: express.Request, res: express.Response): Promise<void> {
  const request = validateSaveRequest(req.body, false);
  const id = String(req.params.id);

  // Read first: PUT empties every value we leave out, so we need the current ones.
  const existing = await getDocument(id);
  if (existing === null) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }

  const properties = await getDocumentTypeProperties(existing.documentType.id);
  const newValues = convertFields(request.fields, properties, request.source);

  await updateDocument(id, buildUpdateBody(existing, newValues, request.name));

  if (request.publish) {
    await publishDocument(id);
  }

  res.json({ id, published: request.publish });
}

contentRouter.post('/', createContent);
contentRouter.put('/:id', updateContent);
