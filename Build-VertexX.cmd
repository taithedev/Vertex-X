@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo.
echo  VERTEX X - Native Windows Installer
echo  -----------------------------------
echo  Build version: 0.6.0
echo.
if /I "%~1"=="publish" (
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Build-VertexX.ps1" -Version 0.6.0 -Publish
) else (
 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\Build-VertexX.ps1" -Version 0.6.0
)
if errorlevel 1 (
 echo.
 echo ERROR: Build or publication failed. Review the messages above.
 pause
 exit /b 1
)
echo.
echo SUCCESS. See installer-output\VertexX-Setup-0.6.0-x64.exe.
if /I not "%~1"=="publish" start "" "%~dp0installer-output"
pause
exit /b 0
