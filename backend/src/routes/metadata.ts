// Responsible for the task pane's dropdowns: document types, fields and existing pages.

// GET endpoints the task pane uses to fill its dropdowns. Read-only, no mapping.
// index.ts mounts this router at /api, so the paths here start at '/'.

// Express 5 passes errors from async handlers to errorHandler automatically,
// so the handlers can just `throw` (no try/catch needed).

import express from 'express';
import {
  getContentChildren,
  getDocument,
  getDocumentsByType,
  getDocumentTypeProperties,
  getDocumentTypes
} from '../umbraco/client.ts';
import { isSupportedEditor } from '../mapping/converters.ts';
import { httpError } from '../httpError.ts';

export const metadataRouter = express.Router();

// Reads one query parameter as a string, e.g. ?documentTypeId=abc -> 'abc'.
// Returns undefined when it is missing, empty, or sent more than once.
function queryString(req: express.Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

// Lists the document types that can be created as pages: [{ id, name, icon }].
// Use: the first dropdown in the task pane ("what kind of page?").
async function listDocumentTypes(req: express.Request, res: express.Response): Promise<void> {
  const types = await getDocumentTypes();

  res.json(
    types.map((type) => {
      return { id: type.id, name: type.name, icon: type.icon };
    })
  );
}

// Lists the fields of one document type: [{ alias, name, editorAlias, mandatory, supported }].
// Use: the field dropdown, where the user picks where their marked text should go.
async function listFields(req: express.Request, res: express.Response): Promise<void> {
  const properties = await getDocumentTypeProperties(String(req.params.id));

  res.json(
    properties.map((property) => {
      return {
        alias: property.alias,
        name: property.name,
        editorAlias: property.editorAlias,
        mandatory: property.mandatory,
        // false = we can't fill this kind of field from text, so the pane can grey it out
        supported: isSupportedEditor(property.editorAlias)
      };
    })
  );
}

// Lists the existing nodes of one document type: [{ id, name, state }].
// Use: the "update existing" dropdown, after the user picked a document type.
async function listDocuments(req: express.Request, res: express.Response): Promise<void> {
  const documentTypeId = queryString(req, 'documentTypeId');
  if (documentTypeId === undefined) {
    throw httpError(400, 'Query parameter documentTypeId is required');
  }

  const nodes = await getDocumentsByType(documentTypeId);

  res.json(
    nodes.map((node) => {
      return { id: node.id, name: node.name, state: node.state };
    })
  );
}

// Lists the nodes directly under a node, or the top-level nodes without parentId:
// [{ id, name, hasChildren }].
// Use: an optional parent picker, to choose where a new node is created.
async function listParents(req: express.Request, res: express.Response): Promise<void> {
  const parentId = queryString(req, 'parentId') ?? null;

  const nodes = await getContentChildren(parentId);

  res.json(
    nodes.map((node) => {
      return { id: node.id, name: node.name, hasChildren: node.hasChildren };
    })
  );
}

// Max length of a preview text, so a long body text stays one short line in the task pane
const PREVIEW_LENGTH = 80;

// Turns a stored Umbraco value into a short, readable text. Rich text is { markup }, lists are
// arrays, everything else is shown as text. HTML tags are stripped. Returns '' when empty.
// Use: listDocumentValues, for the grey preview line under each field in the task pane.
function previewText(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) {
    text = '';
  } else if (typeof value === 'string') {
    text = value;
  } else if (Array.isArray(value)) {
    text = value
      .map((item) => {
        return typeof item === 'object' && item !== null && 'name' in item
          ? String(item.name)
          : String(item);
      })
      .join(', ');
  } else if (typeof value === 'object' && 'markup' in value) {
    text = String(value.markup ?? '');
  } else {
    text = String(value);
  }

  const plain = text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > PREVIEW_LENGTH ? `${plain.slice(0, PREVIEW_LENGTH)}...` : plain;
}

// Returns one node's name and a short preview of each field: { id, name, values: { alias: text } }.
// Use: the field cards in the task pane, so the user sees what is in a field before replacing it.
async function listDocumentValues(req: express.Request, res: express.Response): Promise<void> {
  const node = await getDocument(String(req.params.id));
  if (node === null) {
    throw httpError(404, 'Node not found');
  }

  const values: Record<string, string> = {};
  for (const entry of node.values) {
    values[entry.alias] = previewText(entry.value);
  }

  res.json({ id: node.id, name: node.variants[0]?.name ?? '', values });
}

metadataRouter.get('/document-types', listDocumentTypes);
metadataRouter.get('/document-types/:id/fields', listFields);
metadataRouter.get('/documents', listDocuments);
metadataRouter.get('/documents/:id/values', listDocumentValues);
metadataRouter.get('/content-tree', listParents);
