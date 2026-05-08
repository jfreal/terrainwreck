// Map editor: drag, drop, rotate, keyboard, undo/redo.
//
// Coordinates are always in BOARD space (1524 x 1125). The board element is
// scaled to fit its container; conversions between board space and screen
// pixels happen at the boundary (drag handlers).

import { BOARD_WIDTH, BOARD_HEIGHT, findMission, findTerrainSet, pieceImagePath } from "./catalog.js";
import { writeStateToUrl } from "./share.js";

const NUDGE_PX = 5;        // board-space px per arrow press
const ROTATE_DEG = 5;      // degrees per rotate press
const SNAP_PX = 25;        // grid spacing when snap-to-grid is on
const UNDO_LIMIT = 50;

// Inline fallback shown when an image fails to load (broken filename, etc).
const MISSING_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#eee" stroke="#999" stroke-width="2" stroke-dasharray="6 4"/>' +
    '<text x="50" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#888">missing</text>' +
    '</svg>'
  );

// ---- Module state ----

let state = null;          // { v, m, t, p: [...] }
let board = null;          // #board DOM node
let palette = null;        // #palette DOM node
let pieceEls = new Map();  // pieceId -> DOM element
let selectedId = null;
let snapEnabled = false;
const undoStack = [];
const redoStack = [];
let nextLocalId = 1;

// ---- Public API (called by main.js) ----

export function initEditor(initialState, opts = {}) {
  state = normalizeState(initialState);
  board = document.getElementById("board");
  palette = document.getElementById("palette");
  setupBoard();
  setupKeyboard();
  setupToolbar();
  renderAll();
  pushSnapshot(true);
  return {
    getState: () => state,
    setSnap: (on) => { snapEnabled = on; },
    undo, redo,
  };
}

export function setMission(missionId) {
  state.m = missionId;
  renderBoardBackground();
  commit();
}

export function setTerrainSet(setId) {
  state.t = setId;
  renderPalette();
  commit();
}

// ---- State normalization ----

function normalizeState(raw) {
  const s = raw || {};
  return {
    v: 1,
    m: s.m || "map-op-1",
    t: s.t || "octarius",
    p: Array.isArray(s.p) ? s.p.map(normPiece) : [],
  };
}

function normPiece(p) {
  return {
    id: p.id || generateLocalId(),
    s: p.s,
    x: Number.isFinite(p.x) ? p.x : 0,
    y: Number.isFinite(p.y) ? p.y : 0,
    r: Number.isFinite(p.r) ? p.r : 0,
  };
}

function generateLocalId() {
  return `p${nextLocalId++}`;
}

// State stored in the URL drops the local-only `id` field — pieces are
// re-keyed on load. This keeps URLs short.
function publicState() {
  return {
    v: 1,
    m: state.m,
    t: state.t,
    p: state.p.map(p => ({ s: p.s, x: Math.round(p.x), y: Math.round(p.y), r: ((p.r % 360) + 360) % 360 })),
  };
}

// ---- Rendering ----

function renderAll() {
  renderBoardBackground();
  renderPalette();
  renderPieces();
}

function renderBoardBackground() {
  const mission = findMission(state.m);
  board.style.backgroundImage = `url(${mission.img})`;
  board.style.backgroundSize = "100% 100%";
  // Maintain aspect ratio via CSS (see styles.css); no explicit width/height here.
  document.querySelectorAll("[data-mission-id]").forEach(opt => {
    opt.toggleAttribute("selected", opt.dataset.missionId === state.m);
  });
}

function renderPalette() {
  if (!palette) return;
  palette.innerHTML = "";
  const set = findTerrainSet(state.t);
  for (const pieceSrc of set.pieces) {
    const img = document.createElement("img");
    img.className = "palette-piece";
    img.src = pieceImagePath(pieceSrc);
    img.alt = pieceSrc;
    img.draggable = false;
    img.dataset.src = pieceSrc;
    img.onerror = () => { img.onerror = null; img.src = MISSING_DATA_URI; };
    img.addEventListener("pointerdown", onPaletteDragStart);
    palette.appendChild(img);
  }
}

function renderPieces() {
  // Diff: remove DOM nodes for pieces no longer in state, add new ones, update existing
  const stateIds = new Set(state.p.map(p => p.id));
  for (const [id, el] of pieceEls) {
    if (!stateIds.has(id)) { el.remove(); pieceEls.delete(id); }
  }
  for (const piece of state.p) {
    let el = pieceEls.get(piece.id);
    if (!el) {
      el = createPieceElement(piece);
      board.appendChild(el);
      pieceEls.set(piece.id, el);
    }
    updatePieceElement(el, piece);
  }
}

