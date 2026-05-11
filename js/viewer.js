// Read-only renderer. Used when the URL has ?view=1.
// Lays out pieces from the state JSON without any interactivity.

import { BOARD_WIDTH, BOARD_HEIGHT, findMission, pieceImagePath } from "./catalog.js";

const MISSING_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<rect width="100" height="100" fill="#eee" stroke="#999" stroke-width="2" stroke-dasharray="6 4"/>' +
    '<text x="50" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#888">missing</text>' +
    '</svg>'
  );

export function renderViewer(state) {
  const board = document.getElementById("board");
  const mission = findMission(state.m);
  board.style.backgroundImage = `url(${mission.img})`;
  board.style.backgroundSize = "100% 100%";
  board.innerHTML = "";

  for (const piece of (state.p || [])) {
    const el = document.createElement("div");
    el.className = "piece view-only";
    const img = document.createElement("img");
    img.src = pieceImagePath(piece.s);
    img.draggable = false;
    img.alt = piece.s;
    img.onerror = () => { img.onerror = null; img.src = MISSING_DATA_URI; };
    img.addEventListener("load", () => {
      const natW = img.naturalWidth || 200;
      const natH = img.naturalHeight || 200;
      el.style.left   = `${(piece.x / BOARD_WIDTH) * 100}%`;
      el.style.top    = `${(piece.y / BOARD_HEIGHT) * 100}%`;
      el.style.width  = `${(natW / BOARD_WIDTH) * 100}%`;
      el.style.height = `${(natH / BOARD_HEIGHT) * 100}%`;
      el.style.transform = `rotate(${piece.r || 0}deg)`;
    });
    el.appendChild(img);
    const label = document.createElement("span");
    label.className = "piece-label";
    if (piece.l) {
      label.textContent = String(piece.l).slice(0, 1).toUpperCase();
      label.classList.add("has-label");
    }
    // Counter-rotate so the letter stays upright regardless of piece rotation.
    label.style.transform = `translate(-50%, -50%) rotate(${-(piece.r || 0)}deg)`;
    el.appendChild(label);
    board.appendChild(el);
  }
}
