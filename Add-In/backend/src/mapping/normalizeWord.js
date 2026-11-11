// @ts-check
// Cleans Word HTML (from body.getHtml()) into the shared clean HTML format.
// Pure functions: HTML string in, HTML string out. No network, no Express. Easy to unit test.
// Needs (phase 4): npm install sanitize-html

/**
 * normalizeWord(html)  (exported)
 *
 * The main function of this file. Runs the steps below in order and returns clean HTML
 * that extract.js can rely on. Google Docs gets its own normalizeGoogle.js later, which
 * must produce the SAME clean format, so extract.js and toUmbraco.js work for both.
 *
 * Clean format (target):
 *   - only these tags: h1-h6, p, strong, em, u, a, ul, ol, li, blockquote, br,
 *     table, thead, tbody, tr, th, td, img
 *   - no class, style, lang or id attributes (except href on a, src/alt on img)
 *   - no empty paragraphs
 *
 * @param {string} html   raw HTML from Office.js body.getHtml()
 * @returns {string}      clean HTML
 */

/**
 * removeWordJunk(html)
 *
 * Removes things Word adds that are never content, BEFORE sanitising:
 *   - <!--[if ...]> ... <![endif]--> conditional comments and other comments
 *   - <style> and <meta> blocks, <o:p></o:p> and other namespaced tags (o:, w:, v:)
 *
 * @param {string} html
 * @returns {string}
 */

/**
 * convertWordFormatting(html)
 *
 * Word often marks headings and bold/italic with classes or inline styles instead of tags.
 * Converts those to real tags so the information survives sanitising:
 *   - <p class="MsoTitle"> / class="MsoHeading1"  -> <h1>  (check real output first!)
 *   - <span style="font-weight:bold">             -> <strong>
 *   - <span style="font-style:italic">            -> <em>   (needed to find the teaser)
 *   - <b> -> <strong>, <i> -> <em>
 * Look at real getHtml() output before writing this: save it as a test fixture.
 *
 * @param {string} html
 * @returns {string}
 */

/**
 * sanitize(html)
 *
 * Uses sanitize-html with the allowed tags/attributes from the clean format above.
 * Everything else is removed (the tag is dropped, its text is kept).
 * Also the safety step: removes scripts, event handlers (onclick) and javascript: links.
 *
 * @param {string} html
 * @returns {string}
 */

/**
 * removeEmptyElements(html)
 *
 * Removes paragraphs that only contain whitespace or &nbsp; (Word adds many),
 * and collapses repeated <br>.
 *
 * @param {string} html
 * @returns {string}
 */
