; Vertex X native Windows installer, built with Inno Setup 6
#define MyAppName "Vertex X"
#define MyAppVersion "0.3.0"
#define MyAppPublisher "Vertex X"
#define MyAppExeName "VertexX.exe"

[Setup]
AppId={{8C0A95E1-253D-4C5C-A756-5D6AD1220E6E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\Vertex X
DefaultGroupName=Vertex X
OutputDir=..\installer-output
OutputBaseFilename=VertexX-Setup-{#MyAppVersion}-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
WizardSizePercent=110
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayName=Vertex X
DisableProgramGroupPage=yes
SetupLogging=yes
CloseApplications=yes
RestartApplications=no
; Builds without elevation and installs only for the current Windows user.
; Files are provided by a self-contained dotnet publish, so no .NET runtime installation is required.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\publish\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Vertex X"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\Vertex X"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional options:"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Vertex X"; Flags: nowait postinstall skipifsilent

[Code]
var
  BrandingLabel: TNewStaticText;
  SubBrandLabel: TNewStaticText;

procedure InitializeWizard;
begin
  WizardForm.Color := $00131316;
  WizardForm.InnerPage.Color := $00131316;
  WizardForm.OuterNotebook.Color := $00131316;
  WizardForm.InnerNotebook.Color := $00131316;

  WizardForm.PageNameLabel.Font.Color := clWhite;
  WizardForm.PageNameLabel.Font.Size := 13;
  WizardForm.PageNameLabel.Font.Style := [fsBold];
  WizardForm.PageDescriptionLabel.Font.Color := $00B6B6C0;

  WizardForm.WelcomeLabel1.Font.Color := clWhite;
  WizardForm.WelcomeLabel1.Font.Size := 19;
  WizardForm.WelcomeLabel2.Font.Color := $00C9C9D2;
  WizardForm.FinishedHeadingLabel.Font.Color := clWhite;
  WizardForm.FinishedLabel.Font.Color := $00C9C9D2;

  WizardForm.NextButton.Caption := 'Continue  >';
  WizardForm.CancelButton.Caption := 'Cancel';

  BrandingLabel := TNewStaticText.Create(WizardForm);
  BrandingLabel.Parent := WizardForm;
  BrandingLabel.Left := ScaleX(22);
  BrandingLabel.Top := ScaleY(12);
  BrandingLabel.Font.Name := 'Segoe UI';
  BrandingLabel.Font.Size := 13;
  BrandingLabel.Font.Style := [fsBold];
  BrandingLabel.Font.Color := clWhite;
  BrandingLabel.Caption := 'VERTEX X';

  SubBrandLabel := TNewStaticText.Create(WizardForm);
  SubBrandLabel.Parent := WizardForm;
  SubBrandLabel.Left := ScaleX(23);
  SubBrandLabel.Top := ScaleY(36);
  SubBrandLabel.Font.Name := 'Segoe UI';
  SubBrandLabel.Font.Size := 8;
  SubBrandLabel.Font.Color := $009A9AA5;
  SubBrandLabel.Caption := 'NATIVE WINDOWS SETUP';
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  BrandingLabel.Visible := (CurPageID <> wpWelcome) and (CurPageID <> wpFinished);
  SubBrandLabel.Visible := BrandingLabel.Visible;
end;
