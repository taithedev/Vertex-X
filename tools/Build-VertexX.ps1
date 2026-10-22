# Build and optionally publish Vertex X using .NET 8 and NSIS. No Actions required.
[CmdletBinding()]
param(
  [ValidatePattern('^\d+\.\d+\.\d+$')][string]$Version = '0.5.0',
  [switch]$Publish
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if ($env:OS -ne 'Windows_NT') { throw 'Use Windows to run this PowerShell builder.' }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$project = Join-Path $root 'VertexX\VertexX.csproj'
$publishDir = Join-Path $root 'publish'
$outputDir = Join-Path $root 'installer-output'
$script = Join-Path $root 'installer\VertexX.nsi'
function Install-Tool([string]$id) {
  if (!(Get-Command winget -ErrorAction SilentlyContinue)) { throw "Install missing prerequisite $id, then retry." }
  & winget install --id $id --exact --accept-source-agreements --accept-package-agreements
  if ($LASTEXITCODE -ne 0) { throw "Installation failed: $id" }
}
$env:PATH = "$env:ProgramFiles\dotnet;${env:ProgramFiles(x86)}\NSIS;$env:ProgramFiles\NSIS;$env:ProgramFiles\GitHub CLI;$env:PATH"
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { Install-Tool 'Microsoft.DotNet.SDK.8' }
if (!(Get-Command dotnet -ErrorAction SilentlyContinue)) { throw 'Reopen this builder after installing .NET 8 SDK.' }
if (((& dotnet --list-sdks) -join "`n") -notmatch '(?m)^8\.') { Install-Tool 'Microsoft.DotNet.SDK.8' }
if (!(Get-Command makensis.exe -ErrorAction SilentlyContinue)) { Install-Tool 'NSIS.NSIS' }
$nsis = Get-Command makensis.exe -ErrorAction SilentlyContinue
if (!$nsis) { throw 'Reopen this builder after installing NSIS.' }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
# A clean payload prevents removed dependencies leaking into future installers.
if (Test-Path $publishDir) { Remove-Item -LiteralPath $publishDir -Recurse -Force }
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
& dotnet run --project (Join-Path $root 'tests\VertexX.AuthChecks') -p:NuGetAudit=false
if ($LASTEXITCODE -ne 0) { throw 'Account regression checks failed.' }
& dotnet publish $project -c Release -r win-x64 --self-contained true "-p:Version=$Version" '-p:PublishSingleFile=false' -o $publishDir
if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
if (!(Test-Path (Join-Path $publishDir 'VertexX.exe'))) { throw 'Application EXE is missing.' }
$manifest = @('; Generated from the exact payload; do not edit.')
Get-ChildItem $publishDir -File -Recurse | Sort-Object FullName | ForEach-Object {
  $relative = $_.FullName.Substring($publishDir.Length + 1).Replace('$', '$$')
  $manifest += 'Delete "$INSTDIR\' + $relative + '"'
}
Get-ChildItem $publishDir -Directory -Recurse | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
  $relative = $_.FullName.Substring($publishDir.Length + 1).Replace('$', '$$')
  $manifest += 'RMDir "$INSTDIR\' + $relative + '"'
}
[IO.File]::WriteAllLines((Join-Path $root 'installer\VertexX-uninstall.nsh'), $manifest, [Text.UTF8Encoding]::new($false))
& $nsis.Source "/DMyAppVersion=$Version" $script
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
$setup = Join-Path $outputDir "VertexX-Setup-$Version-x64.exe"
if (!(Test-Path $setup)) { throw 'Setup EXE was not produced.' }
$hash = (Get-FileHash -Algorithm SHA256 $setup).Hash.ToLowerInvariant()
$checksums = Join-Path $outputDir 'SHA256SUMS.txt'
[IO.File]::WriteAllText($checksums, "$hash  $(Split-Path -Leaf $setup)`r`n", [Text.UTF8Encoding]::new($false))
Write-Host "Built: $setup" -ForegroundColor Green
Write-Warning 'Unsigned installer. Native Windows install/upgrade/uninstall testing is required before promoting a release to stable.'
if ($Publish) {
  if (!(Get-Command gh -ErrorAction SilentlyContinue)) { Install-Tool 'GitHub.cli' }
  if (!(Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Reopen the builder after installing GitHub CLI.' }
  & gh auth status
  if ($LASTEXITCODE -ne 0) { throw 'Sign in with gh auth login, then retry.' }
  $head = (& git -C $root rev-parse HEAD)
  if ($LASTEXITCODE -ne 0) { throw 'Publishing requires a Git checkout so the exact source commit can be tagged.' }
  $dirty = & git -C $root status --porcelain --untracked-files=no
  if ($dirty) { throw 'Commit source changes before publishing.' }
  $notes = Join-Path $root "docs\RELEASE_NOTES_$Version.md"
  if (!(Test-Path $notes)) { throw "Missing release notes: $notes" }
  # Draft first: the full EXE and checksum upload must succeed before publication.
  & gh release create "v$Version" $setup $checksums --repo taithedev/Vertex-X --target $head --title "Vertex X v$Version beta" --notes-file $notes --draft --prerelease
  if ($LASTEXITCODE -ne 0) { throw 'Release upload failed. Any partial draft remains unpublished.' }
  & gh release edit "v$Version" --repo taithedev/Vertex-X --draft=false
  if ($LASTEXITCODE -ne 0) { throw 'Publishing failed; inspect the existing draft before retrying.' }
  Write-Host "Published beta: https://github.com/taithedev/Vertex-X/releases/tag/v$Version"
}
