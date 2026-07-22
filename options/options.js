import {
  getState,
  setState,
  filtersToText,
  parseFilterText,
} from "../lib/filters.js";

const $ = (id) => document.getElementById(id);

function localize() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18n);
    if (msg) el.textContent = msg;
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    const msg = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    if (msg) el.placeholder = msg;
  }
}

let saved = true;

function markDirty() {
  if (!saved) return;
  saved = false;
  $("status").textContent = chrome.i18n.getMessage("unsaved") || "저장되지 않음";
}

async function load() {
  const { filters } = await getState();
  $("editor").value = filtersToText(filters);
  saved = true;
  $("status").textContent = "";
}

async function save() {
  const { filters: existing } = await getState();
  const { filters, invalidLines } = parseFilterText($("editor").value, existing);
  await setState({ filters });

  // Re-serialize so the editor reflects what was actually stored
  // (normalized patterns, duplicates removed). Invalid lines are kept
  // at the bottom so the user can fix them.
  $("editor").value =
    filtersToText(filters) +
    (invalidLines.length ? "\n" + invalidLines.join("\n") : "");

  const invalid = $("invalid");
  if (invalidLines.length) {
    invalid.textContent =
      (chrome.i18n.getMessage("invalidLines", [String(invalidLines.length)]) ||
        `잘못된 패턴 ${invalidLines.length}줄 — 저장되지 않았습니다:`) +
      " " +
      invalidLines.join(", ");
    invalid.hidden = false;
  } else {
    invalid.hidden = true;
  }

  saved = true;
  $("status").textContent =
    chrome.i18n.getMessage("saveDone", [String(filters.length)]) ||
    `${filters.length}개 필터 적용됨`;
}

function init() {
  localize();

  $("editor").addEventListener("input", markDirty);
  $("save").addEventListener("click", save);

  // Ctrl/Cmd+S saves instead of triggering the browser dialog.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  });

  // Reflect changes made elsewhere (popup quick-add), but never clobber
  // unsaved edits in the textarea.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.filters && saved) load();
  });

  window.addEventListener("beforeunload", (e) => {
    if (!saved) e.preventDefault();
  });

  load();
}

init();
