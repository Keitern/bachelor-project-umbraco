// @ts-check
// Builds the Management API request body (values, variants, RTE value).
// This is the FORMAT mapping: transforming each value to fit the property's data type.
// Pure functions: no network. The formats below were confirmed by the spike (Umbraco 18).

/**
 * toUmbraco(extracted, options)  (exported)
 *
 * The main function of this file. Combines the helpers below into the body for
 * POST /document (client.createDocument):
 *   {
 *     id:           options.id ?? crypto.randomUUID(),  // we generate it, so we know it
 *     parent:       options.parentId ? { id: options.parentId } : null,  // null = root
 *     documentType: { id: options.documentTypeId },
 *     template:     null,                               // Article has no template
 *     variants:     buildVariants(extracted.title),
 *     values:       buildValues(extracted)
 *   }
 *
 * @param {{ title: string, teaser: string, bodyHtml: string }} extracted   from extract.js
 * @param {{ id?: string, documentTypeId: string, parentId?: string | null }} options
 * @returns {object}
 */

/**
 * toUmbracoUpdate(extracted)  (exported)
 *
 * Same as toUmbraco, but for PUT /document/{id} (client.updateDocument):
 * only { template: null, variants, values }, no id, parent or documentType.
 * Check the exact PUT body in Swagger.
 *
 * @param {{ title: string, teaser: string, bodyHtml: string }} extracted
 * @returns {object}
 */

/**
 * buildVariants(name)
 *
 * Article does not vary by culture, so there is one variant:
 *   [{ culture: null, segment: null, name }]
 * The name is the node name shown in the backoffice tree (= the title).
 *
 * @param {string} name
 * @returns {Array<{ culture: null, segment: null, name: string }>}
 */

/**
 * buildValues(extracted)
 *
 * Returns the values array, one entry per property, using value() for each:
 *   value('title',    extracted.title)                    // Umbraco.TextBox  -> plain string
 *   value('teaser',   extracted.teaser)                   // Umbraco.TextArea -> plain string
 *   value('bodyText', toRichText(extracted.bodyHtml))     // Umbraco.RichText -> object
 * Skip teaser if it is empty, so Umbraco keeps the property empty instead of ''.
 *
 * @param {{ title: string, teaser: string, bodyHtml: string }} extracted
 * @returns {Array<object>}
 */

/**
 * value(alias, propertyValue)
 *
 * Small helper that builds one entry of the values array:
 *   { alias, culture: null, segment: null, value: propertyValue }
 *
 * @param {string} alias
 * @param {unknown} propertyValue
 * @returns {{ alias: string, culture: null, segment: null, value: unknown }}
 */

/**
 * toRichText(html)
 *
 * Wraps HTML in the Umbraco 18 rich text format. `blocks` must be this full empty
 * structure, NOT null (found in the spike):
 *   {
 *     markup: html,
 *     blocks: { layout: {}, contentData: [], settingsData: [], expose: [] }
 *   }
 *
 * @param {string} html
 * @returns {{ markup: string, blocks: object }}
 */
