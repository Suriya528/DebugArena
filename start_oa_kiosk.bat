@echo off
echo =======================================================
echo   DebugArena - Amazon OA Dedicated Kiosk Launcher
echo =======================================================
echo.
echo Launching Google Chrome in 100%% lockdown Kiosk Mode:
echo   - No "Press Esc to exit" banner
echo   - No top hover [X] close option
echo   - No URL bar, tabs, or browser chrome
echo.

set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% set CHROME_PATH="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if exist %CHROME_PATH% (
    start "" %CHROME_PATH% --kiosk --app="http://localhost:5173" --start-fullscreen --disable-pinch --overscroll-history-navigation=0 --no-first-run --disable-features=OverlayScrollbar
) else (
    echo Chrome not found in standard paths. Launching in Microsoft Edge Kiosk Mode...
    start "" msedge.exe --kiosk "http://localhost:5173" --edge-kiosk-type=fullscreen --no-first-run
)
