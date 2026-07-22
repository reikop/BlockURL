import { syncRules, getState } from "./lib/filters.js";

async function updateBadge() {
  const { enabled, filters } = await getState();
  const activeCount = enabled ? filters.filter((f) => f.enabled).length : 0;
  await chrome.action.setBadgeText({
    text: enabled ? (activeCount > 0 ? String(activeCount) : "") : "OFF",
  });
  await chrome.action.setBadgeBackgroundColor({
    color: enabled ? "#d93025" : "#5f6368",
  });
}

async function refresh() {
  try {
    await syncRules();
  } catch (e) {
    // Surface rule-compile failures (bad pattern, rule limit) in the SW log.
    console.error("Failed to sync DNR rules:", e);
  }
  await updateBadge();
}

chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.filters || changes.enabled)) {
    refresh();
  }
});
