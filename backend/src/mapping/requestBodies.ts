// Builds the request bodies for the Management API (POST /document and PUT /document/{id}).
// Pure functions: no network. Formats confirmed by the spike (Umbraco 18).

/**
 * buildCreateBody({ documentTypeId, parentId, name, values })  (exported)
 *
 * Body for POST /document (client.createDocument):
 *   {
 *     id:           crypto.randomUUID(),            // we generate it, so we know it
 *     parent:       parentId ? { id: parentId } : null,   // null = root
 *     documentType: { id: documentTypeId },
 *     template:     null,                           // or the type's default template
 *     variants:     [{ culture: null, segment: null, name }],
 *     values
 *   }
 * Takes one object instead of 4 parameters (max-params rule).
 *
 * @param {{ documentTypeId: string, parentId: string | null, name: string,
 *           values: Array<object> }} input
 * @returns {object}
 */

/**
 * buildUpdateBody(existing, newValues, name)  (exported)
 *
 * Body for PUT /document/{id} (client.updateDocument). Keeps everything the user did not touch:
 *   - values: start from existing.values (only alias, culture, segment, value - drop
 *     editorAlias), then REPLACE every entry whose alias is in newValues, and add the
 *     newValues entries that did not exist yet.
 *   - variants: existing variants (culture, segment, name); use the new name if given.
 *   - template: existing.template ?? null
 *
 * @param {object} existing        result of client.getDocument(id)
 * @param {Array<object>} newValues result of convertFields
 * @param {string} [name]          new node name (optional)
 * @returns {object}
 */

/**
 * value(alias, propertyValue)  (exported)
 *
 * Helper that builds one entry of the values array (also used by convertFields.ts):
 *   { alias, culture: null, segment: null, value: propertyValue }
 *
 * @param {string} alias
 * @param {unknown} propertyValue
 * @returns {{ alias: string, culture: null, segment: null, value: unknown }}
 */
