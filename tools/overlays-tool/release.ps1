# Builds, EV-signs and (with -Publish) releases VXH Overlays Tool. Run on the PC that has the code-signing certificate.
#   .\release.ps1            build + test + sign + verify -> dist\VXH Overlays Tool.exe
#   .\release.ps1 -Publish   the same, then GitHub release "tool-v<version>" with the signed .exe (needs gh, logged in)
# The version comes from Cargo.toml: bump it there first. Installed apps update themselves from these releases and
# only accept a file whose Authenticode signature is valid and made by "CN=SkullMedia Artur Spychalski".
param([switch]$Publish, [string]$Notes = "")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Same certificate and timestamp server as the SmoothWizard releases (Certum EV code signing).
$SignTool = "C:\Program Files (x86)\Microsoft SDKs\ClickOnce\SignTool\signtool.exe"
$CertSha1 = "8DB56528BBC9A099CD27B4A14EF23DF05F340188"
$TimestampUrl = "http://time.certum.pl"
$Repo = "skullboypl/Overlays-VXH"

$version = (Select-String -Path Cargo.toml -Pattern '^version = "(.+)"' | Select-Object -First 1).Matches[0].Groups[1].Value
$tag = "tool-v$version"
Write-Host "VXH Overlays Tool $version"

cargo test --release
if ($LASTEXITCODE) { throw "cargo test failed" }
cargo build --release
if ($LASTEXITCODE) { throw "cargo build failed" }

New-Item -ItemType Directory -Force dist | Out-Null
$out = Join-Path (Resolve-Path dist) "VXH Overlays Tool.exe"
Copy-Item target\release\vxh-overlays-tool.exe $out -Force

if (-not (Test-Path $SignTool)) { throw "signtool not found: $SignTool" }
& $SignTool sign /sha1 $CertSha1 /t $TimestampUrl /fd sha256 /v $out
if ($LASTEXITCODE) { throw "signing failed (is the certificate / card available?)" }
& $SignTool verify /pa $out
if ($LASTEXITCODE) { throw "signature check failed" }
$sig = Get-AuthenticodeSignature -LiteralPath $out
if ($sig.Status -ne "Valid" -or -not $sig.SignerCertificate.Subject.StartsWith("CN=SkullMedia Artur Spychalski")) { throw "unexpected signer: $($sig.SignerCertificate.Subject)" }
$hash = (Get-FileHash $out -Algorithm SHA256).Hash.ToLower()
Write-Host "Signed: $out"
Write-Host "SHA-256: $hash"

if (-not $Publish) { Write-Host "Not published (add -Publish)."; return }
gh release view $tag --repo $Repo *> $null
if (-not $LASTEXITCODE) { throw "release $tag already exists: bump the version in Cargo.toml" }
if (-not $Notes) { $Notes = "VXH Overlays Tool $version. Plik podpisany certyfikatem EV SkullMedia Artur Spychalski.`nSHA-256: $hash" }
gh release create $tag $out --repo $Repo --title "VXH Overlays Tool $version" --notes $Notes
if ($LASTEXITCODE) { throw "gh release create failed" }
Write-Host "Published $tag"
