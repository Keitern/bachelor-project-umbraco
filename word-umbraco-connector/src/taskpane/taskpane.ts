// Responsible for the task pane itself: buttons, what is shown, and messages to the user.
// Talks to the backend through api.ts and to Word through word.ts.

/* global document, Office */

import { getDocumentTypes } from "./api";

// Shows a message under the buttons. kind decides the colour (see taskpane.css).
function showStatus(message: string, kind: "info" | "error" | "success"): void {
  const status = document.getElementById("status")!;
  status.textContent = message;
  status.className = `status status--${kind}`;
}

// Fetches the document types from the backend and shows them as a list.
// Use: the "Load document types" button.
async function loadDocumentTypes(): Promise<void> {
  const list = document.getElementById("document-types")!;
  list.innerHTML = "";
  showStatus("Loading document types...", "info");

  try {
    const types = await getDocumentTypes();

    for (const type of types) {
      const item = document.createElement("li");
      item.textContent = type.name; // textContent (not innerHTML), so names can't inject HTML
      list.appendChild(item);
    }

    showStatus(`Found ${types.length} document type(s).`, "success");
  } catch (err) {
    showStatus(err instanceof Error ? err.message : "Something went wrong", "error");
  }
}

// Runs once Word has loaded the add-in.
Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    return;
  }
  document.getElementById("sideload-msg")!.style.display = "none";
  document.getElementById("app-body")!.style.display = "block";
  document.getElementById("load-types")!.onclick = loadDocumentTypes;
});