function createPieceElement(piece) {
  const el = document.createElement("div");
  el.className = "piece";
  el.dataset.pieceId = piece.id;
  const img = document.createElement("img");
  img.src = pieceImagePath(piece.s);
  img.alt = piece.s;
  img.draggable = false;
  img.onerror = () => { img.onerror = null; img.src = MISSING_DATA_URI; };
  // When the natural size is known, store it on the element so we can size it
  img.addEventListener("load", () => {
    el.dataset.natW = img.naturalWidth || 200;
    el.dataset.natH = img.naturalHeight || 200;
    updatePieceElement(el, getPiece(piece.id));
  });
  el.appendChild(img);
  el.addEventListener("pointerdown", onPiecePointerDown);
  return el;
}

function updatePieceElement(el, piece) {
  if (!piece) return;
  // Position the piece by its top-left in board space, scaled to displayed size.
  // The board uses CSS `aspect-ratio` so its rendered size matches BOARD_WIDTH:BOARD_HEIGHT.
  // We position via percentage so we never have to manually rescale on resize.
  const natW = Number(el.dataset.natW) || 200;
  const natH = Number(el.dataset.natH) || 200;
  el.style.left   = `${(piece.x / BOARD_WIDTH) * 100}%`;
  el.style.top    = `${(piece.y / BOARD_HEIGHT) * 100}%`;
  el.style.width  = `${(natW / BOARD_WIDTH) * 100}%`;
  el.style.height = `${(natH / BOARD_HEIGHT) * 100}%`;
  el.style.transform = `rotate(${piece.r}deg)`;
  el.classList.toggle("selected", piece.id === selectedId);
}

// ---- Helpers: lookup, snap ----

function getPiece(id) {
  return state.p.find(p => p.id === id);
}

function snap(v) {
  if (!snapEnabled) return v;
  return Math.round(v / SNAP_PX) * SNAP_PX;
}

// Convert a clientX/Y (CSS pixels) to board-space coordinates.
function screenToBoard(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  const px = (clientX - rect.left) / rect.width;
  const py = (clientY - rect.top) / rect.height;
  return { x: px * BOARD_WIDTH, y: py * BOARD_HEIGHT };
}

// ---- Selection ----

function select(id) {
  selectedId = id;
  for (const [pid, el] of pieceEls) el.classList.toggle("selected", pid === id);
}

// ---- Palette drag (create new piece) ----

function onPaletteDragStart(ev) {
  if (ev.button !== 0) return;
  ev.preventDefault();
  const src = ev.currentTarget.dataset.src;

  // Create a temporary ghost that follows the cursor until release.
  const ghost = ev.currentTarget.cloneNode(true);
  ghost.classList.add("drag-ghost");
  ghost.style.position = "fixed";
  ghost.style.pointerEvents = "none";
  ghost.style.opacity = "0.7";
  ghost.style.left = `${ev.clientX - 50}px`;
  ghost.style.top = `${ev.clientY - 50}px`;
  document.body.appendChild(ghost);

  const onMove = e => {
    ghost.style.left = `${e.clientX - 50}px`;
    ghost.style.top = `${e.clientY - 50}px`;
  };
  const onUp = e => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    ghost.remove();
    // If released over the board, place the piece.
    const r = board.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      placePiece(src, e.clientX, e.clientY);
    }
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function placePiece(src, clientX, clientY) {
  // Use temp <img> to read natural size so we can center the piece on the cursor.
  const probe = new Image();
  probe.onload = () => {
    const natW = probe.naturalWidth || 200;
    const natH = probe.naturalHeight || 200;
    const center = screenToBoard(clientX, clientY);
    const piece = {
      id: generateLocalId(),
      s: src,
      x: snap(center.x - natW / 2),
      y: snap(center.y - natH / 2),
      r: 0,
    };
    state.p.push(piece);
    renderPieces();
    select(piece.id);
    commit();
  };
  probe.src = pieceImagePath(src);
}

// ---- Placed piece drag (move existing) ----

function onPiecePointerDown(ev) {
  if (ev.button !== 0) return;
  ev.stopPropagation();
  const el = ev.currentTarget;
  const id = el.dataset.pieceId;
  const piece = getPiece(id);
  if (!piece) return;
  select(id);

  const start = screenToBoard(ev.clientX, ev.clientY);
  const startX = piece.x, startY = piece.y;
  let moved = false;
  el.setPointerCapture(ev.pointerId);

  const onMove = e => {
    const cur = screenToBoard(e.clientX, e.clientY);
    const dx = cur.x - start.x;
    const dy = cur.y - start.y;
    if (!moved && (Math.abs(dx) + Math.abs(dy)) > 2) moved = true;
    piece.x = snap(startX + dx);
    piece.y = snap(startY + dy);
    updatePieceElement(el, piece);
  };
  const onUp = () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.releasePointerCapture(ev.pointerId);
    if (moved) commit();
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
}

