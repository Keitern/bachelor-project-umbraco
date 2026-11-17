// Responsible for converting marked text into each data type's format (text, rich text, tags...).
//
// Converters: one function per supported data type. Each turns clean HTML (the marked text)
// into the value format that data type expects. Pure functions: no network.
//
//  #  | Data type (backoffice)  | editorAlias                | Value sent to Umbraco         | Verified
//  ---|-------------------------|----------------------------|-------------------------------|---------
//  1  | Textstring              | Umbraco.TextBox            | 'plain text' (one line)       | spike
//  2  | Textarea                | Umbraco.TextArea           | 'plain text\nwith lines'      | spike
//  3  | Rich Text Editor        | Umbraco.RichText           | { markup, blocks: {...} }     | spike
//  4  | Markdown Editor         | Umbraco.MarkdownEditor     | '## markdown string'          | no
//  5  | Repeatable Textstrings  | Umbraco.MultipleTextstring | ['line 1', 'line 2']          | no
//  6  | Tags                    | Umbraco.Tags               | ['tag1', 'tag2']              | no
//  7  | Date Picker             | Umbraco.DateTime           | '2026-11-11 00:00:00'         | no
//  8  | Numeric                 | Umbraco.Integer            | 42                            | no
//  9  | Decimal                 | Umbraco.Decimal            | 4.2                           | no
//  10 | Multi URL Picker        | Umbraco.MultiUrlPicker     | [{ name, url, type, ... }]    | no
//
// "no" = verify ONCE before relying on it: fill such a field by hand in the backoffice and read
// the node with GET /document/{id} to see the exact format. Media Picker is left out (needs an
// image upload first).

import TurndownService from 'turndown';
import { httpError } from '../httpError.ts';
import { extractLinks, toLines, toPlainText } from './htmlToValues.ts';
import type { DocumentTypeProperty } from '../umbraco/client.ts';

// Data type settings from Umbraco, e.g. [{ alias: 'maxChars', value: 100 }]
type DataTypeConfig = DocumentTypeProperty['config'];

// Every converter: clean HTML (+ the data type's settings) in, Umbraco value out.
export type Converter = (cleanHtml: string, config: DataTypeConfig) => unknown;

// Reads one numeric setting from the data type config, e.g. maxChars. undefined if not set.
function numberSetting(config: DataTypeConfig, alias: string): number | undefined {
  const setting = config.find((c) => {
    return c.alias === alias;
  });
  return typeof setting?.value === 'number' ? setting.value : undefined;
}

// Throws 400 when the text is longer than the data type allows (instead of cutting it off).
function checkMaxChars(text: string, config: DataTypeConfig): void {
  const maxChars = numberSetting(config, 'maxChars');
  if (maxChars !== undefined && maxChars > 0 && text.length > maxChars) {
    throw httpError(
      400,
      `The marked text is ${text.length} characters, the field allows ${maxChars}`
    );
  }
}

// Textstring: plain text on ONE line (line breaks become spaces).
function toTextstring(cleanHtml: string, config: DataTypeConfig): string {
  const text = toPlainText(cleanHtml).replace(/\n/g, ' ');
  checkMaxChars(text, config);
  return text;
}

// Textarea: plain text, keeps the line breaks between paragraphs.
function toTextarea(cleanHtml: string, config: DataTypeConfig): string {
  const text = toPlainText(cleanHtml);
  checkMaxChars(text, config);
  return text;
}

// Rich text: the HTML itself, wrapped in Umbraco 18's rich text format.
// `blocks` must be this full empty structure, not null (found in the spike).
function toRichText(cleanHtml: string): { markup: string; blocks: object } {
  return {
    markup: cleanHtml,
    blocks: { layout: {}, contentData: [], settingsData: [], expose: [] }
  };
}

// Markdown: HTML converted to Markdown, e.g. <h2>Intro</h2> -> '## Intro'.
const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
function toMarkdown(cleanHtml: string): string {
  return turndown.turndown(cleanHtml);
}

// Repeatable textstrings: one entry per paragraph / list item.
function toRepeatableTextstrings(cleanHtml: string): string[] {
  return toLines(cleanHtml);
}

// Tags: text split on commas and line breaks, trimmed, without empty or duplicate tags.
function toTags(cleanHtml: string): string[] {
  const tags = toPlainText(cleanHtml)
    .split(/[,\n]/)
    .map((tag) => {
      return tag.trim();
    })
    .filter((tag) => {
      return tag !== '';
    });
  return [...new Set(tags)];
}

// Date: accepts 2026-11-17, 17-11-2026, 17/11/2026 and 17.11.2026.
// Parsed by hand (not new Date(...)) so time zones can't shift the day.
function toDate(cleanHtml: string): string {
  const text = toPlainText(cleanHtml).trim();
  const yearFirst = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const dayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);

  let year: number;
  let month: number;
  let day: number;
  if (yearFirst) {
    [year, month, day] = [Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3])];
  } else if (dayFirst) {
    [day, month, year] = [Number(dayFirst[1]), Number(dayFirst[2]), Number(dayFirst[3])];
  } else {
    throw httpError(400, `Could not read a date from the marked text: "${text}"`);
  }

  // Rejects impossible dates like 31-02-2026
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw httpError(400, `"${text}" is not a valid date`);
  }

  const pad = (n: number): string => {
    return String(n).padStart(2, '0');
  };
  return `${year}-${pad(month)}-${pad(day)} 00:00:00`;
}

// Number: accepts both 4.2 and 4,2. Throws 400 if the text is not a number.
function toNumber(cleanHtml: string): number {
  const text = toPlainText(cleanHtml).trim().replace(/\s/g, '').replace(',', '.');
  const number = Number(text);
  if (text === '' || Number.isNaN(number)) {
    throw httpError(400, `Could not read a number from the marked text: "${text}"`);
  }
  return number;
}

// Numeric (whole numbers only).
function toInteger(cleanHtml: string): number {
  const number = toNumber(cleanHtml);
  if (!Number.isInteger(number)) {
    throw httpError(400, `The field needs a whole number, got ${number}`);
  }
  return number;
}

// Multi URL picker: every link in the selection becomes an external link.
function toUrlPicker(cleanHtml: string): object[] {
  const links = extractLinks(cleanHtml);
  if (links.length === 0) {
    throw httpError(400, 'The marked text contains no links');
  }
  return links.map((link) => {
    return {
      name: link.name,
      url: link.url,
      type: 'external',
      target: null,
      unique: null,
      queryString: null,
      icon: null,
      published: true,
      trashed: false
    };
  });
}

// Which converter to use for which data type. Adding a data type = write a converter + one line.
export const SUPPORTED_EDITORS: Record<string, Converter> = {
  'Umbraco.TextBox': toTextstring,
  'Umbraco.TextArea': toTextarea,
  'Umbraco.RichText': toRichText,
  'Umbraco.MarkdownEditor': toMarkdown,
  'Umbraco.MultipleTextstring': toRepeatableTextstrings,
  'Umbraco.Tags': toTags,
  'Umbraco.DateTime': toDate,
  'Umbraco.Integer': toInteger,
  'Umbraco.Decimal': toNumber,
  'Umbraco.MultiUrlPicker': toUrlPicker
};

// true if we can fill this kind of field from marked text.
// Use: routes/metadata.ts, so the task pane can grey out fields we can't fill.
export function isSupportedEditor(editorAlias: string): boolean {
  return editorAlias in SUPPORTED_EDITORS;
}
