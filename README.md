# Vertex X

Native Windows Lua workspace built with **C# and WPF**. No Electron.

## Initial features
- Dark OLED-style desktop interface
- Lua editor with open/save support
- Local Lua execution through MoonSharp's restricted module preset
- Output console and error reporting

## Build
Install the .NET 8 SDK on Windows, then run:

```powershell
dotnet restore VertexX/VertexX.csproj
dotnet run --project VertexX/VertexX.csproj
```

To publish a Windows x64 executable:

```powershell
dotnet publish VertexX/VertexX.csproj -c Release -r win-x64 --self-contained true
```

## Scope
This is a standalone Lua development environment. It does not inject into games, bypass anti-cheat, or execute code inside Roblox. Lua execution is local and should not be treated as a security boundary against untrusted code.

## Roadmap
AvalonEdit syntax highlighting, tabbed workspaces, preferences, script library, signed installer, and GitHub Releases updates.
