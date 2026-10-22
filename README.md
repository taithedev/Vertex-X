# Vertex X

Native Windows Lua workspace in **C#, .NET 8, and WPF**. No Electron, web shell, or browser.

## Features
- Dark gray and OLED-black interface inspired by compact script editor designs
- Multi-tab Lua editor with local file opening and saving
- Script library in `Documents/Vertex X/Scripts`
- Local Lua execution through MoonSharp (trusted scripts only), output console, errors
- Preferences for editor font size and word wrapping
- Ctrl+N new, Ctrl+O open, Ctrl+S save, Ctrl+W close, F5 run

## Windows installer
The installer is defined by `installer/VertexX.iss` and uses **Inno Setup 6.6+** with its built-in dark wizard mode, branded Vertex X wizard labels, per-user install path, Start menu entry, optional desktop shortcut, and standard uninstall entry.

The GitHub Actions workflow `.github/workflows/windows.yml` builds both:
- `VertexX-Windows-x64`: uninstalled/portable self-contained publish output
- `VertexX-Setup-Windows-x64`: Inno Setup wizard `VertexX-Setup-0.3.0-x64.exe`

To download, open **Actions** in this repository, select a successful **Windows build and installer** run, and download the appropriate artifact ZIP. Extract the ZIP before running the installer. GitHub Actions does not publish a permanent Release automatically.

## Build locally
Install the .NET 8 SDK on Windows and Inno Setup 6.6 or newer.

```powershell
dotnet restore VertexX/VertexX.csproj
dotnet build VertexX/VertexX.csproj -c Release
dotnet publish VertexX/VertexX.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -o publish
& "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe" installer\VertexX.iss
```

The generated setup EXE will be in `installer-output/`.

## Important
- The GitHub workflow and installer must complete a successful Windows Actions run before the setup can be considered tested.
- Setup is **not code-signed**, so Windows may warn when executing it.
- The installer installs locally per Windows user and **does not silently enable administrative privileges**.
- Lua execution uses an in-process interpreter, not a hardened security sandbox; do not run untrusted scripts.
- Vertex X does not inject into Roblox, bypass anti-cheat or execute scripts inside other applications.
- Script syntax highlighting, autocomplete, auto-update, and a standalone custom installer engine are not implemented yet.
