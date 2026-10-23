# Vertex X integrations

## Supabase
The native client uses the existing Zuzify project `wfqudstuncdldsvxqveu` and its active public publishable key. It embeds no secret or service-role key. App tables are `vertexx_profiles` and `vertexx_preferences`. Both have RLS enabled, and authenticated users have SELECT, INSERT, and UPDATE access only to their own rows. No database schema changes were needed for this installer update.

Supabase Auth owns password hashing. Signup takes a profile username, email, and password. Confirmation-required responses and immediate sessions are handled separately. Profile upserts accept empty success responses, and a failed profile operation clears the partial local session. Access tokens are held only in memory. Preferences currently save locally; the database preferences table is reserved for future cloud synchronization.

## Installer and release publishing
The default installer is now NSIS (`installer/VertexX.nsi`). The older Inno Setup script is retained as a historical alternative and is not used by the builder. The .NET runtime is included in the installation folder. React assets are bundled locally; Microsoft WebView2 renders them. Setup installs the official Evergreen WebView2 bootstrapper if the runtime is missing, requiring internet for that prerequisite. The generated uninstall manifest lists only files from the built payload, preserving unrelated user files.

`Build-VertexX.cmd` builds the React UI and native host, runs account/update/Lua runtime/profile regression checks, packages setup, and writes SHA256SUMS.txt. `Publish-VertexX-Release.cmd` requires a committed Git checkout and authenticated GitHub CLI, uploads a draft beta containing both assets, then publishes it. No GitHub Actions are used.

## Updates
The client checks complete published GitHub Releases, including beta prereleases. It verifies the expected installer filename, release download origin, maximum download size, and SHA-256 hash. Updates install on normal exit using NSIS `/S /UPDATEPID=<pid>`. Setup waits up to 30 seconds for that process. Drafts and releases without the installer/checksum pair are skipped. Checksums detect corruption; these builds are unsigned.

## Roblox
The FPS page uses Windows Game Bar and its Performance widget without Studio. Fixed native commands open only `ms-gamebar:` and `ms-settings:gaming-gamebar`; renderer input cannot supply shell commands. Actual Game Bar activation and permissions require Windows testing.

Public profile lookup uses Roblox's public API. It does not verify account ownership. Verified linking requires a separately configured Roblox OAuth application. Vertex X never asks for a Roblox password and does not inject scripts into Roblox.

## Verification boundary
The application and installer are built and inspected in a Linux environment. Account HTTP response handling has regression coverage, and the live Supabase Auth endpoint and database permissions were checked. Windows UI execution, live user signup with email confirmation, and a complete native Windows upgrade cycle remain unverified. Browser contract checks use a controlled host and do not replace native Windows verification.
