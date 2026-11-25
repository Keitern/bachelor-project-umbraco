/**
 * @file Responsible for converting marked text into each data type's format (text, rich text, tags...).
 *
 * Converters: one function per supported data type. Each turns clean HTML (the marked text)
 * into the value format that data type expects. Pure functions: no network.
 *
 *  #  | Data type (backoffice)  | editorAlias                | Value sent to Umbraco         | Verified
 *  ---|-------------------------|----------------------------|-------------------------------|---------
 *  1  | Textstring              | Umbraco.TextBox            | 'plain text' (one line)       | spike
 *  2  | Textarea                | Umbraco.TextArea           | 'plain text\nwith lines'      | spike
 *  3  | Rich Text Editor        | Umbraco.RichText           | { markup, blocks: {...} }     | spike
 *  4  | Markdown Editor         | Umbraco.MarkdownEditor     | '## markdown string'          | no
 *  5  | Repeatable Textstrings  | Umbraco.MultipleTextstring | ['line 1', 'line 2']          | no
 *  6  | Tags                    | Umbraco.Tags               | ['tag1', 'tag2']              | no
 *  7  | Date Picker             | Umbraco.DateTime           | '2026-11-11 00:00:00'         | no
 *  8  | Numeric                 | Umbraco.Integer            | 42                            | no
 *  9  | Decimal                 | Umbraco.Decimal            | 4.2                           | no
 *  10 | Multi URL Picker        | Umbraco.MultiUrlPicker     | [{ name, url, type, ... }]    | no
 *
 * "no" = verify ONCE before relying on it: fill such a field by hand in the backoffice and read
 * the node with GET /document/{id} to see the exact format. Media Picker is left out (needs an
 * image upload first).
 */

import TurndownService from 'turndown';
import { httpError } from '../httpError.ts';
import { extractLinks, toLines, toPlainText } from './htmlToValues.ts';
import type { DocumentTypeProperty } from '../umbraco/client.ts';

/** Data type settings from Umbraco, e.g. [{ alias: 'maxChars', value: 100 }]. */
type DataTypeConfig = DocumentTypeProperty['config'];

/** Every converter: clean HTML (+ the data type's settings) in, Umbraco value out. */
export type Converter = (cleanHtml: string, config: DataTypeConfig) => unknown;

/**
 * Reads one numeric setting from the data type config, e.g. maxChars.
 * Use: checkMaxChars.
 *
 * @param config - The data type's settings.
 * @param alias - The setting's alias, e.g. 'maxChars'.
 * @returns The number, or undefined if it is not set (or not a number).
 */
function numberSetting(config: DataTypeConfig, alias: string): number | undefined {
  const setting = config.find((c) => {
    return c.alias === alias;
  });
  return typeof setting?.value === 'number' ? setting.value : undefined;
}

/**
 * Stops text that is longer than the data type allows (instead of cutting it off).
 * Use: the text converters (toTextstring, toTextarea).
 *
 * @param text - The text that will be saved.
 * @param config - The data type's settings (maxChars is read from here).
 * @throws {Error} 400 if the text is longer than maxChars.
 */
function checkMaxChars(text: string, config: DataTypeConfig): void {
  const maxChars = numberSetting(config, 'maxChars');
  if (maxChars !== undefined && maxChars > 0 && text.length > maxChars) {
    throw httpError(
      400,
      `The marked text is ${text.length} characters, the field allows ${maxChars}`
    );
  }
}

/**
 * Textstring: plain text on ONE line (line breaks become spaces).
 * Use: SUPPORTED_EDITORS, for Umbraco.TextBox.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @param config - The data type's settings (maxChars).
 * @returns The text, on one line.
 * @throws {Error} 400 if the text is longer than maxChars.
 */
function toTextstring(cleanHtml: string, config: DataTypeConfig): string {
  const text = toPlainText(cleanHtml).replace(/\n/g, ' ');
  checkMaxChars(text, config);
  return text;
}

/**
 * Textarea: plain text, keeps the line breaks between paragraphs.
 * Use: SUPPORTED_EDITORS, for Umbraco.TextArea.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @param config - The data type's settings (maxChars).
 * @returns The text, with \n between paragraphs.
 * @throws {Error} 400 if the text is longer than maxChars.
 */
