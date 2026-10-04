# Junctions this project into your Foundry Data/modules folder as "orb-hud".
# Usage: npm run link -- -DataPath "C:\Users\you\AppData\Local\FoundryVTT\Data"
param([string]$DataPath = "$env:LOCALAPPDATA\FoundryVTT\Data")
$target = Join-Path $DataPath "modules\orb-hud"
if (Test-Path $target) { Write-Host "Already exists: $target"; exit 0 }
New-Item -ItemType Junction -Path $target -Target (Resolve-Path "$PSScriptRoot\..") | Out-Null
Write-Host "Linked $target"