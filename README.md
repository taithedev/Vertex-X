# Vertex X

A **native Windows** Lua development application, written in C# / WPF / .NET 8. No Electron.

## What it does
- Dark desktop UI, tabs, Lua editor, local library, console
- Supabase email/password login and Vertex X usernames
- Separate Zuzify project tables named \`vertexx_profiles\` and \`vertexx_preferences\`, both with row-level security
- Roblox **public profile lookup** only (not verified account connection)
- GitHub Releases based updates, with SHA-256 validation, caching and install-on-exit
- Dark, per-user Inno Setup installer with shortcuts and uninstall support

## Installer downloads (GitHub Releases, not Actions)
**Official Releases:** https://github.com/taithedev/Vertex-X/releases

Each *published* release should contain:
- \`VertexX-Setup-VERSION-x64.exe\`
- \`SHA256SUMS.txt\`

If that page has no EXE, no finished installer has been published. **GitHub Releases stores files; it does not compile the Windows application.** We do not use GitHub Actions for Vertex X.

### Build and publish an actual installer on Windows
Download the full repository ZIP, extract it, and double-click \`Build-VertexX.cmd\`. This invokes \`tools/Build-VertexX.ps1\` and installs the missing .NET 8 SDK and Inno Setup via winget where supported.

After a successful build, the native installer is at:

\`\`\`text
installer-output\VertexX-Setup-0.4.2-x64.exe
\`\`\`

The build produces an executable, not a builder ZIP. To publish the installer and checksum to **GitHub Releases**, run \`gh auth login\` once and double-click \`Publish-VertexX-Release.cmd\`. It builds again, verifies its output, and creates \`v0.4.2\` with the EXE and SHA-256 checksum file. For later releases, use:

\`\`\`powershell
.\tools\Build-VertexX.ps1 -Version 0.4.3 -Publish
\`\`\`

Each new version must increment. You need Windows to compile native WPF + Inno Setup; GitHub Releases alone does not do this.

## How updates work
1. The app checks stable GitHub Releases at startup and every four hours (enabled by default, configurable under Settings).
2. If a newer version exists, it downloads the official \`VertexX-Setup-VERSION-x64.exe\` and \`SHA256SUMS.txt\`.
3. It checks file size and SHA-256 before staging the EXE to the current user's local application data.
4. When Vertex X **exits normally**, after the unsaved-script warning if needed, the staged EXE starts in Inno Setup's silent progress mode. It uses the existing AppId, installation directory and per-user install policy. Installed files are updated; Documents scripts and local account preferences are not part of the setup payload.
5. If the update cannot be verified, it is rejected, leaving the installed version intact.

The Updates button can check manually, even when automatic checking is off. Turning automatic updates off prevents background checks; an update explicitly staged through the Updates button still installs on exit.

### Limitations and security
- **The Windows build and installer have not been executed or verified in this environment.** Validate on a Windows machine before sharing widely.
- The installer is **not code-signed**. Windows may warn about an unknown publisher; signing is recommended before widespread distribution.
- SHA-256 verifies consistency with the release's checksum, but does not replace publisher code signing.
- Lua scripts run in the app process; the restricted MoonSharp preset is not a hardened sandbox. Run only scripts you trust.
- Your email and password are handled through Supabase Auth; passwords are not written to \`vertexx_\` tables.
- There is no code injection into the Roblox client or anti-cheat bypass.

For integration setup details, see [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).
