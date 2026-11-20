# Word HTML fixtures

Real HTML from Word, used to test `normalizeWord` and the converters against what Word
actually sends (not hand-written HTML).

## How to add one

1. Start the add-in (`npm start` in `word-umbraco-connector/`) and the task pane.
2. In Word, mark the text you want, then click **Show selection**.
3. Click in the HTML box, press **Ctrl+A** and **Ctrl+C**.
4. Save it here as a new `.html` file with a name that says what it contains.

## Suggested fixtures

| File | What to mark in Word |
|---|---|
| `heading.html` | One line formatted as **Heading 1** |
| `bold-italic.html` | A paragraph with some **bold** and some *italic* words |
| `bullet-list.html` | A bullet list with 3 items |
| `numbered-list.html` | A numbered list with 3 items |
| `link.html` | A sentence with a hyperlink |
| `mixed.html` | Heading + paragraphs + list together (like a short article) |

Tip: write down which Word version (Windows / Mac / web) each file came from, e.g. in the
file name (`bullet-list.windows.html`). Word's HTML can differ between them.
