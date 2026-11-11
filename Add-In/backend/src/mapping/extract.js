// @ts-check
// Finds title (first H1), teaser (first italic paragraph), body and images.
// This is the STRUCTURE mapping: which part of the document goes to which property.
// Input is the clean HTML from normalizeWord / normalizeGoogle.
// Needs (phase 4): npm install cheerio  (or jsdom) to search the HTML as a tree.

/**
 * extract(cleanHtml)  (exported)
 *
 * The main function of this file. Loads the HTML once (cheerio.load) and uses the helpers
 * below. Elements used for title and teaser are REMOVED from the tree, so they are not
 * repeated in the body.
 *
 * Conventions for the Article document type:
 *   first <h1>             -> title (also used as node name)
 *   first italic paragraph -> teaser
 *   rest of the document   -> body
 *   first <img>            -> mainImage (phase 7, optional)
 *
 * @param {string} cleanHtml
 * @returns {{ title: string, teaser: string, bodyHtml: string, images: string[] }}
 */

/**
 * extractTitle($)
 *
 * Finds the first <h1>, returns its plain text (trimmed) and removes it from the tree.
 * If there is no <h1>: return '' and let the service decide (e.g. answer 400
 * "Document needs a Heading 1 as title", or fall back to "Untitled").
 *
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string}
 */

/**
 * extractTeaser($)
 *
 * Finds the first <p> whose ENTIRE text is italic (the <p> contains only one <em>,
 * ignoring whitespace). A paragraph with just one italic word is NOT a teaser.
 * Returns its plain text and removes it from the tree. Returns '' if none is found.
 *
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string}
 */

/**
 * extractImages($)  (phase 7, optional)
 *
 * Collects the src of every <img> (Word gives base64 data URIs or file references).
 * The first one becomes mainImage. Decide whether images stay in the body or are removed.
 *
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string[]}
 */

/**
 * getBodyHtml($)
 *
 * Returns what is left in the tree after title and teaser are removed, as an HTML string
 * ($('body').html() ?? '').trim(). This becomes bodyText.
 *
 * @param {import('cheerio').CheerioAPI} $
 * @returns {string}
 */
