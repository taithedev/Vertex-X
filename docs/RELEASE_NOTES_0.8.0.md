# Vertex X v0.8.0 preview — Accounts, community and crystals

This is an unbuilt integration preview. v0.7.0 is still the last installer produced.

## Implemented source
- Refreshable memory-only account sessions, remote sign-out attempt and password changes.
- Shared public/private Lua script uploads, source inspection in the editor, author avatars and verified badges.
- In-app profiles, compressed custom avatars, bios and a cloud wallet.
- Owner verification, crystal grants, upload limits and public-script moderation. Owner roles cannot be self-assigned.
- Server-owned wallets: 100 starter crystals, 20 UTC daily crystals, one crystal per successful run, free owner runs, idempotent settlement and no deductions for failure/cancellation/expiry.
- Supabase Realtime subscriptions with reconnect, heartbeat, token refresh, live status and periodic refresh.
- Cloud account preferences: live updates, cost confirmation, compact library, avatar choice and upload visibility.
- Roblox account proof using a temporary profile-bio code. Linked avatars render as embedded data inside the app. This is not Roblox OAuth; it requires changing the Roblox bio once. The app never asks for Roblox credentials.
- Startup and configurable 15-minute/hourly/four-hour checks for complete releases from taithedev/Vertex-X. Verified downloads install on exit after save prompts.

## Deployed backend
The new vertexx_ tables, policies, ledger RPCs and vertexx-api Edge Function are deployed. The authenticated GitHub account was matched by email to a confirmed Supabase account and assigned the owner role. Other app tables were not changed.

Database checks passed for success charging, retry idempotency, free failure/cancellation, daily-claim limits and restricted wallet/role/function privileges. All mutation checks were rolled back; the owner wallet remains at 100 crystals. The Edge deployment service accepted the function bundle.

## Release blockers
The execution environment was unavailable: no TypeScript build, C# compilation, browser integration test, HTTP-auth integration test or Windows EXE was produced for this preview. The server Lua runner is deliberately disabled (executionEnabled=false). It must pass adversarial instruction/time/memory, serialization, compatibility, cancellation and end-to-end charge tests before activation. The candidate runner omits protected-call/coroutine and OS/IO libraries, and is not compatible with every desktop Lua script. Do not remove the gate without validating those limits and compatibility. No crystals are deducted while this gate is off.

The Realtime client and Roblox bio-proof flow need end-to-end testing. A signed-in identity is required for all account mutations. GET health exposes only version/gate metadata; POST validates the bearer with Supabase Auth on every request.

Source changes alone do not deliver updates. Publish the validated VertexX-Setup-0.8.0-x64.exe and SHA256SUMS.txt as a GitHub Release after the new installer is built and tested.

Security review: the new tables have RLS and explicit grants. Challenge rows are service-only by design; the advisor's no-policy INFO for vertexx_roblox_challenges describes intentional default denial. Existing unrelated project advisories were left untouched. The account API itself validates bearer tokens; gateway verify_jwt is disabled to support this explicit validation path.
