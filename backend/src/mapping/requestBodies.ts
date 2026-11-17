// Responsible for building what we send to Umbraco when creating or updating a page.
//
// Builds the request bodies for the Management API (POST /document and PUT /document/{id}).
// Pure functions: no network. Formats confirmed by the spike (Umbraco 18).

import { randomUUID } from 'node:crypto';
import type {
  CreateDocumentBody,
  DocumentResponse,
  DocumentValue,
  UpdateDocumentBody
} from '../umbraco/client.ts';

// Everything buildCreateBody needs. One object instead of 4 parameters (max-params rule).
export interface CreateInput {
  documentTypeId: string;
  parentId: string | null; // null = root
  name: string; // node name shown in the backoffice tree
  values: DocumentValue[]; // from convertFields
}

// Builds one entry of the values array. culture/segment null = invariant (one language).
// Use: convertFields, for every field the user filled.
export function value(alias: string, propertyValue: unknown): DocumentValue {
  return { alias, culture: null, segment: null, value: propertyValue };
}

// Builds the body for creating a new node (client.createDocument).
// Use: the create route, when the user chose "New" and clicked a save button.
// We generate the id ourselves, so we know the new node's id without reading Umbraco's answer.
export function buildCreateBody(input: CreateInput): CreateDocumentBody {
  return {
    id: randomUUID(),
    parent: input.parentId ? { id: input.parentId } : null,
    documentType: { id: input.documentTypeId },
    template: null,
    variants: [{ culture: null, segment: null, name: input.name }],
    values: input.values
  };
}

// Builds the body for updating an existing node (client.updateDocument).
// Use: the update route. PUT empties every value we leave out (tested), so this starts from
// the node's current values and only replaces (or adds) the ones the user filled.
export function buildUpdateBody(existing: DocumentResponse, newValues: DocumentValue[], name?: string): UpdateDocumentBody {
  // Same alias + culture + segment = the same value slot
  const sameSlot = (a: DocumentValue, b: DocumentValue): boolean => {
    return a.alias === b.alias && a.culture === b.culture && a.segment === b.segment;
  };

  // Current values, without editorAlias (Umbraco sends it, but does not accept it back)
  const kept = existing.values
    .map((v) => {
      return { alias: v.alias, culture: v.culture, segment: v.segment, value: v.value };
    })
    .filter((v) => {
      return !newValues.some((n) => {
        return sameSlot(v, n);
      });
    });

  return {
    template: existing.template ?? null,
    variants: existing.variants.map((v) => {
      return { culture: v.culture, segment: v.segment, name: name ?? v.name };
    }),
    values: [...kept, ...newValues]
  };
}
