/**
 * @file Responsible for the task pane itself: the three steps, buttons, and messages to the user.
 * Talks to the backend through api.ts and to Word through word.ts.
 */

/* global document, HTMLElement, HTMLInputElement, HTMLButtonElement, HTMLTextAreaElement, Office */

import {
  createContent,
  getDocuments,
  getDocumentTypes,
  getDocumentValues,
  getFields,
  updateContent,
} from "./api";
import type { DocumentType, Field, FilledField } from "./api";
import { getSelectionHtml } from "./word";
import type { MarkedText } from "./word";

// What the user has chosen so far
/** The document type chosen in step 1. */
let chosenType: DocumentType | null = null;
/** The page chosen in step 2. null on step 3 = new page. */
let chosenPage: { id: string; name: string } | null = null;
/** The fields of the chosen document type (step 3). */
let fields: Field[] = [];
/** Saved content per field alias (previews). */
let currentValues: Record<string, string> = {};
/** Marked text per field alias, not saved yet. */
const filled = new Map<string, MarkedText>();

/**
 * Shortcut to an element in taskpane.html.
 * Use: everywhere in this file, instead of document.getElementById.
 *
 * @typeParam ElementType - What kind of element it is, e.g. el<HTMLInputElement>("new-name")
 *   for an <input>.
 * @param id - The element's id in taskpane.html.
 * @returns The element.
 */
function el<ElementType extends HTMLElement>(id: string): ElementType {
  return document.getElementById(id) as ElementType;
}

/**
 * Shows a message at the bottom of the pane.
 * Use: loading messages, errors and "Saved" messages.
 *
 * @param message - The text to show ('' clears it).
 * @param kind - Decides the colour (see taskpane.css).
 */
function showStatus(message: string, kind: "info" | "error" | "success"): void {
  const status = el("status");
  status.textContent = message;
  status.className = `status status--${kind}`;
}

/**
 * Gets a readable message out of anything that was thrown.
 * Use: every catch block in this file, before showing the error.
 *
 * @param err - What was thrown.
 * @returns The error's message, or "Something went wrong" if it isn't an Error.
 */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

/**
 * Creates an element with a class and text. textContent (not innerHTML), so names can't inject HTML.
 * Use: building the list rows and field cards.
 *
 * @typeParam TagName - The tag to create, e.g. "button". The return type follows it:
 *   "button" gives a button.
 * @param tag - The tag to create.
 * @param className - CSS class(es), '' for none.
 * @param text - The element's text (default '').
 * @returns The new element (not added to the page yet).
 */
