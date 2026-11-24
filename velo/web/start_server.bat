@echo off
rem ============================================================
rem start_server.bat — run the web game LOCALLY (no internet).
rem Double-click this file: it starts a local server, opens the
rem browser at the game URL, and stays open so you can stop it.
rem NOTE: do NOT double-click index.html directly (browsers block
rem file:// asset loading). Always use this server.
rem ============================================================
cd /d "%~dp0\.."
echo.
echo  Starting local server...  (Ctrl+C in this window to stop)
echo.
start "" "http://localhost:8090/build/webgl/"
python -m http.server 8090
pause
