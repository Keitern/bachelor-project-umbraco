// Responsible for turning the user's filled fields into values Umbraco accepts.
//
// Turns the fields the user filled in the task pane into the values array for Umbraco.
// For each field: find the property, clean the HTML, pick the converter for its data type, run it.
// Pure functions: no network. The properties come from client.getDocumentTypeProperties.

import { httpError } from '../httpError.ts';
import { SUPPORTED_EDITORS } from './converters.ts';
import { normalizeWord } from './normalizeWord.ts';
import { value } from './requestBodies.ts';
import type { DocumentTypeProperty, DocumentValue } from '../umbraco/client.ts';

// One field the user filled: which field, and the marked text as HTML.
export interface FilledField {
  alias: string; // e.g. 'bodyText'
  html: string; // from Office.js getSelection().getHtml()
}

// Where the HTML came from. Decides how it is cleaned.
export type Source = 'word' | 'google';

// Cleans the HTML with the cleaner for its source.
function normalize(html: string, source: Source): string {
  if (source === 'word') {
    return normalizeWord(html);
  }
  throw httpError(400, `Source "${source}" is not supported yet`);
}

// Converts every filled field into an Umbraco value. Throws 400 for unknown or unsupported fields.
// Use: the save routes, before building the create/update body.
export function convertFields(fields: FilledField[], properties: DocumentTypeProperty[], source: Source): DocumentValue[] {
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
