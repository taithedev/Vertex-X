# Vertex X

**Vertex X** is a native C# / WPF / .NET 8 desktop application for editing and locally running trusted Lua scripts. No Electron and no browser shell.

## Version
Current source: **0.5.0 beta**. Windows installer build is **not yet independently verified**.

## Features
- Dark OLED-themed native workspace, tabbed editor, script explorer and output console
- Local Lua execution via MoonSharp
- Open, save and Save As support for `.lua` files
- Find & Replace, optional case matching, and Replace All
- Script filename search and one-click access to `Documents/Vertex X/Scripts`
- Quick Lua snippets (hello-world, functions, loops, tables, conditions)
- Preferences for font size, word wrap and automatic release updates
- Supabase email/password sign-up/login and account usernames via the existing Zuzify Supabase project
- Tables `vertexx_profiles` and `vertexx_preferences` with row-level security
- Public Roblox profile lookup (not verified linking)
- GitHub Releases-based update detection and SHA-256 checked installer staging

### Keyboard shortcuts
| Command | Shortcut |
|---|---|
| Run current script | F5 |
| New tab | Ctrl+N |
| Open file | Ctrl+O |
| Save | Ctrl+S |
| Save As | Ctrl+Shift+S |
| Close tab | Ctrl+W |
| Find and replace | Ctrl+F / Ctrl+H |

## Installer: GitHub Releases, not GitHub Actions

Releases page: https://github.com/taithedev/Vertex-X/releases

The desired distributable is **`VertexX-Setup-0.5.0-x64.exe`**, plus `SHA256SUMS.txt`. Those are **not stored in source** and **do not exist until an actual Windows compilation and Inno Setup packaging run succeeds**. This repository intentionally has **no GitHub Actions workflow**.

### Build and publish
A maintainer with a Windows build environment can download the repository and run `Build-VertexX.cmd`. The script installs needed build tools through winget where available, validates the XAML structure, publishes a self-contained win-x64 binary, and compiles the dark Inno Setup installer. It saves the finished EXE to `installer-output\VertexX-Setup-0.5.0-x64.exe`.

To publish to Releases, sign in using `gh auth login`, then run `Publish-VertexX-Release.cmd`. It calls the builder and publishes the version-tagged EXE and checksum using GitHub CLI. No GitHub Actions required. A separate trusted Windows build service could run these same commands.

### Automatic updates
When enabled, Vertex X checks the official repository's latest stable GitHub Release at startup and every four hours. For a version newer than the installed program, it downloads the named setup EXE and checksum file, validates SHA-256, and stages it in local application data. The app starts the installer only after closing normally and honoring unsaved-script warnings. Installer upgrades share the same app ID and location. User scripts in Documents and settings in LocalAppData are outside the installation payload.

**Security note:** A SHA-256 checksum distributed alongside the same release detects download corruption but is not a substitute for publisher code signing. For use outside your own machines, sign installer releases and validate updates on a Windows test machine.

### Accounts and Roblox
Vertex X authenticates with Supabase using an email and password, and records a profile username. Passwords go through Supabase Auth, not into `vertexx_` database tables. No secret/service-role credentials are embedded in the desktop client. Roblox profile search uses public information only; it does not prove the user owns a Roblox account or run scripts inside Roblox.

### Development limitations
The native project and installer are source changes only until a Windows compiler and installer have successfully built them. There is no usable `.exe` attached to the repository yet. Lua execution uses an in-process interpreter; only use scripts you trust. No Roblox injection or security bypass functionality is included.

For details, see [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) and [v0.5 release notes](docs/RELEASE_NOTES_0.5.0.md).
