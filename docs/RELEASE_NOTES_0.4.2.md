# Vertex X v0.4.2

Native C# / WPF desktop release, with the same install-and-update distribution pattern used by ZuzuCord.

## Highlights
- Automatic checks for newer stable GitHub Releases at startup and every four hours
- Updates downloaded from the official repository and SHA-256 verified before being staged
- Staged installer applies after a normal, safe exit; unsaved Lua scripts still trigger the existing warning
- Auto-updates can be disabled in Settings; manual checking is still available
- Per-user Inno Setup upgrade keeps the same app ID, path and local saved data
- Downloadable standalone Windows x64 setup EXE; no GitHub Actions dependency

## Release assets
The Windows builder attaches \`VertexX-Setup-0.4.2-x64.exe\` and \`SHA256SUMS.txt\`.

## Notes
Release downloads require an installer to have been successfully compiled on Windows and published by a maintainer. This release does not provide Roblox client script execution or verified Roblox OAuth linking. Installer is currently unsigned.
