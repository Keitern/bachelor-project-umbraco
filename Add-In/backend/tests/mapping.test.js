// @ts-check
// Unit tests for the mapping pipeline using real example documents.
// Run with `npm test` in Add-In/backend. Import from vitest: import { describe, it, expect } from 'vitest';
// Put real Word HTML (saved from body.getHtml()) in tests/fixtures/*.html and read it with
// fs.readFileSync, so tests run against actual Word output, not hand-written HTML.

/**
 * describe('normalizeWord')
 *   - removes Word junk: comments, <style>, <o:p>, mso- styles and classes
 *   - turns bold/italic spans into <strong>/<em>
 *   - removes empty paragraphs
 *   - removes <script> and onclick attributes (safety)
 *   - keeps normal content (headings, lists, links) unchanged
 */

/**
 * describe('extract')
 *   - title is the text of the first <h1>
 *   - title is '' when there is no <h1>
 *   - teaser is the first paragraph that is entirely italic
 *   - a paragraph with only one italic word is NOT the teaser
 *   - title and teaser are not repeated in bodyHtml
 *   - only the FIRST <h1> becomes the title; a second <h1> stays in the body
 */

/**
 * describe('toUmbraco')
 *   - builds variants with culture null and the title as name
 *   - title and teaser are plain strings
 *   - bodyText is { markup, blocks: { layout: {}, contentData: [], settingsData: [], expose: [] } }
 *   - parent is null without parentId, { id } with parentId
 *   - uses the given id, or generates a UUID when none is given
 *   - toUmbracoUpdate has no id, parent or documentType
 */

/**
 * describe('full pipeline')
 *   - fixture simple-article.html -> normalizeWord -> extract -> toUmbraco
 *     gives the expected request body (compare with toEqual or a snapshot: toMatchSnapshot)
 */
