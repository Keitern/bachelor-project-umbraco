// Converters: one function per supported data type. Each turns clean HTML (the marked text)
// into the value format that data type expects. Pure functions: no network.
// Signature of every converter: (cleanHtml, config) => value
//
// Supported data types (the 10 most relevant for writing articles / blog posts).
// Formats marked (spike) were confirmed in Umbraco 18. The others: verify ONCE by filling the
// field by hand in the backoffice and reading the node with GET /document/{id}.
//
//  #  | Data type (backoffice)  | editorAlias               | Value sent to Umbraco
//  ---|-------------------------|---------------------------|-------------------------------------
//  1  | Textstring              | Umbraco.TextBox           | 'plain text' (one line)   (spike)
//  2  | Textarea                | Umbraco.TextArea          | 'plain text\nwith lines'  (spike)
//  3  | Rich Text Editor        | Umbraco.RichText          | { markup, blocks: {...} } (spike)
//  4  | Markdown Editor         | Umbraco.MarkdownEditor    | '# markdown string'  (needs turndown)
//  5  | Repeatable Textstrings  | Umbraco.MultipleTextstring| ['line 1', 'line 2']
//  6  | Tags                    | Umbraco.Tags              | ['tag1', 'tag2']
//  7  | Date / Date Time        | Umbraco.DateTime (*)      | '2026-11-11 00:00:00' (check format)
//  8  | Numeric / Decimal       | Umbraco.Integer / .Decimal| 42 / 4.2
//  9  | Multi URL Picker        | Umbraco.MultiUrlPicker    | [{ name, url, target: null, ... }]
//  10 | Media Picker (image)    | Umbraco.MediaPicker3      | [{ key, mediaKey }]  (phase 7, optional)
//
// (*) Newer Umbraco versions also have separate date editors (date only, date + time).
//     Check which editorAlias your Date Picker data type uses.

/**
 * SUPPORTED_EDITORS (exported constant, not a function)
 *
 * Object that maps each editorAlias from the table above to its converter function in this file:
 *   { 'Umbraco.TextBox': toTextstring, 'Umbraco.RichText': toRichText, ... }
 * Adding a new data type later = write one converter and add one line here.
 */

/**
 * isSupportedEditor(editorAlias)  (exported)
 *
 * true if editorAlias is a key in SUPPORTED_EDITORS. Used by routes/metadata.ts so the
 * task pane can grey out fields that cannot be filled from text.
 *
 * @param {string} editorAlias
 * @returns {boolean}
 */

/**
 * toTextstring(cleanHtml)
 *
 * toPlainText(cleanHtml) (htmlToValues.ts) with line breaks replaced by spaces.
 * If the data type config has a maxChars setting, throw 400 when the text is too long
 * (better than cutting it off silently).
 */

/**
 * toTextarea(cleanHtml)
 *
 * toPlainText(cleanHtml) - keeps line breaks between paragraphs.
 */

/**
 * toRichText(cleanHtml)
 *
 * Wraps the HTML in the Umbraco 18 rich text format. `blocks` must be this full empty
 * structure, NOT null (found in the spike):
 *   { markup: cleanHtml, blocks: { layout: {}, contentData: [], settingsData: [], expose: [] } }
 */

/**
 * toMarkdown(cleanHtml)
 *
 * Converts HTML to Markdown, e.g. with the `turndown` package (npm install turndown):
 *   '<h2>Intro</h2><p><strong>Hi</strong></p>' -> '## Intro\n\n**Hi**'
 */

/**
 * toRepeatableTextstrings(cleanHtml)
 *
 * toLines(cleanHtml) (htmlToValues.ts) -> ['line 1', 'line 2'].
 */

/**
 * toTags(cleanHtml)
 *
 * toPlainText, split on commas and line breaks, trim, drop empty and duplicate tags
 * -> ['umbraco', 'word', 'cms'].
 */

/**
 * toDate(cleanHtml)
 *
 * toPlainText, then parse it as a date. Accept at least '2026-11-11' and '11-11-2026'.
 * Throw 400 "Could not read a date from the marked text" if parsing fails.
 * Return the string format Umbraco expects (check by reading a node with a date set).
 */

/**
 * toNumber(cleanHtml)
 *
 * toPlainText, accept both '4.2' and '4,2', Number(...). Throw 400 if it is not a number.
 * Integer editor: also throw if it has decimals.
 */

/**
 * toUrlPicker(cleanHtml)
 *
 * extractLinks(cleanHtml) (htmlToValues.ts) mapped to Umbraco's link objects:
 *   [{ name, url, target: null, type: 'external', unique: null, icon: null, published: true,
 *      queryString: null }]   - verify the exact keys by reading a node with a link set.
 * Throw 400 if the selection contains no links.
 */

/**
 * toMediaPicker(cleanHtml)   (phase 7, optional - needs an upload, so it is async)
 *
 * extractImages -> client.uploadImage for the first image -> [{ key: randomUUID(), mediaKey }].
 * Because this needs the network, it breaks the "pure functions" rule of this file: call the
 * upload from the route first, or leave this data type out if time is short.
 */
