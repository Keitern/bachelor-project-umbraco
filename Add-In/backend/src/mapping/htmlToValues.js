// @ts-check
// Pulls specific kinds of content out of the (clean) marked HTML: plain text, lines, links,
// list items, images. Used by converters.js to build values for fields that are NOT rich text.
//
// Note: in the chosen workflow the USER decides which marked text goes to which field
// (structure mapping is done in the task pane). This file no longer guesses title/teaser;
// it only answers "what does this piece of HTML contain".
//
// Pure functions: HTML string in, data out. Needs (phase 4): npm install cheerio

/**
 * toPlainText(cleanHtml)  (exported)
 *
 * Returns the text without any tags, for Textstring / Textarea and similar fields:
 *   - text of all elements, entities decoded (&amp; -> &)
 *   - block elements (p, h1-h6, li, br) become line breaks '\n'
 *   - repeated whitespace collapsed, result trimmed
 * Example: '<h1>My <em>title</em></h1>' -> 'My title'
 *
 * @param {string} cleanHtml
 * @returns {string}
 */

/**
 * toLines(cleanHtml)  (exported)
 *
 * Splits the marked text into separate, non-empty lines, one per paragraph / list item / <br>.
 * Used for list-like fields: Repeatable textstrings, Tags.
 * Example: '<ul><li>One</li><li>Two</li></ul>' -> ['One', 'Two']
 *
 * @param {string} cleanHtml
 * @returns {string[]}
 */

/**
 * extractLinks(cleanHtml)  (exported)
 *
 * Returns every <a href> in the selection, for the Multi URL Picker field:
 *   [{ name: link text, url: href }]
 * Skips links without href and javascript: links.
 *
 * @param {string} cleanHtml
 * @returns {Array<{ name: string, url: string }>}
 */

/**
 * extractImages(cleanHtml)  (exported, phase 7, optional)
 *
 * Returns the src of every <img> in the selection (Word usually gives base64 data URIs),
 * for the Media Picker field. Upload happens in client.uploadImage.
 *
 * @param {string} cleanHtml
 * @returns {string[]}
 */
