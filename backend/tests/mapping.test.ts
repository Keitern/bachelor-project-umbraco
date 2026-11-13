// Unit tests for the mapping (normalizeWord, htmlToValues, converters, convertFields, requestBodies) using real example selections.
// Run with `npm test` in Add-In/backend. Import from vitest: import { describe, it, expect } from 'vitest';
// Put real Word HTML (saved from getSelection().getHtml()) in tests/fixtures/*.html and read it
// with fs.readFileSync, so tests run against actual Word output, not hand-written HTML.

/**
 * describe('normalizeWord')
 *   - removes Word junk: comments, <style>, <o:p>, mso- styles and classes
 *   - turns bold/italic spans into <strong>/<em>, Word lists into <ul><li>
 *   - removes empty paragraphs
 *   - removes <script> and onclick attributes (safety)
 *   - a selection of a single word still gives valid HTML
 */

/**
 * describe('htmlToValues')
 *   - toPlainText strips tags and decodes entities ('&amp;' -> '&')
 *   - toPlainText turns paragraphs into line breaks
 *   - toLines gives one entry per paragraph / list item, no empty entries
 *   - extractLinks returns name + url and skips javascript: links
 */

/**
 * describe('converters')  - one block per data type in converters.ts
 *   - Textstring: plain text on one line; too long for maxChars -> error
 *   - Textarea: plain text with line breaks
 *   - Rich text: { markup, blocks: { layout: {}, contentData: [], settingsData: [], expose: [] } }
 *   - Markdown: heading and bold become '##' and '**'
 *   - Repeatable textstrings / Tags: arrays, trimmed, no duplicates (tags)
 *   - Date: '2026-11-11' and '11-11-2026' work, 'hello' -> error
 *   - Number: '4,2' -> 4.2, 'abc' -> error
 *   - URL picker: selection with 2 links -> 2 link objects, no links -> error
 */

/**
 * describe('convertFields')
 *   - picks the converter by the property's editorAlias
 *   - unknown alias -> error 400
 *   - unsupported editor (e.g. Umbraco.ContentPicker) -> error 400
 */

/**
 * describe('buildCreateBody / buildUpdateBody')
 *   - create: parent null without parentId, { id } with parentId; variants contain the name
 *   - update: values the user did NOT fill are kept unchanged
 *   - update: values the user filled REPLACE the existing ones
 *   - update: a field that had no value before is added
 *   - update: editorAlias is not sent back
 */
