// Responsible for everything that talks to the Word document through Office.js
// (reading the marked text, later: storing the Umbraco node id in the document).

/* global Word */

// The marked text in Word: as HTML (keeps headings, bold, lists...) and as plain text.
// (Not called "Selection": the browser already has a built-in type with that name.)
export interface MarkedText {
  html: string;
  text: string;
}

// Reads what the user has marked in the document.
// Use: "Show selection" now, and later "Fill field", which sends the HTML to the backend.
// Office.js works in batches: ask for things first (getHtml, load), then context.sync()
// actually fetches them from Word, and only after that are the values available.
export async function getSelectionHtml(): Promise<MarkedText> {
  return Word.run(async (context) => {
    const range = context.document.getSelection();
    const html = range.getHtml();
    range.load("text");

    await context.sync();

    return { html: html.value, text: range.text };
  });
}
