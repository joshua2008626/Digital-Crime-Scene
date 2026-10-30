# Creates digital-crime-scene.zip next to the project folder (Windows PowerShell 5+).
# Excludes node_modules, build output, virtualenvs, databases, env files and caches.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("dcs-" + [guid]::NewGuid())
$zip = Join-Path (Split-Path -Parent $root) 'digital-crime-scene.zip'
New-Item -ItemType Directory -Path $stage | Out-Null
$exclude = @('node_modules', 'dist', '.venv', 'venv', '__pycache__', '.pytest_cache', 'playwright-report', 'test-results', 'coverage', '.git')
robocopy $root (Join-Path $stage 'digital-crime-scene') /E /XD $exclude /XF '*.db' '*.sqlite' '.env' '*.zip' /NFL /NDL /NJH /NJS | Out-Null
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage 'digital-crime-scene') -DestinationPath $zip
Remove-Item -Recurse -Force $stage
Write-Host "Created $zip"
