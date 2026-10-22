# Vertex X v0.5.1 beta

- Fixed automatic updates missing beta releases produced by the publisher.
- Selects the highest published three-part version with both an x64 installer and checksum file; ignores drafts and incomplete releases.
- Added update feed regression checks and runs them in the Windows builder.
- Setup now checks Windows 10 or newer; uninstall asks you to close the app first.
- Per-user self-contained setup includes the .NET runtime, shortcuts, and uninstaller. User scripts and settings are preserved.

The installer is unsigned. Compilation, packaging, archive checks and regression checks have been performed on Linux. Native Windows installation, launch, upgrade and uninstall still require testing. Updates require a published GitHub release containing the EXE and SHA256SUMS.txt. No GitHub Actions are used.
