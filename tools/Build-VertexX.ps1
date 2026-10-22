# Vertex X Windows installer builder. No GitHub Actions required.
[CmdletBinding()]
param(
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version = '0.5.0',
  [switch]$Publish
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:OS -ne 'Windows_NT') {
  throw 'A Windows PC is required to build the native WPF app and Inno Setup installer.'
}
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$project = Join-Path $root 'VertexX\VertexX.csproj'
$iss = Join-Path $root 'installer\VertexX.iss'
$publishDir = Join-Path $root 'publish'
$outputDir = Join-Path $root 'installer-output'
if (!(Test-Path $project) -or !(Test-Path $iss)) {
  throw 'Run this script from a complete Vertex-X repository checkout.'
}
function Install-WithWinget([string]$id) {
  if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "Missing $id. Install it from the official website or install Windows App Installer (winget)."
  }
  Write-Host "Installing missing prerequisite: $id" -ForegroundColor Yellow
  & winget install --id $id --exact --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "Could not install $id using winget." }
}
function Find-Iscc {
  $x86 = [Environment]::GetFolderPath('ProgramFilesX86')
  $local = $env:LOCALAPPDATA
  $programFiles = $env:ProgramFiles
  foreach ($folder in @(
    (Join-Path $x86 'Inno Setup 6\ISCC.exe'),
    (Join-Path $local 'Programs\Inno Setup 6\ISCC.exe'),
    (Join-Path $programFiles 'Inno Setup 6\ISCC.exe')
  )) {
    if (Test-Path $folder) { return $folder }
  }
  $fromPath = Get-Command ISCC.exe -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }
  return $null
}
$env:PATH = "$env:ProgramFiles\dotnet;$env:LOCALAPPDATA\Microsoft\dotnet;$env:PATH"
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (!$dotnet) {
  Install-WithWinget 'Microsoft.DotNet.SDK.8'
  $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
}
if (!$dotnet) { throw 'Reopen PowerShell after installing the .NET 8 SDK, then retry.' }
$sdkList = (& $dotnet.Source --list-sdks) -join [Environment]::NewLine
if ($sdkList -notmatch '(?m)^8\.') {
  Install-WithWinget 'Microsoft.DotNet.SDK.8'
  $sdkList = (& $dotnet.Source --list-sdks) -join [Environment]::NewLine
  if ($sdkList -notmatch '(?m)^8\.') { throw 'The .NET 8 SDK is missing. Reopen PowerShell and retry.' }
}
$iscc = Find-Iscc
if (!$iscc) {
  Install-WithWinget 'JRSoftware.InnoSetup'
  $iscc = Find-Iscc
}
if (!$iscc) { throw 'Inno Setup 6 was installed but ISCC.exe was not found. Reopen PowerShell and retry.' }
Write-Host "Building Vertex X $Version for Windows x64..." -ForegroundColor Cyan
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
& $dotnet.Source restore $project
if ($LASTEXITCODE -ne 0) { throw 'dotnet restore failed.' }
$arguments = @('publish', $project, '-c', 'Release', '-r', 'win-x64', '--self-contained', 'true', "-p:Version=$Version", '-p:PublishSingleFile=true', '-p:EnableCompressionInSingleFile=true', '-o', $publishDir)
& $dotnet.Source @arguments
if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed.' }
if (!(Test-Path (Join-Path $publishDir 'VertexX.exe'))) { throw 'VertexX.exe was not produced.' }
Write-Host 'Compiling dark-themed Windows setup wizard...' -ForegroundColor Cyan
& $iscc "/DMyAppVersion=$Version" $iss
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup compiler failed.' }
$setup = Join-Path $outputDir "VertexX-Setup-$Version-x64.exe"
if (!(Test-Path $setup)) { throw "Installer was not produced at $setup" }
$hash = (Get-FileHash -Algorithm SHA256 -Path $setup).Hash.ToLowerInvariant()
$checksums = Join-Path $outputDir 'SHA256SUMS.txt'
[System.IO.File]::WriteAllText($checksums, "$hash  $(Split-Path -Leaf $setup)" + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Installer built: $setup" -ForegroundColor Green
Write-Host "SHA256: $hash"
Write-Warning 'Installer is not code-signed. Windows SmartScreen may display a publisher warning.'
if ($Publish) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (!$gh) {
    Install-WithWinget 'GitHub.cli'
    $env:PATH = "$env:ProgramFiles\GitHub CLI;$env:PATH"
    $gh = Get-Command gh -ErrorAction SilentlyContinue
  }
  if (!$gh) { throw 'GitHub CLI missing. Reopen PowerShell after installing GitHub CLI.' }
  & $gh.Source auth status
  if ($LASTEXITCODE -ne 0) { throw 'Sign in with gh auth login, then run this script with -Publish.' }
  $tag = "v$Version"
  $existingJson = & $gh.Source release list --repo 'taithedev/Vertex-X' --limit 100 --json tagName
  if ($LASTEXITCODE -ne 0) { throw 'Could not check existing GitHub Releases.' }
  $existing = $existingJson | ConvertFrom-Json
  if ($existing | Where-Object { $_.tagName -eq $tag }) {
    throw "Release $tag already exists. Increment the version before publishing."
  }
  $notes = Join-Path $root 'docs\RELEASE_NOTES_0.5.0.md'
  if ($Version -eq '0.5.0' -and (Test-Path $notes)) {
    $releaseArgs = @('release', 'create', $tag, $setup, $checksums, '--repo', 'taithedev/Vertex-X', '--target', 'main', '--title', "Vertex X $tag", '--notes-file', $notes)
  } else {
    $releaseArgs = @('release', 'create', $tag, $setup, $checksums, '--repo', 'taithedev/Vertex-X', '--target', 'main', '--title', "Vertex X $tag", '--generate-notes')
  }
  & $gh.Source @releaseArgs
  if ($LASTEXITCODE -ne 0) { throw 'GitHub Release creation failed.' }
  Write-Host "Release published: https://github.com/taithedev/Vertex-X/releases/tag/$tag" -ForegroundColor Green
}