function make<TagName extends keyof HTMLElementTagNameMap>(
  tag: TagName,
  className: string,
  text = ""
): HTMLElementTagNameMap[TagName] {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * Shows one step, hides the others, and sets the header title and back arrow.
 * Use: at the start of showDocumentTypes, showPages and showFields.
 *
 * @param step - Which step to show.
 * @param title - The text in the header.
 */
function showStep(step: "types" | "pages" | "fields", title: string): void {
  el("step-types").classList.toggle("hidden", step !== "types");
  el("step-pages").classList.toggle("hidden", step !== "pages");
  el("step-fields").classList.toggle("hidden", step !== "fields");
  el("title").textContent = title;
  el("back").classList.toggle("hidden", step === "types");
  document.querySelector(".header")?.classList.toggle("with-back", step !== "types");
}

/**
 * Adds a clickable row to a list (<ul>).
 * Use: the lists in step 1 (document types) and step 2 (pages).
 *
 * @param list - The <ul> to add to.
 * @param label - The row's text.
 * @param onClick - What happens when the row is clicked.
 * @param extra - Optional small text on the right, e.g. the page's state.
 */
function addRow(list: HTMLElement, label: string, onClick: () => void, extra?: string): void {
  const item = document.createElement("li");
  const button = make("button", "", label);
  button.type = "button";
  if (extra) {
    button.appendChild(make("span", "state", extra));
  }
  button.onclick = onClick;
  item.appendChild(button);
  list.appendChild(item);
}

/**
 * Step 1: lists the document types.
 * Use: when the pane opens, and the back arrow on step 2.
 */
async function showDocumentTypes(): Promise<void> {
  showStep("types", "Choose Document Type");
  showStatus("Loading document types...", "info");
  const list = el("type-list");
  list.innerHTML = "";
  try {
    const types = await getDocumentTypes();
    for (const type of types) {
      addRow(list, type.name, () => {
        chosenType = type;
        return showPages();
      });
    }
    if (types.length === 0) {
      list.appendChild(make("li", "empty", "No document types found in Umbraco."));
    }
    showStatus("", "info");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

/**
 * Step 2: lists the pages of the chosen type, plus "Add new ...".
 * Use: after choosing a type, and the back arrow on step 3.
 */
async function showPages(): Promise<void> {
  if (!chosenType) {
    return;
  }
  const type = chosenType;
  showStep("pages", `Choose ${type.name}`);
  el("add-page-label").textContent = `Add new ${type.name}`;
  showStatus("Loading pages...", "info");
  const list = el("page-list");
  list.innerHTML = "";
  try {
    const pages = await getDocuments(type.id);
    for (const page of pages) {
      addRow(
        list,
        page.name,
        () => {
          return showFields({ id: page.id, name: page.name });
        },
        page.state
      );
    }
    if (pages.length === 0) {
      list.appendChild(make("li", "empty", `No ${type.name} pages yet.`));
    }
    showStatus("", "info");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

/**
 * Step 3: one card per field of the chosen type. Clears any filled (unsaved) fields.
 * Use: after choosing a page or "Add new ...", and after saving (to show the saved content).
 *
 * @param page - The chosen page, or null for a new page.
 */
async function showFields(page: { id: string; name: string } | null): Promise<void> {
  if (!chosenType) {
    return;
  }
  chosenPage = page;
  filled.clear();
  showStep("fields", page ? page.name : `New ${chosenType.name}`);
  el("new-name-card").classList.toggle("hidden", page !== null);
  el("field-cards").innerHTML = "";
  showStatus("Loading fields...", "info");
  try {
    const [loadedFields, values] = await Promise.all([
      getFields(chosenType.id),
      page ? getDocumentValues(page.id) : Promise.resolve(null),
    ]);
    fields = loadedFields;
    currentValues = values ? values.values : {};
    renderFieldCards();
    showStatus("Mark text in Word, then click Fill Field on the field it belongs in.", "info");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

/**
 * Draws the field cards: name, "Fill Field" button and a grey preview line.
 * The preview shows the marked text if the field was filled, else the saved content.
 * Fields that can't be filled from text are greyed out, without a button.
 * Use: showFields, and fillField after a field was filled.
 */
function renderFieldCards(): void {
  const container = el("field-cards");
  container.innerHTML = "";
  for (const field of fields) {
    const card = make("div", "card");
    const top = make("div", "card-top");
    top.appendChild(make("span", "card-name", field.name));

    let preview: string;
    if (!field.supported) {
      card.classList.add("unsupported");
      preview = "Can't be filled from text";
    } else {
      const button = make("button", "small", "Fill Field");
      button.type = "button";
      button.onclick = () => {
        return fillField(field);
      };
      top.appendChild(button);

      const marked = filled.get(field.alias);
      if (marked) {
        card.classList.add("filled");
        preview = `New: ${marked.text.trim()}`;
      } else {
        preview = currentValues[field.alias] || "Empty";
      }
    }

    card.appendChild(top);
    card.appendChild(make("div", "card-preview", preview));
    container.appendChild(card);
  }
}

/**
 * Takes the marked text in Word and keeps it for one field (saved later with the save buttons).
 * Filling the same field again replaces the earlier text.
 * Use: the "Fill Field" button on a card.
 *
 * @param field - The field to fill.
 */
async function fillField(field: Field): Promise<void> {
  try {
    const selection = await getSelectionHtml();
    if (selection.text.trim() === "") {
      showStatus("Nothing is marked. Select some text in the document first.", "error");
      return;
    }
    filled.set(field.alias, selection);
    renderFieldCards();
    showStatus(`${field.name} filled. Click a save button when you're done.`, "info");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  }
}

/**
 * Sends all filled fields to Umbraco: updates the chosen page, or creates a new one.
 * The buttons are disabled while sending, so the user can't save twice.
 * Use: "Save as draft" (publish = false) and "Save & Publish" (publish = true).
 *
 * @param publish - true to publish right after saving.
 */
async function save(publish: boolean): Promise<void> {
  if (!chosenType) {
    return;
  }
  const newName = el<HTMLInputElement>("new-name").value.trim();
  if (filled.size === 0) {
    showStatus("Fill at least one field first.", "error");
    return;
  }
  if (chosenPage === null && newName === "") {
    showStatus("Give the new page a name.", "error");
    return;
  }

  const fieldsToSend: FilledField[] = [...filled].map(([alias, marked]) => {
    return { alias, html: marked.html };
  });
  const buttons = [el<HTMLButtonElement>("save-draft"), el<HTMLButtonElement>("save-publish")];
  buttons.forEach((button) => {
    button.disabled = true;
  });
  showStatus("Sending to Umbraco...", "info");

  try {
    let page = chosenPage;
    if (page === null) {
      const created = await createContent({
        documentTypeId: chosenType.id,
        name: newName,
        fields: fieldsToSend,
        publish,
      });
      el<HTMLInputElement>("new-name").value = "";
      page = { id: created.id, name: created.name };
    } else {
      await updateContent(page.id, { fields: fieldsToSend, publish });
    }
    // Reload the cards so they show what is saved now
    await showFields(page);
    showStatus(publish ? "Saved and published." : "Saved as draft.", "success");
  } catch (err) {
    showStatus(errorMessage(err), "error");
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

/**
 * The back arrow: step 3 -> step 2 (unsaved filled fields are dropped), step 2 -> step 1.
 * Use: the back arrow in the header.
 */
function goBack(): void {
  if (!el("step-fields").classList.contains("hidden")) {
    filled.clear();
    showPages();
  } else {
    showDocumentTypes();
  }
}

/**
 * Developer tool: shows Word's raw HTML of the selection, to collect test fixtures.
 * Use: the "Show selection" button in the collapsed developer section.
 */
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

// Runs once Word has loaded the add-in: shows the pane, connects the buttons, and starts step 1.
Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    return;
  }
  el("sideload-msg").style.display = "none";
  el("app-body").style.display = "block";

  el("back").onclick = goBack;
  el("add-page").onclick = () => {
    return showFields(null);
  };
  el("save-draft").onclick = () => {
    return save(false);
  };
  el("save-publish").onclick = () => {
    return save(true);
  };
  el("show-selection").onclick = showSelection;

  showDocumentTypes();
});
