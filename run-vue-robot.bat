@echo off
setlocal

set "ROBOT_IP=%~1"
if "%ROBOT_IP%"=="" set "ROBOT_IP=192.168.1.244"
set "VALETUDO_DEV_BACKEND=http://%ROBOT_IP%"

pushd "%~dp0" || exit /b 1

where npm >nul 2>&1
if errorlevel 1 (
    echo Node.js and npm are required. Install Node.js 22.12 or newer.
    goto :error
)

if not exist "node_modules\.bin\vite.cmd" (
    echo Installing dependencies...
    call npm ci
    if errorlevel 1 goto :error
)

echo Starting Vue UI with robot at %VALETUDO_DEV_BACKEND%
call npm run dev --workspace=frontend-vue -- --open
set "EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %EXIT_CODE%

:error
popd
pause
exit /b 1
