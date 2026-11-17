// Responsible for reading plain text, lines, links and images out of HTML.
//
// Pulls specific kinds of content out of clean HTML (the marked text after normalizeWord):
// plain text, lines, links, images. Used by converters.ts for fields that are NOT rich text.
// Pure functions: HTML string in, data out.

import * as cheerio from 'cheerio';

// Elements that start a new line in plain text
const BLOCK_ELEMENTS = 'p, div, h1, h2, h3, h4, h5, h6, li, blockquote, tr';

// Returns the text without tags. Paragraphs, headings, list items and <br> become line breaks,
// entities are decoded (&amp; -> &), spaces are collapsed and empty lines removed.
// Use: Textstring, Textarea, Tags, Date and Number fields.
export function toPlainText(cleanHtml: string): string {
  const $ = cheerio.load(cleanHtml, null, false);

  $('br').replaceWith('\n');
  $(BLOCK_ELEMENTS).each((_, element) => {
    $(element).append('\n');
  });

  return $.root()
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

// Splits the text into separate non-empty lines: one per paragraph, list item or <br>.
// Use: list-like fields (Repeatable textstrings).
export function toLines(cleanHtml: string): string[] {
  const text = toPlainText(cleanHtml);
  return text === '' ? [] : text.split('\n');
}

// Returns every link in the selection as { name, url }. Skips javascript: links.
// Use: the Multi URL Picker field.
export function extractLinks(cleanHtml: string): Array<{ name: string; url: string }> {
  const $ = cheerio.load(cleanHtml, null, false);
  const links: Array<{ name: string; url: string }> = [];

  $('a[href]').each((_, element) => {
    const url = ($(element).attr('href') ?? '').trim();
    if (url === '' || url.toLowerCase().startsWith('javascript:')) {
      return;
    }
    const name = $(element).text().replace(/\s+/g, ' ').trim();
    links.push({ name: name || url, url });
  });

  return links;
}

// Returns the src of every image in the selection (Word usually gives base64 data URIs).
// Use: a Media Picker field (phase 7, optional - not wired up yet).
export function extractImages(cleanHtml: string): string[] {
  const $ = cheerio.load(cleanHtml, null, false);
  const sources: string[] = [];

  $('img[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (src) {
      sources.push(src);
    }
  });

  return sources;
}
