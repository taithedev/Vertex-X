# Unreleased Roblox tools and editor update

## User-visible changes

- A real client FPS/frame-time overlay, exported as an editable Studio LocalScript starter. Installation instructions target StarterPlayer/StarterPlayerScripts and Studio Play.
- An FPS button and F8 shortcut, touch support, respawn persistence and cleanup when the overlay is replaced or destroyed.
- Public Roblox headshots, bios, join dates and the actual Roblox verified badge, with a bounded native image loader and safe fallback states.
- Five-minute caching for complete public profiles; pending/failed optional fields retry after 30 seconds.
- Tab/Enter completion acceptance, Ctrl+Space suggestions, four-space indentation, paired brackets/quotes and snippets with Tab stops. Suggestions are static Lua/Roblox helpers, not full semantic Visual Studio IntelliSense.
- Roblox starter scripts redirect to Studio instructions when Run is clicked, instead of producing desktop Lua errors.

## Validation status

The coding execution environment was unavailable for this update. No new EXE was built. Compilation, dependency installation, browser checks, the new mocked profile checks, and live Studio testing are pending. Existing v0.6.0 results must not be treated as results for these changes.

The dependency manifest/lockfile includes the official `@codemirror/autocomplete` 6.20.1 package and existing compatible transitive packages. Run `npm ci`, `npm run build`, and `npm run test:ui` in frontend, plus all native check projects before building an installer. The Windows builder now includes the profile checks.

## Manual Studio checks

1. Paste the starter into a LocalScript in StarterPlayerScripts.
2. Use Play and confirm FPS/frame-time update without output errors.
3. Respawn the character and verify one overlay remains.
4. Toggle using F8 and the on-screen button; check a mobile device emulator.
5. Replace/remove the overlay while playing and confirm old connections are cleaned up.
6. Publish to a test experience you own and verify each player's counter measures their own rendering.

Public profile lookup does not authenticate or verify ownership of a Roblox account. No Roblox passwords, cookies, injection, or executable downloads are used.
