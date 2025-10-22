param(
  [switch] $Quiet
)

function Write-Info($msg) { if (-not $Quiet) { Write-Host "[bootstrap-ps] $msg" } }

Write-Info "PowerShell version: $($PSVersionTable.PSVersion.ToString())"

# 1) Ensure execution policy allows local scripts for CurrentUser
try {
  $current = Get-ExecutionPolicy -Scope CurrentUser -ErrorAction SilentlyContinue
  if (-not $current -or $current -eq 'Undefined' -or $current -eq 'Restricted') {
    Write-Info "Setting ExecutionPolicy for CurrentUser to RemoteSigned"
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop
  } else {
    Write-Info "ExecutionPolicy (CurrentUser) already '$current'"
  }
} catch {
  Write-Warning "Failed to set ExecutionPolicy: $_"
}

# 2) Detect PowerShell 7 (pwsh)
$pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwsh) {
  $pwshVersion = & pwsh -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"
  Write-Info "Found PowerShell 7 (pwsh): $pwshVersion"
} else {
  Write-Info "PowerShell 7 (pwsh) not found. Install with:"
  Write-Host "  winget install --id Microsoft.Powershell --source winget" -ForegroundColor Yellow
}

# 3) Optional: Unblock common repo scripts to avoid Zone.Identifier prompts
try {
  $paths = @(
    "scripts/*.ps1",
    "scripts/**/*.ps1",
    "algorithms/**/*.ps1"
  )
  foreach ($glob in $paths) {
    Get-ChildItem -Path $glob -File -ErrorAction SilentlyContinue | ForEach-Object {
      Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    }
  }
  Write-Info "Unblocked repo PowerShell scripts (if needed)"
} catch {
  Write-Warning "Unblock-File step skipped: $_"
}

Write-Info "Bootstrap complete. Restart VS Code terminal to pick up settings."

