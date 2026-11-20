// Responsible for the task pane itself: dropdowns, buttons, and messages to the user.
// Talks to the backend through api.ts and to Word through word.ts.
//
// Flow: pick document type -> pick page (or "new page") -> pick field -> mark text in Word
//       -> "Insert marked text" sends the selection to that field.

/* global document, HTMLSelectElement, HTMLInputElement, HTMLButtonElement, HTMLTextAreaElement, Office */

import { createContent, getDocuments, getDocumentTypes, getFields, updateContent } from "./api";
import { getSelectionHtml } from "./word";

// Value of the "page" dropdown option that means "create a new page"
const NEW_PAGE = "__new__";

// Shortcuts to the elements in taskpane.html
function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const typeSelect = (): HTMLSelectElement => {
  return el<HTMLSelectElement>("document-type");
};
const pageSelect = (): HTMLSelectElement => {
  return el<HTMLSelectElement>("document");
};
const fieldSelect = (): HTMLSelectElement => {
  return el<HTMLSelectElement>("field");
};

// Shows a message under the button. kind decides the colour (see taskpane.css).
function showStatus(message: string, kind: "info" | "error" | "success"): void {
  const status = el("status");
  status.textContent = message;
  status.className = `status status--${kind}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

// Adds one <option> to a dropdown. textContent (not innerHTML), so names can't inject HTML.
function addOption(select: HTMLSelectElement, value: string, label: string, disabled = false): void {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.disabled = disabled;
  select.appendChild(option);
}

// Fills the "document type" dropdown, then loads pages and fields for the first type.
// Use: once, when the task pane opens.
async function loadDocumentTypes(): Promise<void> {
  showStatus("Loading document types...", "info");
  try {
    const types = await getDocumentTypes();
    typeSelect().innerHTML = "";
    for (const type of types) {
      addOption(typeSelect(), type.id, type.name);
    }
    if (types.length === 0) {
      showStatus("No document types found in Umbraco.", "error");
      return;
    }
    await onDocumentTypeChanged();
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

// Loads the pages and fields of the chosen document type.
// Use: when the document type dropdown changes (and once at start).
async function onDocumentTypeChanged(documentIdToSelect?: string): Promise<void> {
  const typeId = typeSelect().value;
  showStatus("Loading pages and fields...", "info");

  try {
    const [pages, fields] = await Promise.all([getDocuments(typeId), getFields(typeId)]);

    pageSelect().innerHTML = "";
    for (const page of pages) {
      addOption(pageSelect(), page.id, `${page.name} (${page.state})`);
    }
    addOption(pageSelect(), NEW_PAGE, "+ New page");
    if (documentIdToSelect) {
      pageSelect().value = documentIdToSelect;
    }
    onPageChanged();

    fieldSelect().innerHTML = "";
    for (const field of fields) {
      const label = field.supported ? field.name : `${field.name} (can't be filled from text)`;
      addOption(fieldSelect(), field.alias, label, !field.supported);
    }
    const firstSupported = fields.find((field) => {
      return field.supported;
    });
    if (firstSupported) {
      fieldSelect().value = firstSupported.alias;
    }

    showStatus("Ready. Mark text in the document and click the button.", "info");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

// Shows the name input only when "+ New page" is chosen.
function onPageChanged(): void {
  el("new-name-row").classList.toggle("hidden", pageSelect().value !== NEW_PAGE);
}

// Sends the marked text to the chosen field: updates the chosen page, or creates a new one.
// Use: the "Insert marked text" button.
async function insertMarkedText(): Promise<void> {
  const button = el<HTMLButtonElement>("insert");
  const fieldAlias = fieldSelect().value;
  const publish = el<HTMLInputElement>("publish").checked;
  const isNew = pageSelect().value === NEW_PAGE;
  const newName = el<HTMLInputElement>("new-name").value.trim();

  if (!fieldAlias) {
    showStatus("Choose a field first.", "error");
    return;
  }
  if (isNew && newName === "") {
    showStatus("Give the new page a name.", "error");
    return;
  }

  button.disabled = true;
  try {
    const selection = await getSelectionHtml();
    if (selection.text.trim() === "") {
      showStatus("Nothing is marked. Select some text in the document first.", "error");
      return;
    }

    const fields = [{ alias: fieldAlias, html: selection.html }];
    showStatus("Sending to Umbraco...", "info");

    if (isNew) {
      const created = await createContent({ documentTypeId: typeSelect().value, name: newName, fields, publish });
      el<HTMLInputElement>("new-name").value = "";
      // Reload the page list so the new page is in it, and select it for the next insert
      await onDocumentTypeChanged(created.id);
      showStatus(`Created "${created.name}" and filled ${fieldAlias}${publish ? " (published)" : " (draft)"}.`, "success");
    } else {
      await updateContent(pageSelect().value, { fields, publish });
      showStatus(`Inserted into ${fieldAlias}${publish ? " and published" : " (saved as draft)"}.`, "success");
    }
  } catch (err) {
    showStatus(errorMessage(err), "error");
  } finally {
    button.disabled = false;
  }
}

// Developer tool: shows Word's raw HTML of the selection, to collect test fixtures.
async function showSelection(): Promise<void> {
  const output = el<HTMLTextAreaElement>("selection-html");
  output.value = "";
  try {
    const selection = await getSelectionHtml();
    output.value = selection.text.trim() === "" ? "(nothing is marked)" : selection.html;
  } catch (err) {
    output.value = errorMessage(err);
  }
}

// Runs once Word has loaded the add-in.
Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    return;
  }
  el("sideload-msg").style.display = "none";
  el("app-body").style.display = "block";

  typeSelect().onchange = () => {
    return onDocumentTypeChanged();
  };
  pageSelect().onchange = onPageChanged;
  el("insert").onclick = insertMarkedText;
  el("show-selection").onclick = showSelection;

  loadDocumentTypes();
});
