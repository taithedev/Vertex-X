# Vertex X

**Vertex X** is a native C# WPF application for editing and locally running Lua scripts. This is a standalone development environment — no Electron or WebView.

## Features (0.2 beta)
- Custom OLED-style dark interface, explorer pane, draggable/resizable native Windows window
- Multiple editor tabs, unsaved-change markers, close tab shortcut
- Open and save Lua scripts, local Scripts library in Documents/Vertex X/Scripts
- Local MoonSharp Lua runtime with console output and error messages
- Preferences window with adjustable font size and word wrapping
- Keyboard shortcuts: Ctrl+N new, Ctrl+O open, Ctrl+S save, Ctrl+W close tab, F5 run
- GitHub Actions Windows build and self-contained Windows x64 publish artifact

## Run from source
Install the .NET 8 SDK (Windows):

```powershell
dotnet restore VertexX/VertexX.csproj
dotnet run --project VertexX/VertexX.csproj
```

## Get executable
Open GitHub Actions → latest successful **Windows build** → download the `VertexX-Windows-x64` artifact. Extract the ZIP and run `VertexX.exe`. Build artifacts are not signed installers; Windows SmartScreen may display a warning for unsigned programs.

## Technical notes
- C# / WPF / .NET 8 / MoonSharp Lua, native Windows-only.
- This release uses a built-in TextBox editor; syntax highlighting and completion are **not implemented yet**.
- The local Lua engine is not a hardened process sandbox. Only run scripts you trust. A future version can isolate execution in a separate process.
- Vertex X does **not** inject into Roblox or bypass anti-cheat protections.
- No cloud accounts, auto-updater, or signed MSI are included yet.

## Upcoming
Syntax highlighting via AvalonEdit, command palette, improved script browser, unit tests, isolated runner, optional GitHub Releases updater, MSI packaging.
