# Vertex X 0.4 — Accounts, Releases, Roblox

## Supabase connection
Existing Zuzify project: `wfqudstuncdldsvxqveu`. The desktop client embeds **only the public publishable key**. All Vertex X tables start with `vertexx_`:
- `public.vertexx_profiles`: user ID, unique username, optional display name, Roblox fields reserved for future verified OAuth linking.
- `public.vertexx_preferences`: one row per user.

Both tables have RLS enabled. Auth uses Supabase's managed `auth.users` service (managed system name, not a newly created Vertex X table), which handles password hashing. Database schema changes are maintained in the project's Supabase migration history.

## Creating an account
Click Account, provide a username (3-20 letters/digits/underscores), a real email address and password (8+ characters). Email is required to log in and recover access; **username-only authentication is not implemented yet**. If email confirmation is enabled, verify the link first and then sign in. Passwords and tokens are never saved in local settings; the access token is held in memory only during the app session. Sign out from the Account button.

The username is stored as account metadata until the profile is created after confirmed sign-in. A database unique constraint prevents duplicate profile usernames.

## Updates and installer
GitHub Actions is **not used**. On a Windows PC, extract the repository ZIP and double-click Build-VertexX.cmd. It builds a self-contained C# WPF app and a native Inno Setup installer (0.4.1) with the dark Vertex X interface, shortcuts, and uninstall entry. The installer uses the same AppId for future upgrades.

The resulting files are in installer-output/:
- VertexX-Setup-0.4.1-x64.exe
- SHA256SUMS.txt

Once the installer has been built, sign in with GitHub CLI (gh auth login) and double-click Publish-VertexX-Release.cmd to publish it directly to the official GitHub Releases page. Creating a Release is an explicit action under the repository maintainer's account. Releases distribute built executables but do not compile source code themselves.

On launch, Vertex X checks the latest stable GitHub Release. If newer, it offers to download the installer and checksum, verifies SHA256 and asks again before opening setup. This is consent-based updating, not a silent update service. The setup executable is unsigned, so Windows SmartScreen may display an unknown-publisher warning.

## Roblox
Roblox panel looks up **public profiles** using the public Roblox Users API. It does not verify ownership or associate profiles with authenticated Vertex X accounts. True account connection requires a Roblox OAuth application with PKCE, explicit user consent, a redirect URL and validation of the signed-in user ID. No Roblox passwords should be entered into Vertex X, and there is no script injection or anti-cheat bypass.

## Build prerequisites
Windows x64, .NET 8 SDK, Inno Setup 6.7+, and optional GitHub CLI for publishing. See the README and Build-VertexX.cmd.

## Current limitations
Previous Windows CI logs showed C# compiled but the old Inno script failed on an unsupported color property. That property has been removed, but the repaired installer and updater have not yet been compiled or tested end-to-end on Windows. Local script execution is not a hardened sandbox; do not run untrusted Lua scripts.
