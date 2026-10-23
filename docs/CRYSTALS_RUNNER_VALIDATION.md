# Crystal execution validation — v0.8.0 beta

Execution is enabled after staging and production HTTP integration checks.

Passed: ordinary output/returns and protected calls; syntax/runtime failures; loops and nested protected-call quota escapes; malicious error handlers and tostring; string growth, repetition and format guards; bytecode rejection; restricted globals and output truncation. Tests run in separate capped Node processes: `npm ci --prefix supabase/tests/runner` then `npm test --prefix supabase/tests/runner` (Node 24+).

Production checks passed for one successful-run charge, retry idempotency, failed/quota/cancelled runs without charges, daily limits, owner-free runs, verification/grants/moderation, user/private-script isolation and denied direct REST/RPC wallet or role modifications. An authenticated Realtime subscriber received a wallet change after its database subscription was confirmed. Temporary accounts were removed and test endpoints retired.

TypeScript, C# cross-build, native regression suites and controlled-host browser community/editor checks passed. The owner wallet remains 100. Native Windows install/upgrade/uninstall and successful real Roblox bio verification remain manual beta checks. Platform hard termination is not simulated by the Lua regression suite; unfinished runs expire without settlement charges. This interpreter is not a per-script process isolation boundary.
