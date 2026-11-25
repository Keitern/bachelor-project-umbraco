/**
 * Responsible for cleaning Word's messy HTML before it is saved in Umbraco.
 *
 * Cleans Word HTML into the shared clean HTML format.
 * Input is the MARKED text from Office.js getSelection().getHtml() - one call per filled field.
 * Pure functions: HTML string in, HTML string out.
 *
 * Checked against REAL getHtml() output from Word on Windows (see backend/tests/fixtures/).
 * Add new fixtures when Word sends something new, and adjust convertWordFormatting.
 *
 * @module
 */

import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import sanitizeHtml from 'sanitize-html';

/** A list marker that means "numbered list": 1. 2) a. b) iv. ... */
const NUMBERED_MARKER = /^(\d+|[a-z]|[ivxlcdm]+)[.)]$/i;

/**
 * Finds the bullet/number Word typed in front of a list item, removes it from the paragraph and
 * returns it (e.g. "-", "·" or "1.").
 * Use: convertWordFormatting, for every Word list paragraph, to decide between <ul> and <ol>.
 *
 * Word writes the marker in one of two ways:
 *   filtered HTML (Word on Windows, seen in our fixtures):
 *     <span>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;</span></span>
 *   older Word:  <span style="mso-list:Ignore">·</span>
 *
 * @param parsedHtml - The whole HTML, loaded by Cheerio (to search inside the paragraph).
 * @param paragraph - One <p class="MsoListParagraph..."> element. Its marker span is removed.
 * @returns The marker text, or null if there is none.
 */
export function takeListMarker(parsedHtml: CheerioAPI, paragraph: Cheerio<Element>): string | null {
  const ignored = paragraph.find('span').filter((_, span) => {
    return /mso-list:\s*ignore/i.test(parsedHtml(span).attr('style') ?? '');
  });
  const spacer = paragraph.find('span').filter((_, span) => {
    return /font:\s*7(\.0)?pt/i.test(parsedHtml(span).attr('style') ?? '');
  });

  const markerSpan = ignored.length > 0 ? ignored.first() : spacer.first().parent();
  if (markerSpan.length === 0 || markerSpan.is(paragraph)) {
    return null;
  }

  const marker = markerSpan.text().replace(/ /g, ' ').trim();
  markerSpan.remove();
  return marker;
}

/** The clean format: only these tags survive sanitize(). */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'strong',
  'em',
  'u',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img'
];
/** The only attributes that survive sanitize(), per tag. All styles and classes are dropped. */
const ALLOWED_ATTRIBUTES = {
  a: ['href'],
  img: ['src', 'alt']
};

/**
 * Cleans the marked Word HTML, step by step.
 * Use: convertFields, on every field's HTML before it is converted.
 *
 * Steps: removeWordJunk -> collapse whitespace -> convertWordFormatting -> sanitize
 * -> removeEmptyElements.
 *
 * @param html - The marked text from Word (getSelection().getHtml()).
 * @returns HTML that only uses the clean format, one block per line,
 *   e.g. '<h1><strong>Title</strong></h1>\n<p>Text</p>'.
 */
export function normalizeWord(html: string): string {
  // Word breaks long lines in its HTML source ("Sætning\nmed link"). In HTML any run of
  // whitespace is just one space, so collapse it before anything else reads the text.
  const withoutJunk = removeWordJunk(html).replace(/\s+/g, ' ');
  const withRealTags = convertWordFormatting(withoutJunk);
  const sanitized = sanitize(withRealTags);
  return removeEmptyElements(sanitized);
}

/**
 * Removes things Word adds that are never content: comments (incl. <!--[if ...]> blocks),
 * <style>, <meta>, <link>, <xml> and Office tags like <o:p>, <w:...>, <v:...>.
 * Use: first step of normalizeWord.
 *
 * @param html - The raw Word HTML.
 * @returns The HTML without those parts.
 */
export function removeWordJunk(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|xml|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '')
    .replace(/<\/?[a-z]+:[a-z]+\b[^>]*>/gi, '');
}

/**
 * Word often marks headings and bold/italic with classes or inline styles instead of tags.
 * This turns them into real tags, so the meaning survives sanitising (which drops styles).
 * Use: second step of normalizeWord.
 *
 * Converts: MsoTitle / MsoHeading1-6 -> h1-h6, bold/italic/underline styles -> strong/em/u,
 * MsoListParagraph paragraphs -> <ul>/<ol> with <li>.
 *
 * @param html - Word HTML after removeWordJunk.
 * @returns The same HTML with real tags (styles and classes are still there).
 */
