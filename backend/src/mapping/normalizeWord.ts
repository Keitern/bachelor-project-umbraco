// Responsible for cleaning Word's messy HTML before it is saved in Umbraco.
//
// Cleans Word HTML into the shared clean HTML format.
// Input is the MARKED text from Office.js getSelection().getHtml() - one call per filled field.
// Pure functions: HTML string in, HTML string out.
//
// NOTE: written from known Word HTML patterns. Check it against REAL getHtml() output once the
// add-in works (save it as test fixtures) and adjust convertWordFormatting if needed.

import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';

// The clean format: only these tags and attributes survive.
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
const ALLOWED_ATTRIBUTES = {
  a: ['href'],
  img: ['src', 'alt']
};

// Cleans the marked Word HTML, step by step. Returns HTML that only uses the clean format.
// Use: convertFields, on every field's HTML before it is converted.
export function normalizeWord(html: string): string {
  const withoutJunk = removeWordJunk(html);
  const withRealTags = convertWordFormatting(withoutJunk);
  const sanitized = sanitize(withRealTags);
  return removeEmptyElements(sanitized);
}

// Removes things Word adds that are never content: comments (incl. <!--[if ...]> blocks),
// <style>, <meta>, <link>, <xml> and Office tags like <o:p>, <w:...>, <v:...>.
// Use: first step of normalizeWord.
function removeWordJunk(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|xml|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(meta|link)\b[^>]*>/gi, '')
    .replace(/<\/?[a-z]+:[a-z]+\b[^>]*>/gi, '');
}

// Word often marks headings and bold/italic with classes or inline styles instead of tags.
// This turns them into real tags, so the meaning survives sanitising (which drops styles).
// Use: second step of normalizeWord.
function convertWordFormatting(html: string): string {
  const $ = cheerio.load(html, null, false);

  // Word heading paragraphs -> real headings
  $('p.MsoTitle').each((_, element) => {
    element.tagName = 'h1';
  });
  for (let level = 1; level <= 6; level++) {
    $(`p.MsoHeading${level}`).each((_, element) => {
      element.tagName = `h${level}`;
    });
  }

  // Bold / italic / underline written as inline styles -> real tags
  $('span[style]').each((_, element) => {
    const style = ($(element).attr('style') ?? '').toLowerCase().replace(/\s/g, '');
    let inner = $(element).html() ?? '';
    if (/font-weight:(bold|[6-9]00)/.test(style)) {
      inner = `<strong>${inner}</strong>`;
    }
    if (style.includes('font-style:italic')) {
      inner = `<em>${inner}</em>`;
    }
    if (style.includes('text-decoration:underline')) {
      inner = `<u>${inner}</u>`;
    }
    $(element).html(inner);
  });

  // Word bullet characters (span with mso-list:Ignore) are not content
  $('span[style*="mso-list"]').each((_, element) => {
    const style = ($(element).attr('style') ?? '').toLowerCase();
    if (style.includes('ignore')) {
      $(element).remove();
    }
  });

  // Word list paragraphs -> <ul><li>. Consecutive list paragraphs become one list.
  $('p[class^="MsoListParagraph"]').each((_, element) => {
    const item = $('<li></li>').html($(element).html() ?? '');
    const previous = $(element).prev();
    if (previous.is('ul')) {
      previous.append(item);
      $(element).remove();
    } else {
      $(element).replaceWith($('<ul></ul>').append(item));
    }
  });

  return $.html();
}

// Keeps only the clean format (ALLOWED_TAGS / ALLOWED_ATTRIBUTES). Other tags are dropped but
// their text is kept. Also the safety step: no scripts, event handlers or javascript: links.
// Use: third step of normalizeWord.
function sanitize(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: { b: 'strong', i: 'em' }
  });
}

// Removes paragraphs, headings and list items that are empty or only contain spaces/&nbsp;
// (Word adds many), and collapses repeated <br>.
// Use: last step of normalizeWord.
function removeEmptyElements(html: string): string {
  const $ = cheerio.load(html, null, false);

  $('p, h1, h2, h3, h4, h5, h6, li').each((_, element) => {
    const text = $(element).text().replace(/ /g, ' ').trim();
    if (text === '' && $(element).find('img').length === 0) {
      $(element).remove();
    }
  });
  $('ul, ol').each((_, element) => {
    if ($(element).children('li').length === 0) {
      $(element).remove();
    }
  });

  return $.html()
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
    .replace(/\n\s*\n/g, '\n') // blank lines left behind by removed elements
    .trim();
}
