// @ts-check
// Turns the fields the user filled in the task pane into the values array for Umbraco.
// For each field it finds the property, picks the converter for its data type and runs it.
// Pure functions: no network. The properties come from client.getDocumentTypeProperties.

/**
 * convertFields(fields, properties, source)  (exported)
 *
 * For every field the user filled:
 *   1. property = properties.find(p => p.alias === field.alias)  -> 400 if not found
 *   2. converter = SUPPORTED_EDITORS[property.editorAlias] (converters.js) -> 400 if not supported
 *   3. cleanHtml = normalizeWord(field.html)   (normalizeGoogle when source === 'google')
 *   4. value(field.alias, converter(cleanHtml, property.config))   (value from requestBodies.js)
 * Returns the values array for the request body.
 *
 * @param {Array<{ alias: string, html: string }>} fields         from the add-in
 * @param {Array<{ alias: string, editorAlias: string, config: any }>} properties
 * @param {string} source   'word' | 'google'
 * @returns {Array<{ alias: string, culture: null, segment: null, value: unknown }>}
 */
