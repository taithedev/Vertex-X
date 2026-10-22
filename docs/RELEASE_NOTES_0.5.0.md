# Vertex X v0.5.0 — Workspace and Installer Improvements

This update is source-ready for a Windows installer release. The release can be published once a Windows build successfully compiles and its installer is tested.

## Features
- Native Find & Replace window with case matching, next match, Replace and Replace All.
- Search field in the local Lua script library to filter by file name.
- Open scripts folder directly in Windows Explorer.
- Save As action and Ctrl+Shift+S shortcut.
- Reusable Lua snippet menu with functions, loops, tables, conditions and printing examples.
- UI version updated to beta 0.5.
- Pre-build well-formed XAML validation in the installer builder.

## Installer and updates
- Inno Setup dark wizard; per-user install, optional desktop shortcut, Start menu item and uninstall.
- No GitHub Actions; maintainers build with `Build-VertexX.cmd` or publish with `Publish-VertexX-Release.cmd`.
- App checks stable GitHub Releases and can stage an installer with a matching SHA-256 checksum for install on normal exit.
- Version synchronized to 0.5.0 in the native project, installer and publication scripts.

## Known limitations
- No GitHub Release has been created by this source commit; the Windows EXE is not included.
- Code has not been compiled or run on a Windows machine in this environment. Treat features as implemented but not build-verified.
- Installer remains unsigned; signing is recommended before broad distribution.
- Roblox integration is limited to public profile lookup, not verified account linking.
- Lua code runs in-process; run scripts only from trusted sources.
