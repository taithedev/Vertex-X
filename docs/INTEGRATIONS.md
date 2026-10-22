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
When Vertex X starts, it checks the public GitHub Releases API once for a newer stable release. It also has a manual Updates button. If a newer version exists, it asks permission before opening the official GitHub installer download URL. It never silently executes downloaded programs. GitHub-hosted setup downloads may require Windows SmartScreen confirmation because the installer is unsigned.

`.github/workflows/windows.yml` compiles the native Windows build on every push and pull request and creates download artifacts. Pushing a semver tag, e.g. `v0.4.0`, triggers the same build and then publishes the installer, SHA256 checksum, and automatically generated release notes in GitHub Releases. Version tags must be created by a maintainer after the build is verified.

There is no signed installer available until GitHub Actions builds successfully. A portable and setup ZIP should be accessible on the Actions page for successful runs.

## Roblox
Roblox panel looks up **public profiles** using the public Roblox Users API. It does not verify ownership or associate profiles with authenticated Vertex X accounts. True account connection requires a Roblox OAuth application with PKCE, explicit user consent, a redirect URL and validation of the signed-in user ID. No Roblox passwords should be entered into Vertex X, and there is no script injection or anti-cheat bypass.

## Build prerequisites
Windows x64, .NET 8 SDK, Inno Setup 6.6+. See the README and Windows Actions workflow.

## Current limitations
Windows build has not been compiled locally in this workspace. No successful GitHub Actions job, installer execution, account signup or Roblox API request has been independently verified yet. Local script execution is not a hardened sandbox; do not run untrusted Lua scripts.
