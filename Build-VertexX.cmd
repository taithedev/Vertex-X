@echo off
setlocal
cd /d "%~dp0"
echo Vertex X - Native Windows Setup Builder
echo ---------------------------------------
powershell.exe -NoProfile -File "%~dp0tools\Build-VertexX.ps1" %*
set EXITCODE=%ERRORLEVEL%
echo.
if not "%EXITCODE%"=="0" (
  echo Build failed. Review the errors above.
) else (
  echo Build completed. Find the setup EXE inside installer-output.
)
pause
exit /b %EXITCODE%
