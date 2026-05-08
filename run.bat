@echo off
REM Double-click this file to start the map builder.
REM Tries Python first (usually pre-installed on Windows 11), then Node.

cd /d "%~dp0"

REM Pick an open-ish port
set PORT=8765

echo Starting Kill Team Map Builder at http://localhost:%PORT%/
echo Close this window to stop the server.
echo.

REM Open the page in the default browser shortly after the server starts.
start "" "http://localhost:%PORT%/"

REM Try Python 3 first.
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m http.server %PORT%
  goto :end
)
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python -m http.server %PORT%
  goto :end
)

REM Fall back to Node's serve.
where npx >nul 2>nul
if %ERRORLEVEL%==0 (
  npx --yes serve -l %PORT% .
  goto :end
)

echo.
echo No Python or Node found. Install one of:
echo   - Python 3:  https://www.python.org/downloads/
echo   - Node.js:   https://nodejs.org/
echo Then double-click run.bat again.
pause

:end
