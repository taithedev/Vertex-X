# Roblox profiles and Windows FPS

The v0.6.1 desktop UI uses Windows Game Bar for FPS without Studio. Open Roblox, press Win + G, choose Widgets → Performance → FPS, and pin the widget. Game Bar must be installed/enabled. Follow any Windows FPS-access prompt and restart if requested. This is Windows telemetry, not a value sampled by the desktop Lua interpreter.

Profile lookup displays public headshots, bios, join dates and verified badges. It does not authenticate or verify ownership of a Roblox account. Avatar downloads accept only HTTPS Roblox CDN URLs, have a 2 MB limit and no redirects. Complete profiles cache for five minutes; incomplete optional fields retry after 30 seconds.

The editor includes static Lua/Roblox completion helpers, paired brackets, indentation and snippets. These helpers are not a semantic language server. Roblox APIs require Roblox's runtime, so Roblox-specific scripts are not executed in the desktop Lua runner.

The optional LocalScript in roblox/ is retained as source for developers who choose to install an overlay in their game. It is not required for Game Bar and has not been play-tested in Roblox.

See RELEASE_NOTES_0.6.1.md for build validation and native Windows limits.
