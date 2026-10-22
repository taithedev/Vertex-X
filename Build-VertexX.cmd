@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "VERSION=0.4.1"
set "PROJECT=%CD%\VertexX\VertexX.csproj"
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
set "SETUP=%CD%\installer-output\VertexX-Setup-%VERSION%-x64.exe"
set "SUMS=%CD%\installer-output\SHA256SUMS.txt"
echo.
echo  VERTEX X -- Windows Setup Builder
echo  --------------------------------
if not exist "%PROJECT%" (
 echo ERROR: Unzip the entire Vertex-X repository before running this file.
 goto :failed
)
where dotnet >nul 2>nul
if errorlevel 1 (
 if exist "%ProgramFiles%\dotnet\dotnet.exe" (
  set "PATH=%ProgramFiles%\dotnet;%PATH%"
 ) else (
  echo Installing .NET 8 SDK using Windows Package Manager...
  winget install --id Microsoft.DotNet.SDK.8 --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :failed
  set "PATH=%ProgramFiles%\dotnet;%PATH%"
 )
)
dotnet --list-sdks | findstr /b "8." >nul
if errorlevel 1 (
 echo Installing missing .NET 8 SDK...
 winget install --id Microsoft.DotNet.SDK.8 --exact --accept-package-agreements --accept-source-agreements
 if errorlevel 1 goto :failed
)
dotnet --list-sdks | findstr /b "8." >nul
if errorlevel 1 (
 echo ERROR: .NET 8 SDK was not found. Restart this terminal after installation.
 goto :failed
)
if not exist "%ISCC%" (
 if exist "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" (
  set "ISCC=%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
 ) else (
  echo Installing Inno Setup 6 using Windows Package Manager...
  winget install --id JRSoftware.InnoSetup --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :failed
 )
)
if not exist "%ISCC%" (
 echo ERROR: Could not locate ISCC.exe after Inno Setup installation.
 goto :failed
)
echo.
echo Building native Vertex X application...
dotnet restore "%PROJECT%" 
if errorlevel 1 goto :failed
dotnet publish "%PROJECT%" -c Release -r win-x64 --self-contained true "-p:Version=%VERSION%" "-p:PublishSingleFile=true" "-p:EnableCompressionInSingleFile=true" -o "%CD%\publish"
if errorlevel 1 goto :failed
if not exist "%CD%\publish\VertexX.exe" goto :failed
echo.
echo Building dark-theme setup installer...
"%ISCC%" "/DMyAppVersion=%VERSION%" "%CD%\installer\VertexX.iss"
if errorlevel 1 goto :failed
if not exist "%SETUP%" goto :failed
powershell.exe -NoProfile -Command "$f='%SETUP%';$h=(Get-FileHash -Algorithm SHA256 -LiteralPath $f).Hash.ToLowerInvariant();[IO.File]::WriteAllText('%SUMS%',$h+'  '+[IO.Path]::GetFileName($f)+[Environment]::NewLine,(New-Object System.Text.UTF8Encoding($false)))"
if errorlevel 1 goto :failed
echo.
echo SUCCESS: %SETUP%
echo SHA256 saved: %SUMS%
echo Unsigned installers may trigger Windows SmartScreen.
if /I "%~1"=="publish" goto :publish
start "" "%CD%\installer-output"
echo.
echo To publish to GitHub Releases, double-click Publish-VertexX-Release.cmd.
pause
exit /b 0

:publish
set "GH=gh"
where gh >nul 2>nul
if errorlevel 1 (
 if exist "%ProgramFiles%\GitHub CLI\gh.exe" (
  set "GH=%ProgramFiles%\GitHub CLI\gh.exe"
 ) else (
  echo Installing GitHub CLI...
  winget install --id GitHub.cli --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 goto :failed
  set "GH=%ProgramFiles%\GitHub CLI\gh.exe"
 )
)
"%GH%" auth status
if errorlevel 1 (
 echo Please sign in to your own GitHub account with: gh auth login
 goto :failed
)
"%GH%" release create "v%VERSION%" "%SETUP%" "%SUMS%" --repo taithedev/Vertex-X --target main --title "Vertex X v%VERSION%" --notes-file "%CD%\docs\RELEASE_NOTES_0.4.1.md"
if errorlevel 1 goto :failed
echo.
echo GitHub Release published: https://github.com/taithedev/Vertex-X/releases/tag/v%VERSION%
pause
exit /b 0

:failed
echo.
echo Build or release failed. Read the messages above.
pause
exit /b 1
