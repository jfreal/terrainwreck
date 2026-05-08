#!/usr/bin/env bash
# Run from the MapBuilder folder. Starts a local HTTP server and opens
# the page in the default browser. Mac / Linux equivalent of run.bat.

set -e
cd "$(dirname "$0")"

PORT=8765
URL="http://localhost:$PORT/"

echo "Starting Kill Team Map Builder at $URL"
echo "Press Ctrl+C to stop the server."
echo

# Open the URL in the default browser shortly after starting.
( sleep 1; (open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) ) &

if command -v python3 >/dev/null; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null; then
  exec python -m http.server "$PORT"
elif command -v npx >/dev/null; then
  exec npx --yes serve -l "$PORT" .
else
  echo "No Python or Node found. Install one of:"
  echo "  - Python 3:  https://www.python.org/downloads/"
  echo "  - Node.js:   https://nodejs.org/"
  exit 1
fi
