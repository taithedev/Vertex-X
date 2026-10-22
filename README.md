# Vertex X

Vertex X is a native Windows desktop application built in C# and WPF. No Electron.

## Features
- Dark monochrome interface inspired by compact development tools
- Multi-tab Lua script editor, file open/save, local script library, output console
- Supabase email/password authentication with a username attached to a profile
- Dedicated vertexx_ tables and row-level security in the existing Zuzify project
- Roblox public profile search (not verified account linking)
- Update checks from GitHub Releases, with optional installer download and SHA256 verification
- Windows per-user dark installer with Start menu shortcut, optional desktop shortcut and uninstall support

## Download and install
Check https://github.com/taithedev/Vertex-X/releases for the latest Windows setup EXE. If no release appears, no downloadable installer has been published yet. GitHub Releases host finished executables; they do not compile source code.

## Build installer locally (no GitHub Actions)
On a Windows x64 PC, download this repository as a ZIP, extract it, then double-click Build-VertexX.cmd. The script uses Windows Package Manager (winget) to install missing .NET 8 SDK and Inno Setup 6 prerequisites, then builds the native app.

Output: installer-output/VertexX-Setup-0.4.1-x64.exe and installer-output/SHA256SUMS.txt

To publish the EXE, authenticate GitHub CLI with gh auth login, then double-click Publish-VertexX-Release.cmd (or run tools/Build-VertexX.ps1 -Publish from PowerShell). It uploads the installer and checksums to a new v0.4.1 GitHub Release on taithedev/Vertex-X. Existing tags are not overwritten.

## In-app update behavior
On launch or when Updates is clicked, Vertex X checks the official GitHub Releases API. A newer published release can be downloaded and SHA256-verified in the application. Opening the verified setup requires confirmation. During setup, the same installer AppId is used so newer versions upgrade existing installs.

## Run from source
Windows + .NET 8 SDK:

    dotnet restore VertexX/VertexX.csproj
    dotnet run --project VertexX/VertexX.csproj

## Known limitations
- Installers are unsigned. Windows SmartScreen may warn about an unknown publisher.
- GitHub Actions was removed. Build and publish using a Windows PC instead.
- The updated installer and updater still require end-to-end Windows testing.
- Lua runs in-process with MoonSharp's restricted preset, not a hardened sandbox. Run only scripts you trust.
- No Roblox client injection or anti-cheat bypass.
- Username-only login, verified Roblox OAuth linking, and unattended auto-install are not implemented.

See docs/INTEGRATIONS.md for account and database information.
