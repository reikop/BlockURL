import {
  getState,
  setState,
  addFilter,
  removeFilter,
  toggleFilter,
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

function showError(key) {
  const el = $("error");
  el.textContent = chrome.i18n.getMessage(key) || key;
  el.hidden = false;
}

function clearError() {
  $("error").hidden = true;
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

async function render() {
  const { enabled, filters } = await getState();
  $("global-toggle").checked = enabled;

  const list = $("filter-list");
  list.textContent = "";
  $("empty").hidden = filters.length > 0;

  // Storage order matches the options-page editor, so keep it.
  for (const filter of filters) {
    const li = document.createElement("li");
    li.classList.toggle("disabled", !filter.enabled);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = filter.enabled;
    checkbox.addEventListener("change", async () => {
      await toggleFilter(filter.id, checkbox.checked);
      render();
    });

    const span = document.createElement("span");
    span.className = "pattern";
    span.textContent = filter.pattern;
    span.title = filter.pattern;

    const remove = document.createElement("button");
    remove.className = "remove";
    remove.textContent = "✕";
    remove.title = chrome.i18n.getMessage("remove") || "삭제";
    remove.addEventListener("click", async () => {
      await removeFilter(filter.id);
      render();
    });

    li.append(checkbox, span, remove);
    list.append(li);
  }
}

async function init() {
  localize();

  const domain = await currentTabDomain();
  if (domain) {
    $("current-domain").textContent = domain;
    $("current-site").hidden = false;
    $("block-current").addEventListener("click", async () => {
      clearError();
      try {
        await addFilter(domain);
        render();
      } catch (e) {
        showError(e.message === "duplicate-pattern" ? "errDuplicate" : "errInvalid");
      }
    });
  }

  $("global-toggle").addEventListener("change", async (e) => {
    await setState({ enabled: e.target.checked });
  });

  $("add-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const input = $("pattern-input");
    if (!input.value.trim()) return;
    try {
      await addFilter(input.value);
      input.value = "";
      render();
    } catch (err) {
      showError(err.message === "duplicate-pattern" ? "errDuplicate" : "errInvalid");
    }
  });

  $("open-options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  render();
}

init();
