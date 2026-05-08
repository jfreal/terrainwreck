// URL-as-storage layer.
//
// The entire map state is encoded into the URL hash as base64-url JSON.
// Hash (vs query) is preferred because:
//   - It never gets sent to the server (better privacy)
//   - It works on purely static hosts
//   - Updating it doesn't trigger navigation
//
// State shape (kept short for URL efficiency):
//   { v: 1, m: missionId, t: terrainSetId, p: [{s, x, y, r}, ...] }

const HASH_PREFIX = "#m=";
const VIEW_FLAG = "view=1";

// ---- Encoding ----

export function encodeState(state) {
  const json = JSON.stringify(state);
  return base64UrlEncode(json);
}

export function decodeState(encoded) {
  try {
    const json = base64UrlDecode(encoded);
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to decode state from URL:", err);
    return null;
  }
}

// ---- URL helpers ----

export function readStateFromUrl() {
  const hash = window.location.hash || "";
  if (!hash.startsWith(HASH_PREFIX)) return null;
  return decodeState(hash.slice(HASH_PREFIX.length));
}

// Update the URL without adding a history entry. Called on every edit.
export function writeStateToUrl(state) {
  const encoded = encodeState(state);
  const view = isViewMode() ? `?${VIEW_FLAG}` : window.location.search;
  const newUrl = `${window.location.pathname}${view}${HASH_PREFIX}${encoded}`;
  history.replaceState(null, "", newUrl);
}

export function isViewMode() {
  return new URLSearchParams(window.location.search).has("view");
}

// Build a "view-only" link to the current map (other person can fork to edit).
export function viewLink(state) {
  const encoded = encodeState(state);
  const origin = window.location.origin === "null" || !window.location.origin
    ? ""
    : window.location.origin;
  return `${origin}${window.location.pathname}?${VIEW_FLAG}${HASH_PREFIX}${encoded}`;
}

// Build an "edit" link (no ?view flag).
export function editLink(state) {
  const encoded = encodeState(state);
  const origin = window.location.origin === "null" || !window.location.origin
    ? ""
    : window.location.origin;
  return `${origin}${window.location.pathname}${HASH_PREFIX}${encoded}`;
}

// ---- Clipboard ----

export async function copyToClipboard(text) {
  // Modern API
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback: hidden textarea + execCommand
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch (_) {}
  document.body.removeChild(ta);
  return ok;
}

// ---- base64url ----
// Standard base64 uses + / = which need URL-encoding. base64url swaps in
// - _ and drops the padding, so the URL stays clean and readable.

function base64UrlEncode(str) {
  // UTF-8 safe: encodeURIComponent → unescape → btoa
  const utf8 = unescape(encodeURIComponent(str));
  return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(b64url) {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // Re-pad
  while (b64.length % 4) b64 += "=";
  const utf8 = atob(b64);
  return decodeURIComponent(escape(utf8));
}
