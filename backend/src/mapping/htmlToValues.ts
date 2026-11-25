/**
 * Responsible for reading plain text, lines, links and images out of HTML.
 *
 * Pulls specific kinds of content out of clean HTML (the marked text after normalizeWord):
 * plain text, lines, links, images. Used by converters.ts for fields that are NOT rich text.
 * Pure functions: HTML string in, data out.
 *
 * @module
 */

import * as cheerio from 'cheerio';

/** Elements that start a new line in plain text (a CSS selector for Cheerio). */
const BLOCK_ELEMENTS = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, tr';

/**
 * Returns the text without tags. Paragraphs, headings, list items and <br> become line breaks,
 * entities are decoded (&amp; -> &), spaces are collapsed and empty lines removed.
 * Use: Textstring, Textarea, Tags, Date and Number fields.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The plain text, one line per block, e.g. "Heading\nFirst paragraph".
 */
export function toPlainText(cleanHtml: string): string {
  // Line breaks in the HTML source are just spaces in HTML. Only <br> and block elements
  // (added below) should become real line breaks in the text.
  const parsedHtml = cheerio.load(cleanHtml.replace(/\s+/g, ' '), null, false);

  parsedHtml('br').replaceWith('\n');
  parsedHtml(BLOCK_ELEMENTS).each((_, element) => {
    parsedHtml(element).append('\n');
  });

  return parsedHtml
    .root()
    .text()
    .replace(/ /g, ' ') // &nbsp; -> normal space
    .split('\n')
    .map((line) => {
      return line.replace(/\s+/g, ' ').trim();
    })
    .filter((line) => {
      return line !== '';
    })
    .join('\n');
}

/**
 * Splits the text into separate non-empty lines: one per paragraph, list item or <br>.
 * Use: list-like fields (Repeatable textstrings).
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The lines, or [] when there is no text.
 */
export function toLines(cleanHtml: string): string[] {
  const text = toPlainText(cleanHtml);
  return text === '' ? [] : text.split('\n');
}

/**
 * Returns every link in the selection. Skips empty and javascript: links.
 * Use: the Multi URL Picker field.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns [{ name, url }]. name is the link text, or the url if the link has no text.
 */
export function extractLinks(cleanHtml: string): Array<{ name: string; url: string }> {
  const parsedHtml = cheerio.load(cleanHtml, null, false);
  const links: Array<{ name: string; url: string }> = [];

  parsedHtml('a[href]').each((_, element) => {
    const url = (parsedHtml(element).attr('href') ?? '').trim();
    if (url === '' || url.toLowerCase().startsWith('javascript:')) {
      return;
    }
    const name = parsedHtml(element).text().replace(/\s+/g, ' ').trim();
    links.push({ name: name || url, url });
  });

  return links;
}

/**
 * Returns the src of every image in the selection (Word usually gives base64 data URIs).
 * Use: a Media Picker field (phase 7, optional - not wired up yet).
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The image sources, in document order.
 */
export function extractImages(cleanHtml: string): string[] {
  const parsedHtml = cheerio.load(cleanHtml, null, false);
  const sources: string[] = [];

  parsedHtml('img[src]').each((_, element) => {
    const src = parsedHtml(element).attr('src');
    if (src) {
      sources.push(src);
    }
  });

  return sources;
}