function toTextarea(cleanHtml: string, config: DataTypeConfig): string {
  const text = toPlainText(cleanHtml);
  checkMaxChars(text, config);
  return text;
}

/**
 * Rich text: the HTML itself, wrapped in Umbraco 18's rich text format.
 * `blocks` must be this full empty structure, not null (found in the spike).
 * Use: SUPPORTED_EDITORS, for Umbraco.RichText.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns { markup, blocks } with the HTML as markup.
 */
function toRichText(cleanHtml: string): { markup: string; blocks: object } {
  return {
    markup: cleanHtml,
    blocks: { layout: {}, contentData: [], settingsData: [], expose: [] }
  };
}

/** Turns HTML into Markdown. '#' headings and '-' bullets. */
const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

/**
 * Markdown: HTML converted to Markdown, e.g. <h2>Intro</h2> -> '## Intro'.
 * Use: SUPPORTED_EDITORS, for Umbraco.MarkdownEditor.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The Markdown text.
 */
function toMarkdown(cleanHtml: string): string {
  return turndown.turndown(cleanHtml);
}

/**
 * Repeatable textstrings: one entry per paragraph / list item.
 * Use: SUPPORTED_EDITORS, for Umbraco.MultipleTextstring.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns One string per line, without empty lines.
 */
function toRepeatableTextstrings(cleanHtml: string): string[] {
  return toLines(cleanHtml);
}

/**
 * Tags: text split on commas and line breaks, trimmed, without empty or duplicate tags.
 * Use: SUPPORTED_EDITORS, for Umbraco.Tags.
 *
 * @param cleanHtml - The marked text after normalizeWord, e.g. "news, sport".
 * @returns The tags, e.g. ['news', 'sport'].
 */
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

/**
 * Date: accepts 2026-11-17, 17-11-2026, 17/11/2026 and 17.11.2026.
 * Parsed by hand (not new Date(...)) so time zones can't shift the day.
 * Use: SUPPORTED_EDITORS, for Umbraco.DateTime.
 *
 * @param cleanHtml - The marked text after normalizeWord, e.g. "17.11.2026".
 * @returns The date in Umbraco's format, e.g. '2026-11-17 00:00:00'.
 * @throws {Error} 400 if no date can be read, or the date doesn't exist (e.g. 31-02-2026).
 */
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

/**
 * Number: accepts both 4.2 and 4,2.
 * Use: SUPPORTED_EDITORS, for Umbraco.Decimal, and toInteger.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The number.
 * @throws {Error} 400 if the text is not a number.
 */
function toNumber(cleanHtml: string): number {
  const text = toPlainText(cleanHtml).trim().replace(/\s/g, '').replace(',', '.');
  const number = Number(text);
  if (text === '' || Number.isNaN(number)) {
    throw httpError(400, `Could not read a number from the marked text: "${text}"`);
  }
  return number;
}

/**
 * Numeric (whole numbers only).
 * Use: SUPPORTED_EDITORS, for Umbraco.Integer.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns The whole number.
 * @throws {Error} 400 if the text is not a number, or not a whole number.
 */
function toInteger(cleanHtml: string): number {
  const number = toNumber(cleanHtml);
  if (!Number.isInteger(number)) {
    throw httpError(400, `The field needs a whole number, got ${number}`);
  }
  return number;
}

/**
 * Multi URL picker: every link in the selection becomes an external link.
 * Use: SUPPORTED_EDITORS, for Umbraco.MultiUrlPicker.
 *
 * @param cleanHtml - The marked text after normalizeWord.
 * @returns One link object per <a href> in the text.
 * @throws {Error} 400 if the marked text contains no links.
 */
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

/**
 * Which converter to use for which data type (key = editorAlias).
 * Adding a data type = write a converter + one line.
 */
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

/**
 * Checks if we can fill this kind of field from marked text.
 * Use: routes/metadata.ts, so the task pane can grey out fields we can't fill.
 *
 * @param editorAlias - The field's editor, e.g. 'Umbraco.RichText'.
 * @returns true if there is a converter for it in SUPPORTED_EDITORS.
 */
export function isSupportedEditor(editorAlias: string): boolean {
  return editorAlias in SUPPORTED_EDITORS;
}
