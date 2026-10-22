# Vertex X

**Vertex X** is a native C# / WPF / .NET 8 desktop application for editing and locally running trusted Lua scripts. No Electron and no browser shell.

## Version
Current source: **0.5.0 beta**. A Windows x64 installer can be compiled with NSIS. Native Windows installation and application smoke testing are still required before a stable release.

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

## Installer and GitHub Releases

Build the Windows installer with `Build-VertexX.cmd`; publish a beta with `Publish-VertexX-Release.cmd` after signing into GitHub CLI. No GitHub Actions are used. Build prerequisites are .NET 8 SDK and NSIS; the Windows builder can install missing tools through winget.

Output: `installer-output/VertexX-Setup-0.5.0-x64.exe` and `SHA256SUMS.txt`.

Setup installs the self-contained application and .NET runtime into the current user's LocalAppData, creates Start menu and desktop shortcuts, and registers an uninstaller. No separate .NET installation or administrator permission is needed. Uninstall removes the installed payload while preserving scripts in Documents and preferences in LocalAppData. Close Vertex X before running setup or uninstall.

Releases: https://github.com/taithedev/Vertex-X/releases

### Automatic updates
When enabled, Vertex X checks the official repository's latest **stable** release at startup and every four hours. It verifies the downloaded setup against `SHA256SUMS.txt`, then starts setup on normal exit after unsaved-script warnings. The installer waits for the exiting process before replacing files. NSIS releases use `/S /UPDATEPID=<process id>` for updates. Beta prereleases are available for manual installation and are deliberately excluded from stable update checks.

The publisher first uploads a draft with both assets and only publishes after the uploads succeed. It tags the exact committed source used for the build and refuses tracked source changes.

### Validation
Run `dotnet run --project tests/VertexX.AuthChecks` to exercise confirmation-required signup, immediate signup, empty profile responses, profile-conflict rollback, and rejected login. The native application can be cross-compiled on Linux using `-p:EnableWindowsTargeting=true -p:PublishSingleFile=false`; NSIS can package the resulting self-contained folder directly. `installer/VertexX-uninstall.nsh` is generated from the exact payload by the builder.

The setup is unsigned. Native Windows install, launch, update, and uninstall testing remains necessary before calling this a stable release.

### Accounts and Roblox
Vertex X authenticates with Supabase using an email and password, and records a profile username. Passwords go through Supabase Auth, not into `vertexx_` database tables. No secret/service-role credentials are embedded in the desktop client. Roblox profile search uses public information only; it does not prove the user owns a Roblox account or run scripts inside Roblox.

### Development limitations
Roblox integration provides public profile lookup, not verified ownership linking or execution inside Roblox. Accounts currently use email and password with a profile username. Lua uses an in-process interpreter: run only trusted scripts. A compiled installer and passing account regression checks do not establish that every UI feature or automatic upgrade has passed native Windows testing.

See [integration details](docs/INTEGRATIONS.md) and [release notes](docs/RELEASE_NOTES_0.5.0.md).
