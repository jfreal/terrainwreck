// Entry point. Decides between view mode and edit mode, wires up the
// mission/terrain selectors and the share/fork buttons.

import { MISSIONS, TERRAIN_SETS, BOARD_WIDTH, BOARD_HEIGHT, findMission } from "./catalog.js";
import { readStateFromUrl, isViewMode, viewLink, editLink, copyToClipboard, writeStateToUrl } from "./share.js";
import { initEditor, setMission, setTerrainSet } from "./editor.js";
import { renderViewer } from "./viewer.js";

const DEFAULT_STATE = { v: 1, m: "map-op-1", t: "octarius", p: [] };

function bootstrap() {
  const state = readStateFromUrl() || DEFAULT_STATE;

  if (isViewMode()) {
    document.body.classList.add("view-mode");
    renderViewer(state);
    updateMissionTitle(state.m);
    setupForkButton(state);
    setupDownloadButton(() => state);
    setupResponsiveBoard();
    return;
  }

  populateSelectors(state);
  const editor = initEditor(state, {
    // Keep the title and selector dropdowns in sync after editor-internal
    // state reloads (undo / redo / future paste-state hooks).
    onStateLoad: (s) => {
      updateMissionTitle(s.m);
      syncSelectors(s);
    },
  });
  updateMissionTitle(state.m);

  document.getElementById("mission-select").addEventListener("change", e => {
    setMission(e.target.value);
    updateMissionTitle(e.target.value);
  });
  document.getElementById("terrain-select").addEventListener("change", e => {
    setTerrainSet(e.target.value);
  });
  document.getElementById("snap-toggle").addEventListener("change", e => {
    editor.setSnap(e.target.checked);
  });

  setupShareButtons(editor);
  setupNewMapButton();
  setupDownloadButton(() => editor.getState());
  setupResponsiveBoard();
}

function populateSelectors(state) {
  const ms = document.getElementById("mission-select");
  ms.innerHTML = "";
  for (const m of MISSIONS) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.label;
    if (m.id === state.m) opt.selected = true;
    ms.appendChild(opt);
  }
  const ts = document.getElementById("terrain-select");
  ts.innerHTML = "";
  for (const t of TERRAIN_SETS) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.label;
    if (t.id === state.t) opt.selected = true;
    ts.appendChild(opt);
  }
}

function setupShareButtons(editor) {
  const flash = (msg) => {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  };
  document.getElementById("share-edit").addEventListener("click", async () => {
    const link = editLink(editor.getState());
    const ok = await copyToClipboard(link);
    flash(ok ? "Edit link copied to clipboard" : "Couldn't copy — long-press the URL bar instead");
  });
  document.getElementById("share-view").addEventListener("click", async () => {
    const link = viewLink(editor.getState());
    const ok = await copyToClipboard(link);
    flash(ok ? "View-only link copied to clipboard" : "Couldn't copy — long-press the URL bar instead");
  });
}

function setupNewMapButton() {
  document.getElementById("new-map").addEventListener("click", () => {
    if (!confirm("Start a new map? Your current map URL will be replaced.")) return;
    window.location.hash = "";
    window.location.reload();
  });
}

function setupDownloadButton(getState) {
  const btn = document.getElementById("download-png");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const board = document.getElementById("board");
    if (!board || typeof html2canvas === "undefined") {
      console.warn("html2canvas not available");
      return;
    }

    // Briefly clear any selection outline so it doesn't appear in the export.
    const previouslySelected = board.querySelector(".piece.selected");
    previouslySelected?.classList.remove("selected");

    btn.disabled = true;
    const originalLabel = btn.textContent;
    btn.textContent = "Rendering...";

    try {
      // Compute scale so the export is rendered at full board resolution
      // (1524 px wide), regardless of the board's current display size.
      const rect = board.getBoundingClientRect();
      const scale = Math.max(1, BOARD_WIDTH / rect.width);

      const canvas = await html2canvas(board, {
        scale,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("toBlob returned null");

      const state = getState();
      const filename = filenameFor(state);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a beat so Chrome has time to use the URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Download failed:", err);
      const toast = document.getElementById("toast");
      if (toast) {
        toast.textContent = "Couldn't render the image — check the console.";
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 2200);
      }
    } finally {
      previouslySelected?.classList.add("selected");
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  });
}

function filenameFor(state) {
  const mission = (state?.m || "map").replace(/[^a-z0-9-]/gi, "");
  const terrain = (state?.t || "set").replace(/[^a-z0-9-]/gi, "");
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "");
  return `killteam-${mission}-${terrain}-${stamp}.png`;
}

function updateMissionTitle(missionId) {
  const el = document.getElementById("mission-title-name");
  if (!el) return;
  // findMission falls back to a default for unknown ids, matching what the
  // board background actually renders — keeps the title in sync with what
  // the user sees instead of going blank.
  const m = findMission(missionId);
  el.textContent = m ? m.label : "";
}

function syncSelectors(state) {
  const ms = document.getElementById("mission-select");
  if (ms && ms.value !== state.m) ms.value = state.m;
  const ts = document.getElementById("terrain-select");
  if (ts && ts.value !== state.t) ts.value = state.t;
}

function setupForkButton(state) {
  const btn = document.getElementById("fork-button");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // Drop the ?view flag, keep the same hash → reload as editor.
    window.location.search = "";
  });
}

// Size the board wrapper to fit the available stage rectangle while
// preserving the 1524:1125 aspect ratio. CSS aspect-ratio + max-width/height
// is unreliable inside a flex item whose own height comes from flexing —
// browsers don't consistently shrink both dimensions. Compute explicitly.
function setupResponsiveBoard() {
  const stage = document.querySelector(".board-stage");
  const wrapper = document.querySelector(".board-wrapper");
  if (!stage || !wrapper) return;
  const ar = BOARD_WIDTH / BOARD_HEIGHT;
  const fit = () => {
    const cs = getComputedStyle(stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availW = stage.clientWidth - padX;
    const availH = stage.clientHeight - padY;
    if (availW <= 0 || availH <= 0) return;
    let w, h;
    if (availW / availH > ar) { h = availH; w = h * ar; }
    else                      { w = availW; h = w / ar; }
    wrapper.style.width  = `${w}px`;
    wrapper.style.height = `${h}px`;
  };
  fit();
  window.addEventListener("resize", fit);
  // Catches palette-row height changes (terrain set switch) and other
  // surrounding-layout shifts that change the stage's flex-distributed height.
  // Feature-detect: older / non-DOM environments may not have ResizeObserver,
  // in which case the window resize listener alone is the fallback.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(fit).observe(stage);
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
