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
  const { enabled, filters } = await getState();
  $("global-toggle").checked = enabled;
  $("editor").value = filtersToText(filters);
  saved = true;
  $("status").textContent = "";
}

async function save() {
  const { filters: existing } = await getState();
  const { filters, invalidLines } = parseFilterText($("editor").value, existing);
  await setState({ filters });

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

async function currentTabDomain() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    const url = new URL(tab.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname;
  } catch {
    return null;
  }
}

async function init() {
  localize();

  const domain = await currentTabDomain();
  if (domain) {
    $("current-domain").textContent = domain;
    $("current-site").hidden = false;
    // Adds the domain as a new line in the editor and saves everything,
    // so the button works with or without pending edits.
    $("block-current").addEventListener("click", async () => {
      const editor = $("editor");
      const lines = editor.value.split("\n").map((l) => l.trim());
      if (!lines.includes(domain)) {
        editor.value = domain + (editor.value.trim() ? "\n" + editor.value : "");
      }
      await save();
    });
  }

  $("global-toggle").addEventListener("change", async (e) => {
    await setState({ enabled: e.target.checked });
  });

  $("editor").addEventListener("input", markDirty);
  $("save").addEventListener("click", save);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  });

  $("open-options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Reflect global toggle / changes from the options page, but never
  // clobber unsaved edits in the textarea.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes.filters || changes.enabled) && saved) load();
  });

  load();
}

init();
