# VXH Overlays Tool: one-command install / update (Windows, no admin rights)
#   irm https://overlays.vxh.pl/install.ps1 | iex
# Takes the newest "tool-v*" release from github.com/skullboypl/Overlays-VXH, installs it only when Windows reports a
# valid signature by SkullMedia Artur Spychalski, puts it in %LOCALAPPDATA%\Programs\VXH Overlays Tool with a Start
# menu shortcut and starts it. The same command updates an older copy. No UTF-8 BOM: it breaks irm | iex on PS 5.1.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

function Write-Step([string]$m) { Write-Host ("> " + $m) -ForegroundColor Cyan }
function Show-Fail([string]$msg) {
	Write-Host $msg -ForegroundColor Red
	try {
		Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue | Out-Null
		[void][System.Windows.Forms.MessageBox]::Show($msg, 'VXH Overlays Tool', 'OK', 'Error')
	} catch { }
}

try {
	Write-Host ""
	Write-Host " VXH Overlays Tool - instalacja jedną komendą" -ForegroundColor White
	Write-Host ""

	Write-Step "Sprawdzam najnowszą wersję na GitHubie..."
	$releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/skullboypl/Overlays-VXH/releases?per_page=30' -Headers @{ 'User-Agent' = 'vxh-overlays-install' } -UseBasicParsing
	$release = $releases |
		Where-Object { -not $_.draft -and -not $_.prerelease -and $_.tag_name -like 'tool-v*' -and ($_.assets | Where-Object { $_.name -like '*.exe' }) } |
		Sort-Object { [version](($_.tag_name -replace '^tool-v', '') -replace '[^0-9.].*$', '') } -Descending |
		Select-Object -First 1
	if (-not $release) { throw "Nie znalazłem wydania aplikacji na GitHubie." }
	$asset = $release.assets | Where-Object { $_.name -like '*.exe' } | Select-Object -First 1
	$version = $release.tag_name -replace '^tool-v', ''
	Write-Host "  wersja $version"

	$dir = Join-Path $env:LOCALAPPDATA 'Programs\VXH Overlays Tool'
	$exe = Join-Path $dir 'VXH Overlays Tool.exe'
	$tmp = Join-Path $env:TEMP ("vxh-overlays-tool-" + [guid]::NewGuid().ToString('N') + ".exe")
	try {
		Write-Step "Pobieram..."
		Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmp -UseBasicParsing

		Write-Step "Sprawdzam podpis..."
		$sig = Get-AuthenticodeSignature -LiteralPath $tmp
		if ($sig.Status -ne 'Valid' -or -not $sig.SignerCertificate.Subject.StartsWith('CN=SkullMedia Artur Spychalski')) {
			throw "Pobrany plik nie ma ważnego podpisu SkullMedia ($($sig.Status)). Nie instaluję."
		}

		Write-Step "Instaluję do $dir..."
		Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path -ieq $exe } | Stop-Process -Force -ErrorAction SilentlyContinue
		Start-Sleep -Milliseconds 600
		New-Item -ItemType Directory -Force -Path $dir | Out-Null
		Copy-Item -LiteralPath $tmp -Destination $exe -Force
	}
	finally {
		Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
	}

	$lnk = Join-Path ([Environment]::GetFolderPath('Programs')) 'VXH Overlays Tool.lnk'
	$shell = New-Object -ComObject WScript.Shell
	$s = $shell.CreateShortcut($lnk)
	$s.TargetPath = $exe
	$s.WorkingDirectory = $dir
	$s.Description = 'VXH Overlays Tool'
	$s.Save()

	if (-not $env:VXH_INSTALL_NO_START) {
		Write-Step "Uruchamiam..."
		Start-Process -FilePath $exe -WorkingDirectory $dir
	}

	Write-Host ""
	Write-Host " Gotowe: wersja $version. Menu Start -> VXH Overlays Tool." -ForegroundColor Green
	Write-Host " Aplikacja sama się aktualizuje. W oknie kliknij 'Połącz z panelem'." -ForegroundColor DarkGray
}
catch {
	Show-Fail ("Instalacja VXH Overlays Tool nie udała się:`n" + $_.Exception.Message)
}
