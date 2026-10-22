; Vertex X v0.5.0 - Native Windows setup (Inno Setup 6.6+)
; Compile with tools/Build-VertexX.ps1. No GitHub Actions required.
#define MyAppName "Vertex X"
#ifndef MyAppVersion
  #define MyAppVersion "0.5.0"
#endif
#define MyAppPublisher "Vertex X"
#define MyAppExeName "VertexX.exe"

[Setup]
AppId={{8C0A95E1-253D-4C5C-A756-5D6AD1220E6E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName=Vertex X {#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Vertex X
DefaultGroupName=Vertex X
OutputDir=..\installer-output
OutputBaseFilename=VertexX-Setup-{#MyAppVersion}-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern dark
WizardSizePercent=110
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
DisableDirPage=no
UninstallDisplayName=Vertex X
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
Uninstallable=yes
UsePreviousAppDir=yes
; An update uses the same AppId so Inno Setup upgrades the previous install.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Icons]
Name: "{autoprograms}\Vertex X"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\Vertex X"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Vertex X"; Flags: nowait postinstall skipifsilent
