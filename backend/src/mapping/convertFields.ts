/**
 * @file Responsible for turning the user's filled fields into values Umbraco accepts.
 *
 * Turns the fields the user filled in the task pane into the values array for Umbraco.
 * For each field: find the property, clean the HTML, pick the converter for its data type, run it.
 * Pure functions: no network. The properties come from client.getDocumentTypeProperties.
 */

import { httpError } from '../httpError.ts';
import { SUPPORTED_EDITORS } from './converters.ts';
import { normalizeWord } from './normalizeWord.ts';
import { value } from './requestBodies.ts';
import type { DocumentTypeProperty, DocumentValue } from '../umbraco/client.ts';

/** One field the user filled: which field, and the marked text as HTML. */
export interface FilledField {
  /** e.g. 'bodyText'. */
  alias: string;
  /** From Office.js getSelection().getHtml(). */
  html: string;
}

/** Where the HTML came from. Decides how it is cleaned. */
export type Source = 'word' | 'google';

/**
 * Cleans the HTML with the cleaner for its source.
 * Use: convertFields, on every field before it is converted.
 *
 * @param html - The marked text as the add-in sent it.
 * @param source - Where it came from.
 * @returns Clean HTML (see normalizeWord).
 * @throws {Error} 400 for 'google', which isn't supported yet.
 */
function normalize(html: string, source: Source): string {
  if (source === 'word') {
    return normalizeWord(html);
  }
  throw httpError(400, `Source "${source}" is not supported yet`);
}

/**
 * Converts every filled field into an Umbraco value.
 * Use: the save routes, before building the create/update body.
 *
 * @param fields - The fields the user filled.
 * @param properties - The document type's fields (from client.getDocumentTypeProperties).
 * @param source - Where the HTML came from.
 * @returns One Umbraco value per filled field, in the same order.
 * @throws {Error} 400 for an unknown field, a field we can't fill, or text the converter rejects.
 */
export function convertFields(
  fields: FilledField[],
  properties: DocumentTypeProperty[],
  source: Source
): DocumentValue[] {
  return fields.map((field) => {
    const property = properties.find((p) => {
      return p.alias === field.alias;
    });
    if (!property) {
      throw httpError(400, `The document type has no field "${field.alias}"`);
    }

    const converter = SUPPORTED_EDITORS[property.editorAlias];
    if (!converter) {
      throw httpError(
        400,
        `Field "${field.alias}" (${property.editorAlias}) cannot be filled from text`
      );
    }

    const cleanHtml = normalize(field.html, source);
    return value(field.alias, converter(cleanHtml, property.config));
  });
}
