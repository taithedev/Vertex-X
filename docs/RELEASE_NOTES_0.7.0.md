# Vertex X v0.7.0 beta — Theme studio and workspace update

## Appearance
Eight surface themes: Graphite, OLED, Midnight, Ocean, Forest, Rose, Lavender and Amber. Eight accents, live appearance preview, save/revert and reset. Five animated backgrounds: aurora, particles, grid, stars and waves. Optional pointer glow, trails and click ripples. Intensity and motion controls; reduced-motion support, hidden-window pause, bounded particles and capped canvas resolution.

## Execution and editor
Local Lua output streams to the console while a script runs. Ctrl+Enter runs selected code; Shift+F5 stops. Errors include interpreter source locations. Execution remains capped at five seconds and 100 KB console output. This is an in-process desktop Lua runtime, not Roblox execution or memory isolation.

Ctrl+Tab and Ctrl+Shift+Tab switch documents. Editor focus/layout recover on tab activation, untitled tabs have distinct names, and reopening a library script keeps unsaved edits. Completion, Tab/Shift+Tab indentation, snippet fields, bracket pairing and Enter indentation remain supported.

## Library and shortcuts
Search and sort saved scripts alongside six local Lua starters. Save current script creates a named library copy. Duplicate names, Windows reserved filenames, unsafe paths and files over 1 MB are rejected; existing scripts are preserved. Import/open, folder access and refresh are available.

Setup creates Desktop and Start menu shortcuts. A Preferences action recreates the Desktop shortcut.

## Validation and limits
npm dependency installation and TypeScript/Vite build, native win-x64 cross-build, runtime/auth/update/profile/library checks, controlled-host Chromium UI checks and exact installer payload extraction comparison are performed for this build. UI coverage includes all themes/backgrounds, reduced motion, pointer controls, saved appearance, library save/collision/search, dirty-tab preservation, tab cycling, selection execution, streamed output and existing save/recovery/exit flows.

Actual Windows install/launch, WScript shortcut creation, native dialogs, real account login, Game Bar and complete update/uninstall still need Windows verification. The installer is unsigned. Browser tests use a controlled bridge and do not execute Windows WebView2.

Auto-delivery requires a published GitHub release with VertexX-Setup-0.7.0-x64.exe and SHA256SUMS.txt. Installed clients stage verified complete releases for normal application exit; an old setup download does not change itself.