// ---- Keyboard ----

function setupKeyboard() {
  window.addEventListener("keydown", ev => {
    // Undo / redo
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
      ev.preventDefault();
      if (ev.shiftKey) redo(); else undo();
      return;
    }
    if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "y") {
      ev.preventDefault();
      redo();
      return;
    }

    if (!selectedId) return;
    const piece = getPiece(selectedId);
    if (!piece) return;

    let consumed = true;
    switch (ev.key) {
      case "ArrowUp":    piece.y -= NUDGE_PX; break;
      case "ArrowDown":  piece.y += NUDGE_PX; break;
      case "ArrowLeft":
        if (ev.shiftKey) piece.r = (piece.r - ROTATE_DEG); else piece.x -= NUDGE_PX;
        break;
      case "ArrowRight":
        if (ev.shiftKey) piece.r = (piece.r + ROTATE_DEG); else piece.x += NUDGE_PX;
        break;
      case "Delete":
      case "Backspace":
        deleteSelected(); consumed = true; break;
      case "Escape":
        select(null); break;
      default:
        consumed = false;
    }
    if (consumed) {
      ev.preventDefault();
      const el = pieceEls.get(piece.id);
      if (el) updatePieceElement(el, piece);
      commit();
    }
  });

  // Click outside the board deselects.
  document.addEventListener("pointerdown", ev => {
    if (!ev.target.closest(".piece") && !ev.target.closest(".toolbar")) {
      select(null);
    }
  });
}

// ---- Toolbar ----

function setupToolbar() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    let interval = null;
    const start = () => {
      stopAll();
      fn();
      interval = setInterval(fn, 100);
    };
    const stopAll = () => { if (interval) { clearInterval(interval); interval = null; } };
    el.addEventListener("pointerdown", start);
    el.addEventListener("pointerup", stopAll);
    el.addEventListener("pointerleave", stopAll);
  };
  const moveSel = (dx, dy) => {
    const p = getPiece(selectedId); if (!p) return;
    p.x = snap(p.x + dx); p.y = snap(p.y + dy);
    const el = pieceEls.get(p.id); if (el) updatePieceElement(el, p);
    commit();
  };
  const rotateSel = (dr) => {
    const p = getPiece(selectedId); if (!p) return;
    p.r = (p.r + dr) % 360;
    const el = pieceEls.get(p.id); if (el) updatePieceElement(el, p);
    commit();
  };
  bind("move-up",     () => moveSel(0, -NUDGE_PX));
  bind("move-down",   () => moveSel(0,  NUDGE_PX));
  bind("move-left",   () => moveSel(-NUDGE_PX, 0));
  bind("move-right",  () => moveSel( NUDGE_PX, 0));
  bind("rotate-left", () => rotateSel(-ROTATE_DEG));
  bind("rotate-right",() => rotateSel( ROTATE_DEG));
  document.getElementById("delete-piece")?.addEventListener("click", deleteSelected);
}

function deleteSelected() {
  if (!selectedId) return;
  state.p = state.p.filter(p => p.id !== selectedId);
  selectedId = null;
  renderPieces();
  commit();
}

// ---- Board setup ----

function setupBoard() {
  // Click on empty board area deselects.
  board.addEventListener("pointerdown", ev => {
    if (ev.target === board) select(null);
  });
}

// ---- Commit / Undo / Redo ----

// Called on any state mutation. Snapshots state, persists to URL.
function commit() {
  pushSnapshot(false);
  writeStateToUrl(publicState());
}

function pushSnapshot(initial) {
  // Don't snapshot in initial render; just persist URL.
  if (initial) {
    writeStateToUrl(publicState());
    return;
  }
  undoStack.push(JSON.stringify(publicState()));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length < 2) return; // need at least one prior state
  const current = undoStack.pop();
  redoStack.push(current);
  const prior = undoStack[undoStack.length - 1];
  loadFromSnapshot(prior);
}

export function redo() {
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(next);
  loadFromSnapshot(next);
}

function loadFromSnapshot(json) {
  const parsed = JSON.parse(json);
  state = normalizeState(parsed);
  selectedId = null;
  pieceEls.forEach(el => el.remove());
  pieceEls.clear();
  renderAll();
  writeStateToUrl(publicState());
}
