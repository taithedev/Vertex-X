# Vertex X v0.8.0 beta — Accounts, community and crystals

## Changes
- Refreshable memory-only account sessions, remote sign-out attempt and password changes.
- Shared public/private Lua script uploads, source inspection in the editor, author avatars and verified badges.
- In-app profiles, compressed custom avatars, bios and a cloud wallet.
- Owner verification, crystal grants, upload limits and public-script moderation. Owner roles cannot be self-assigned.
- Server-owned wallets: 100 starter crystals, 20 UTC daily crystals, one crystal per successful run, free owner runs, idempotent settlement and no deductions for failure/cancellation/expiry.
- Supabase Realtime subscriptions with reconnect, heartbeat, token refresh, live status and periodic refresh.
- Cloud account preferences: live updates, cost confirmation, compact library, avatar choice and upload visibility.
- Roblox account proof using a temporary profile-bio code. Linked avatars render as embedded data inside the app. This is not Roblox OAuth; it requires changing the Roblox bio once. The app never asks for Roblox credentials.
- Startup and configurable 15-minute/hourly/four-hour checks for complete releases from taithedev/Vertex-X. Verified downloads install on exit after save prompts.

## Deployment and validation

The production account API, row-level policies, server-owned wallets and Realtime publications are deployed. Execution is enabled after testing against both staging and production. The owner account is verified; its wallet remains at 100 crystals.

Passed: TypeScript/Vite build; Windows x64 cross-build; native account, update, Lua, Roblox profile and library checks; controlled-host browser editor/community flows with no renderer errors; adversarial cloud Lua tests; real authenticated HTTP checks for account bootstrap, upload ownership, private access, owner authorization, verification/grants/moderation, settings, daily claims, cancellation, failed-run refunds and successful-run idempotency; actual Realtime wallet notification. Disposable accounts were removed and validation endpoints retired.

The runner supports protected calls while propagating execution limits through them. It omits coroutine, OS, IO, package, debug and interop libraries. Source is limited to 100 KB, execution to 300,000 instructions or 750 ms, individual strings to 256 KiB and console output to 100,000 characters. Hosting limits are the final resource boundary; this is not process isolation per script.

## Beta limitations

The installer is unsigned. Native Windows installation, WebView2 startup, shortcuts, update installation and uninstall require a Windows smoke test before stable promotion. Browser checks use a controlled native bridge. Successful Roblox ownership linking requires a real bio edit and was not completed in this test; unproven links were rejected. This app does not inject into Roblox. The FPS helper opens Windows Game Bar.

Auto-update requires both VertexX-Setup-0.8.0-x64.exe and SHA256SUMS.txt on a published release in taithedev/Vertex-X. Downloads are hash-checked and install on exit after save prompts. Source commits alone do not publish a binary update.
