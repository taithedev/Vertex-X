# Required before enabling crystal execution

The cloud runner is disabled. This prevents an untested execution path from charging users.

Run tests in a functioning environment before changing executionEnabled:
- TypeScript/Vite build and native C# build; update the browser bridge tests for signed-in cloud execution.
- Sign in as owner and two ordinary test users. Verify no cross-user wallet, private-script, run-history or profile mutation access.
- Attempt direct REST/RPC balance changes, self-verification, self-owner assignment and forged success settlements; all must fail.
- Execute a valid script: exactly one crystal debit. Repeat with the same request ID/source: no extra debit. Mismatched-source replay must fail.
- Syntax errors, runtime errors, time/instruction limits, resource termination, explicit cancellation and pending expiry: zero debits.
- Concurrent runs and completion/cancellation races: one authoritative terminal state and no negative wallet.
- Test nested loops, string/table allocation, recursive calls, malicious bytecode and Lua protected-call attempts. The candidate runner removes protected-call/coroutine, OS, IO, package, debug and interop facilities; evaluate compatibility before release. Do not describe it as process/memory isolation.
- Lost HTTP response: use stored run history/request ID to recover the authoritative outcome, and never label an unknown outcome as a confirmed failure.
- Daily claims once per UTC day; grants only by owner; initial balance issued once.
- Avatar validation, expired/incorrect Roblox proof, duplicate Roblox linking and unlink.
- Two clients: script upload/removal/moderation, profile changes, verification and balances update via Realtime. Test disconnects, token rotation, reduced motion and account switches.
- Native Windows install, shortcut creation, authenticated avatar UI, save prompts, release checksum staging and upgrade/uninstall.

Publish VertexX-Setup-0.8.0-x64.exe and SHA256SUMS.txt to a GitHub Release only after the new binary passes validation. Main's existing v0.7.0 EXE remains the last built release.