export function convertWordFormatting(html: string): string {
  const parsedHtml = cheerio.load(html, null, false);

  // Word heading paragraphs -> real headings
  parsedHtml('p.MsoTitle').each((_, element) => {
    element.tagName = 'h1';
  });
  for (let level = 1; level <= 6; level++) {
    parsedHtml(`p.MsoHeading${level}`).each((_, element) => {
      element.tagName = `h${level}`;
    });
  }

  // Bold / italic / underline written as inline styles -> real tags
  parsedHtml('span[style]').each((_, element) => {
    const style = (parsedHtml(element).attr('style') ?? '').toLowerCase().replace(/\s/g, '');
    let inner = parsedHtml(element).html() ?? '';
    if (/font-weight:(bold|[6-9]00)/.test(style)) {
      inner = `<strong>${inner}</strong>`;
    }
    if (style.includes('font-style:italic')) {
      inner = `<em>${inner}</em>`;
    }
    if (style.includes('text-decoration:underline')) {
      inner = `<u>${inner}</u>`;
    }
    parsedHtml(element).html(inner);
  });

  // Word list paragraphs -> <ul>/<ol> with <li>.
  // Word doesn't use real lists: each item is a <p class="MsoListParagraph...">, and the
  // bullet or number is typed into the text. The marker decides the list type:
  // "1." / "a)" / "iv." -> numbered (<ol>), anything else ("-", "·", "o") -> bullets (<ul>).
  // Consecutive items of the same type become one list; "CxSpFirst" always starts a new one.
  parsedHtml('p[class^="MsoListParagraph"]').each((_, element) => {
    const paragraph = parsedHtml(element);
    const marker = takeListMarker(parsedHtml, paragraph);
    const listTag = marker !== null && NUMBERED_MARKER.test(marker) ? 'ol' : 'ul';
    const startsNewList = (paragraph.attr('class') ?? '').includes('CxSpFirst');

    const item = parsedHtml('<li></li>').html(paragraph.html() ?? '');
    const previous = paragraph.prev();
    if (previous.is(listTag) && !startsNewList) {
      previous.append(item);
      paragraph.remove();
    } else {
      paragraph.replaceWith(parsedHtml(`<${listTag}></${listTag}>`).append(item));
    }
  });

  return parsedHtml.html();
}

/**
 * Keeps only the clean format (ALLOWED_TAGS / ALLOWED_ATTRIBUTES). Other tags are dropped but
 * their text is kept. Also the safety step: no scripts, event handlers or javascript: links.
 * Use: third step of normalizeWord.
 *
 * @param html - HTML after convertWordFormatting.
 * @returns HTML with only allowed tags and attributes. <b> becomes <strong>, <i> becomes <em>.
 */
export function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: { b: 'strong', i: 'em' }
  });
}

/**
 * Removes paragraphs, headings and list items that are empty or only contain spaces/&nbsp;
 * (Word adds many), removes lists left without items, and collapses repeated <br>.
 * Use: last step of normalizeWord.
 *
 * @param html - HTML after sanitize.
 * @returns The final clean HTML, with one block element per line.
 */
export function removeEmptyElements(html: string): string {
  const parsedHtml = cheerio.load(html, null, false);

  parsedHtml('p, h1, h2, h3, h4, h5, h6, li').each((_, element) => {
    const text = parsedHtml(element).text().replace(/ /g, ' ').trim();
    if (text === '' && parsedHtml(element).find('img').length === 0) {
      parsedHtml(element).remove();
    }
  });
  parsedHtml('ul, ol').each((_, element) => {
    if (parsedHtml(element).children('li').length === 0) {
      parsedHtml(element).remove();
    }
  });

  return (
    parsedHtml
      .html()
      .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
      .replace(/\n\s*\n/g, '\n') // blank lines left behind by removed elements
      // one line per block, e.g. "</ul> <ol>" -> "</ul>\n<ol>" (spaces between inline tags stay)
      .replace(/(<\/(?:p|h[1-6]|ul|ol|blockquote|table)>)\s+(?=<)/g, '$1\n')
      .trim()
  );
}
