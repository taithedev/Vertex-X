# Vertex X v0.6.1 beta

- Public Roblox avatars, bios, join dates and verified badges, with image validation, caching and fallback messages.
- Ctrl+Space suggestions, Tab/Enter completion, four-space indentation, paired brackets and snippet Tab stops.
- Windows Game Bar FPS guide and fixed Game Bar/settings shortcuts. No Studio is needed for the Windows overlay; the overlay requires installed/enabled Game Bar and may require Windows FPS permission and a restart.
- Roblox-runtime scripts are kept out of the desktop Lua runner with an explanatory message.
- Keeps the React workspace, local file operations, recoverable tabs, account forms and verified install-on-exit updates.

## Validation

Dependency installation, React type checking/build, native Windows cross-compilation, account/update/Lua/profile checks, browser bridge checks and exact installer payload comparison are run for this build. Browser checks use a controlled native bridge; Windows launch, actual Game Bar launch/FPS permission, installation, native dialogs, real account login and upgrade/uninstall remain unverified on Windows. Setup is unsigned.

## Automatic delivery

Publish a GitHub release containing `VertexX-Setup-0.6.1-x64.exe` and `SHA256SUMS.txt`. Source changes alone do not deliver updates. Installed clients with automatic updates enabled check complete published releases and stage the verified installer for application exit. The older downloaded setup file itself does not refresh.
