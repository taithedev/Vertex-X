Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
!ifndef MyAppVersion
!define MyAppVersion "0.6.0"
!endif
!ifndef PayloadDir
!define PayloadDir "..\publish"
!endif
Name "Vertex X ${MyAppVersion}"
OutFile "..\installer-output\VertexX-Setup-${MyAppVersion}-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\Vertex X"
InstallDirRegKey HKCU "Software\VertexX" "InstallDir"
RequestExecutionLevel user
ManifestDPIAware true
SetCompressor zlib
BrandingText "Vertex X"
VIProductVersion "${MyAppVersion}.0"
VIAddVersionKey "ProductName" "Vertex X"
VIAddVersionKey "FileDescription" "Vertex X Windows installer"
VIAddVersionKey "FileVersion" "${MyAppVersion}"
VIAddVersionKey "LegalCopyright" "Vertex X"
!define MUI_WELCOMEPAGE_TEXT "Setup installs Vertex X with the .NET runtime. If Microsoft WebView2 is missing, setup installs it from Microsoft; this step requires an internet connection. Your scripts and settings are preserved during upgrades.$\r$\n$\r$\nClick Next to continue."
!define MUI_ABORTWARNING
!define MUI_BGCOLOR "101014"
!define MUI_TEXTCOLOR "EEEEF2"
!define MUI_INSTFILESPAGE_COLORS "EEEEF2 101014"
!define MUI_FINISHPAGE_RUN "$INSTDIR\VertexX.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch Vertex X"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Vertex X requires 64-bit Windows 10 or newer."
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "Vertex X requires Windows 10 or newer."
    Abort
  ${EndIf}
  SetRegView 64
  SetShellVarContext current
  ReadRegStr $0 HKCU "Software\VertexX" "InstallDir"
  ${If} $0 != ""
    StrCpy $INSTDIR $0
  ${EndIf}
  ; Updates wait for the exact exiting process before replacing files.
  ${GetParameters} $0
  ClearErrors
  ${GetOptions} $0 "/UPDATEPID=" $1
  ${IfNot} ${Errors}
    System::Call 'kernel32::OpenProcess(i 0x100000, i 0, i r1) p.r2'
    ${If} $2 != 0
      System::Call 'kernel32::WaitForSingleObject(p r2, i 30000) i.r3'
      System::Call 'kernel32::CloseHandle(p r2)'
      ${If} $3 != 0
        MessageBox MB_ICONSTOP "Vertex X has not exited. Close it and run setup again."
        Abort
      ${EndIf}
    ${EndIf}
  ${EndIf}
FunctionEnd

Function CheckApplicationClosed
  IfFileExists "$INSTDIR\VertexX.exe" 0 finished
  retry:
  System::Call 'kernel32::CreateFileW(w "$INSTDIR\VertexX.exe", i 0x40000000, i 0, p 0, i 3, i 0, p 0) p.r0'
  ${If} $0 == -1
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Close Vertex X before continuing setup, then click Retry." /SD IDCANCEL IDRETRY retry
    Abort
  ${EndIf}
  System::Call 'kernel32::CloseHandle(p r0)'
  finished:
FunctionEnd

Function EnsureWebViewRuntime
  ; Microsoft's documented per-machine (32-bit view) and per-user runtime keys.
  SetRegView 32
  ReadRegStr $0 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  SetRegView 64
  ${If} $0 == ""
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${EndIf}
  ${If} $0 != ""
  ${AndIf} $0 != "0.0.0.0"
    Return
  ${EndIf}
  DetailPrint "Installing Microsoft WebView2. Internet connection may be required..."
  InitPluginsDir
  File /oname=$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe "prerequisites\MicrosoftEdgeWebview2Setup.exe"
  ExecWait '$\"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe$\" /silent /install' $1
  ${If} $1 != 0
    MessageBox MB_ICONSTOP "Microsoft WebView2 could not be installed (code $1). Connect to the internet and run setup again."
    Abort
  ${EndIf}
FunctionEnd

Section "Vertex X" Main
  Call CheckApplicationClosed
  Call EnsureWebViewRuntime
  SetOutPath "$INSTDIR"
  SetOverwrite on
  ClearErrors
  File /r "${PayloadDir}\*"
  ${If} ${Errors}
    MessageBox MB_ICONSTOP "Setup could not copy all application files. Run setup again after closing Vertex X."
    Abort
  ${EndIf}
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\Vertex X"
  CreateShortcut "$SMPROGRAMS\Vertex X\Vertex X.lnk" "$INSTDIR\VertexX.exe"
  CreateShortcut "$SMPROGRAMS\Vertex X\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\Vertex X.lnk" "$INSTDIR\VertexX.exe"
  WriteRegStr HKCU "Software\VertexX" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "DisplayName" "Vertex X"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "DisplayVersion" "${MyAppVersion}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "Publisher" "Vertex X"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "DisplayIcon" "$INSTDIR\VertexX.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "QuietUninstallString" '$\"$INSTDIR\Uninstall.exe$\" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX" "NoRepair" 1
SectionEnd

Function un.onInit
  SetRegView 64
  SetShellVarContext current
FunctionEnd

Function un.CheckApplicationClosed
  IfFileExists "$INSTDIR\VertexX.exe" 0 finished
  retry:
  System::Call 'kernel32::CreateFileW(w "$INSTDIR\VertexX.exe", i 0x40000000, i 0, p 0, i 3, i 0, p 0) p.r0'
  ${If} $0 == -1
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Close Vertex X before uninstalling, then click Retry." /SD IDCANCEL IDRETRY retry
    Abort
  ${EndIf}
  System::Call 'kernel32::CloseHandle(p r0)'
  finished:
FunctionEnd

Section "Uninstall"
  Call un.CheckApplicationClosed
  ; Remove only files from the installed payload; never remove scripts/settings.
  !include "VertexX-uninstall.nsh"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\Vertex X\Vertex X.lnk"
  Delete "$SMPROGRAMS\Vertex X\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Vertex X"
  Delete "$DESKTOP\Vertex X.lnk"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\VertexX"
  DeleteRegKey HKCU "Software\VertexX"
SectionEnd
