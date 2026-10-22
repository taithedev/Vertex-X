# Vertex X v0.5.0 beta

Native Windows x64 Lua workspace with a self-contained NSIS installer.

- Per-user setup, Start menu and desktop shortcuts, and an uninstaller that preserves user scripts and settings.
- Automatic stable-release downloads with SHA-256 checks; installation waits for the exiting application process.
- Fixed empty Supabase profile responses being reported as account errors.
- Fixed confirmation-required signup response handling and partial sessions after profile failures.
- Added regression checks for signup, login, empty success responses, and profile conflicts.
- Existing workspace includes tabs, Lua execution, Find & Replace, file search, Save As, snippets, settings, accounts, and public Roblox profile lookup.
- Reproducible build and draft-first release publishing scripts; no GitHub Actions.

This is an unsigned beta. Application compilation, installer packaging, and account regression checks do not replace native Windows install, launch, update, and uninstall testing. Those native Windows checks remain pending. Accounts use email/password with a profile username; Roblox ownership linking and cloud preferences are not implemented. Run Lua only from trusted sources.
