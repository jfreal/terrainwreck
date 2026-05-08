# Kill Team Map Builder (clone)

A drag-and-drop map editor for Kill Team battle layouts, inspired by [battlekit.killteam.ru](https://battlekit.killteam.ru/) but rebuilt as a pure-static site with **URL-as-storage**: the entire map state lives in the page URL, so there is no server, no database, and no accounts. Copy the URL = share the map.

## How it works

1. Pick a mission template (board background) and a terrain set (palette).
2. Drag terrain pieces onto the board. Click to select. Use keyboard or toolbar to nudge, rotate, delete.
3. As you edit, the URL updates live. Click **Share** to copy the URL.
4. Anyone who opens the URL sees your map. They can fork it (just edit), and share their own URL back.

The URL hash holds a base64-encoded JSON blob of the layout. A typical map with 10 pieces is around 250 characters of URL — well within any browser's limit.

## Project structure

```
MapBuilder/
├── index.html          Single-page app — editor + viewer
├── css/
│   └── styles.css      All styling
├── js/
│   ├── main.js         Entry point; mode detection (edit vs view)
│   ├── catalog.js      Mission and terrain set definitions
│   ├── share.js        URL hash encode/decode, clipboard copy
│   ├── editor.js       Drag/drop/rotate/keyboard logic, undo/redo
│   └── viewer.js       Read-only renderer (also used by editor)
├── img/
│   ├── missions/       Board background images (one per mission)
│   └── terrain/        Terrain piece images (one per piece)
└── README.md
```

## Data model

The map state is one JSON object, kept short for URL efficiency:

```js
{
  v: 1,                       // schema version
  m: "map-op-1",              // mission id from catalog
  t: "octarius",              // terrain set id from catalog
  p: [                        // pieces
    { s: "octarius_b_2", x: 420, y: 254, r: 30 },
    // s = source filename (without extension)
    // x, y = position in BOARD coords (1524x1125), top-left of piece
    // r = rotation degrees, 0-359
  ]
}
```

**Coordinates are in board-image space**, not screen pixels — so the same map renders identically on desktop, mobile, and at any zoom. Width and height are derived at render time from the source image's natural dimensions, so they don't need to be stored.

## URL format

```
https://your-site/index.html#m=eyJ2IjoxLCJtIjoibWFwLW9wLTEiLCJ0Ijoib2N0YXJpdXMiLCJwIjpbXX0
```

The hash never gets sent to the server, so this works even for purely static hosts.

`?view=1` in the query string opens the URL in read-only mode (used for the "Share view link" option).

## Assets

The catalog mirrors the original battlekit app: **9 terrain sets, 106 individual pieces, 9 mission backgrounds**.

- `img/missions/{mission-id}.png` — board background at 1524 × 1125 px. Each mission has its grid, drop zones, killzone edges, and objective markers baked in.
- `img/terrain/{piece-id}.png` — individual terrain piece. Natural width/height drives how the piece renders on the board. Transparent backgrounds.

If a file is missing, the editor shows an inline "missing" placeholder. To add new sets, rename pieces, or swap in different art, edit `js/catalog.js` — it's the single source of truth.

## Run locally

**Don't open `index.html` directly** — Chrome blocks ES module imports from `file://` URLs. You need a local HTTP server.

**Easy way (Windows):** double-click `run.bat`. It starts a Python or Node server and opens your browser automatically.

**Easy way (Mac/Linux):** run `./run.sh` from a terminal in the project folder.

**Manual way:**

```bash
# Python 3
python -m http.server 8765

# Or Node
npx serve .
```

Then visit `http://localhost:8765` in your browser.

## Improvements over the original

- **Structured persistence.** The original saves a flat PNG; this saves the layout, so maps are editable, forkable, and re-renderable at any size.
- **Coordinates in board space.** The original stores screen pixels, which means resizing the window can break layouts. This stores logical coordinates.
- **Per-piece transform state.** The original has a known bug where rotation globals leak across selections; this stores transform per element.
- **Native pointer events.** No jQuery or jQuery UI dependency — modern drag/drop with full touch support out of the box.
- **Undo/redo.** Press Ctrl+Z / Ctrl+Y (or Cmd+Z / Cmd+Shift+Z on Mac).
- **Snap-to-grid (optional).** Toggle in the toolbar; snaps to 25 board-px increments.
- **No login required to share.** Link IS the credential.

## Future extensions (not built yet)

- **Optional publish-to-gallery.** A "Publish" button that POSTs the layout to a tiny serverless endpoint (Cloudflare Workers / Vercel function) which assigns a short ID. Shifts only the *publicly listed* maps onto a server; private/draft maps stay URL-only.
- **Real-time co-editing.** Add a WebSocket layer that broadcasts piece moves; conflict-free since each piece has a unique ID.
- **3D LOS overlay.** Compute line-of-sight using piece footprints + heights for tactical preview.
- **Mobile/touch polish.** Pinch-to-zoom on the board.
