@echo off
title Push TutorTech LMS to GitHub
echo ====================================================
echo       Pushing TutorTech LMS to GitHub
echo       Repository: tutortech77-crypto/tutortech-lms
echo ====================================================
echo.

set "GIT_PATH=%LOCALAPPDATA%\Programs\Git\cmd"
if exist "%GIT_PATH%\git.exe" (
    set "PATH=%GIT_PATH%;%PATH%"
)

cd /d "%~dp0"

echo [1/2] Verifying Git status...
git status
echo.

echo [2/2] Pushing branch 'main' to GitHub origin...
echo (If prompted, enter your GitHub Username and Personal Access Token or login via browser)
echo.

git push -u origin main

echo.
echo ====================================================
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] TutorTech LMS pushed to GitHub successfully!
    echo You can now go to Vercel or Netlify to deploy it online.
) else (
    echo [NOTE] If you were prompted for a password, remember that
    echo GitHub requires a Personal Access Token (PAT) instead of your
    echo normal password. 
    echo Create one at: https://github.com/settings/tokens
)
echo ====================================================
echo.
pause
