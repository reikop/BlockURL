import { syncRules, getState } from "./lib/filters.js";

// Per-tab count of requests blocked on the current page. In-memory only:
// if the service worker is killed mid-page the count restarts, but the
// tab-specific badge Chrome already shows stays until navigation.
const counts = new Map();

// MV3 DNR has no per-block callback (onRuleMatchedDebug is unpacked-only,
// getMatchedRules is quota-limited), so observe blocked requests through
// non-blocking webRequest: DNR-blocked requests surface here as
// net::ERR_BLOCKED_BY_CLIENT.
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
    if (details.tabId < 0) return;
    // A blocked main_frame is the start of a new page — restart the count.
    const count =
      details.type === "main_frame" ? 1 : (counts.get(details.tabId) ?? 0) + 1;
    counts.set(details.tabId, count);
    chrome.action.setBadgeText({ tabId: details.tabId, text: String(count) });
  },
  { urls: ["<all_urls>"] }
);

// New page in the tab: drop the counter. Chrome clears the tab-specific
// badge text on navigation by itself.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") counts.delete(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => counts.delete(tabId));

// Global (non-tab) badge only signals the off state; per-tab blocked
// counts override it on tabs where something was blocked.
async function updateBadge() {
  const { enabled } = await getState();
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
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
