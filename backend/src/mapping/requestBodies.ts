/**
 * @file Responsible for building what we send to Umbraco when creating or updating a page.
 *
 * Builds the request bodies for the Management API (POST /document and PUT /document/{id}).
 * Pure functions: no network. Formats confirmed by the spike (Umbraco 18).
 */

import { randomUUID } from 'node:crypto';
import type {
  CreateDocumentBody,
  DocumentResponse,
  DocumentValue,
  UpdateDocumentBody
} from '../umbraco/client.ts';

/** Everything buildCreateBody needs. One object instead of 4 parameters (max-params rule). */
export interface CreateInput {
  documentTypeId: string;
  /** null = root. */
  parentId: string | null;
  /** Node name shown in the backoffice tree. */
  name: string;
  /** From convertFields. */
  values: DocumentValue[];
}

/**
 * Builds one entry of the values array. culture/segment null = invariant (one language).
 * Use: convertFields, for every field the user filled.
 *
 * @param alias - The field's alias, e.g. 'title'.
 * @param propertyValue - The converted value (see converters.ts).
 * @returns { alias, culture: null, segment: null, value }.
 */
export function value(alias: string, propertyValue: unknown): DocumentValue {
  return { alias, culture: null, segment: null, value: propertyValue };
}

/**
 * Builds the body for creating a new node (client.createDocument).
 * Use: the create route, when the user chose "Add new ..." and clicked a save button.
 *
 * We generate the id ourselves, so we know the new node's id without reading Umbraco's answer.
 *
 * @param input - Document type, parent, name and values of the new node.
 * @returns The POST /document body, without a template.
 */
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

/**
 * Builds the body for updating an existing node (client.updateDocument).
 * Use: the update route.
 *
 * PUT empties every value we leave out (tested), so this starts from the node's current values
 * and only replaces (or adds) the ones the user filled.
 *
 * @param existing - The node as it is now (from client.getDocument).
 * @param newValues - The values the user filled (from convertFields).
 * @param name - New node name, or undefined to keep the current one.
 * @returns The PUT /document/{id} body with ALL values.
 */
export function buildUpdateBody(
  existing: DocumentResponse,
  newValues: DocumentValue[],
  name?: string
): UpdateDocumentBody {
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
