@echo off
title TutorTech LMS - Online Tutoring Platform
echo ====================================================
echo        TutorTech - Online Tutoring LMS
echo ====================================================
echo.

set "NODE_PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
)

cd /d "%~dp0"

echo [1/2] Starting TutorTech LMS Server on port 3000...
echo [2/2] Opening your browser to http://localhost:3000 ...
echo.
echo ====================================================
echo Login Accounts for testing:
echo   - Tutor / Admin : admin / admin123
echo   - Student 1     : alex.turner / alex123
echo   - Student 2     : sarah.khan / sarah123
echo ====================================================
echo.

start "" "http://localhost:3000"
node server.js

pause
