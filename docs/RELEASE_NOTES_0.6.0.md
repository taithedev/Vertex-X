# Vertex X v0.6.0 beta — React workspace

- New dark React interface hosted locally inside the native WPF application through Microsoft WebView2.
- Lua syntax highlighting, line numbers, folding, bracket matching, undo/redo, find/replace, and tabbed editing via CodeMirror.
- Run and Stop controls with cooperative cancellation, a five-second execution deadline and capped console output.
- Recoverable workspace tabs in the app's local WebView2 profile, plus save/discard/cancel prompts before closing edited tabs or exiting.
- Native open/save dialogs and a searchable scripts library; starter snippets and Ctrl+K command search.
- Preferences for font size, word wrap, violet/mint/ice accents, and automatic updates.
- React account forms connect to the existing Supabase service; sessions remain memory-only. Public Roblox profile lookup remains available.
- Clear update status and verified release staging with install-on-exit. Setup includes the WebView2 bootstrapper for machines missing the runtime; internet is required for that prerequisite.

## Validation and limits

React type checking/build, native Windows cross-compilation, runtime/auth/update checks and installer payload verification are required for this build. Browser UI checks exercise the native bridge using a controlled test host, not Windows WebView2. Native Windows installation, WebView2 initialization, native dialogs, real account login and full installer upgrade/uninstall remain to be tested on Windows. The setup is unsigned.

Lua execution is local and intended for trusted scripts. The runtime limit protects responsiveness for ordinary Lua loops but is not process or memory isolation. Roblox client injection/execution and verified ownership linking are not included. Accounts use email/password with a profile username; cloud script syncing is not implemented.

Auto-update delivery requires a published GitHub release containing `VertexX-Setup-0.6.0-x64.exe` and `SHA256SUMS.txt`. Publishing source files alone does not publish release assets.
