// Shared filter model and conversion to declarativeNetRequest rules.
//
// Storage schema (chrome.storage.sync):
//   enabled: boolean            — global on/off switch
//   filters: Array<{ id, pattern, enabled, createdAt }>
//
// Pattern forms accepted from the user:
//   "example.com"          → blocks the domain and all subdomains (||example.com^)
//   "*ads*"                → raw urlFilter wildcard match anywhere in the URL
//   "https://foo.com/bar*" — raw urlFilter prefix match

export const ALL_RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "webtransport",
  "webbundle",
  "other",
];

const DEFAULT_STATE = { enabled: true, filters: [] };

export async function getState() {
  const state = await chrome.storage.sync.get(DEFAULT_STATE);
  return {
    enabled: state.enabled !== false,
    filters: Array.isArray(state.filters) ? state.filters : [],
  };
}

export async function setState(partial) {
  await chrome.storage.sync.set(partial);
}

// A bare domain: no wildcard, no path, no scheme, no anchor characters.
function isBareDomain(pattern) {
  return !/[*/|^]/.test(pattern) && pattern.includes(".");
}

// urlFilter must be ASCII; punycode-encode bare domains typed in Unicode.
export function normalizePattern(raw) {
  let pattern = raw.trim().toLowerCase();
  if (!pattern) return null;
  if (isBareDomain(pattern)) {
    try {
      pattern = new URL("http://" + pattern).hostname;
    } catch {
      return null;
    }
  }
  // urlFilter must be printable ASCII without whitespace — a bad pattern
  // would make the whole updateDynamicRules call fail, killing every rule.
  if (!/^[\x21-\x7E]+$/.test(pattern)) return null;
  return pattern;
}

export function toUrlFilter(pattern) {
  return isBareDomain(pattern) ? `||${pattern}^` : pattern;
}

export function toDNRRule(filter) {
  return {
    id: filter.id,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: toUrlFilter(filter.pattern),
      resourceTypes: ALL_RESOURCE_TYPES,
    },
  };
}

// Rebuild the full dynamic rule set from stored filters.
// Called from the service worker whenever storage changes.
export async function syncRules() {
  const { enabled, filters } = await getState();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = enabled
    ? filters.filter((f) => f.enabled).map(toDNRRule)
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
  return addRules.length;
}

export function nextFilterId(filters) {
  return filters.reduce((max, f) => Math.max(max, f.id), 0) + 1;
}

export async function addFilter(pattern) {
  const normalized = normalizePattern(pattern);
  if (!normalized) throw new Error("invalid-pattern");
  const { filters } = await getState();
  if (filters.some((f) => f.pattern === normalized)) {
    throw new Error("duplicate-pattern");
  }
  filters.push({
    id: nextFilterId(filters),
    pattern: normalized,
    enabled: true,
    createdAt: Date.now(),
  });
  await setState({ filters });
  return normalized;
}

// Translate a filter to a RegExp mirroring DNR urlFilter semantics, so the
// background can check whether a blocked request was blocked by OUR rules
// (ERR_BLOCKED_BY_CLIENT is also fired for other extensions' blocks).
export function filterToRegExp(pattern) {
  let src = toUrlFilter(pattern);
  let re = "";
  if (src.startsWith("||")) {
    // domain anchor: any scheme, optional subdomains
    re = "^[a-z][a-z0-9+.-]*://([^/]*\\.)?";
    src = src.slice(2);
  } else if (src.startsWith("|")) {
    re = "^";
    src = src.slice(1);
  }
  let endAnchor = false;
  if (src.endsWith("|")) {
    endAnchor = true;
    src = src.slice(0, -1);
  }
  for (const ch of src) {
    if (ch === "*") re += ".*";
    else if (ch === "^") re += "(?:[^a-zA-Z0-9_.%-]|$)";
    else re += ch.replace(/[.+?${}()|[\]\\/]/g, "\\$&");
  }
  if (endAnchor) re += "$";
  return new RegExp(re, "i");
}

export function buildMatchers(state) {
  if (state.enabled === false) return [];
  return state.filters
    .filter((f) => f.enabled)
    .map((f) => {
      try {
        return filterToRegExp(f.pattern);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Textarea editor format: one pattern per line, "# " prefix = disabled.
export function filtersToText(filters) {
  return filters
    .map((f) => (f.enabled ? f.pattern : "# " + f.pattern))
    .join("\n");
}

// Parse editor text back into filters. Keeps createdAt of patterns that
// already existed; drops duplicates; collects invalid lines for feedback.
export function parseFilterText(text, existingFilters) {
  const byPattern = new Map(existingFilters.map((f) => [f.pattern, f]));
  const filters = [];
  const invalidLines = [];
  const seen = new Set();
  let nextId = 1;

  for (const rawLine of text.split("\n")) {
    let line = rawLine.trim();
    if (!line) continue;
    let enabled = true;
    if (line.startsWith("#")) {
      enabled = false;
      line = line.replace(/^#+\s*/, "");
      if (!line) continue;
    }
    const normalized = normalizePattern(line);
    if (!normalized) {
      invalidLines.push(rawLine.trim());
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    filters.push({
      id: nextId++,
      pattern: normalized,
      enabled,
      createdAt: byPattern.get(normalized)?.createdAt ?? Date.now(),
    });
  }
  return { filters, invalidLines };
}

export async function removeFilter(id) {
  const { filters } = await getState();
  await setState({ filters: filters.filter((f) => f.id !== id) });
}

export async function toggleFilter(id, enabled) {
  const { filters } = await getState();
  const filter = filters.find((f) => f.id === id);
  if (filter) filter.enabled = enabled;
  await setState({ filters });
}
