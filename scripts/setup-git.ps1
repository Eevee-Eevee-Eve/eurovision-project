param(
  [string]$RemoteUrl = ""
)

$ErrorActionPreference = "Stop"

function Get-GitExe {
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  if ($gitCommand) {
    return $gitCommand.Source
  }

  $fallback = "C:\Program Files\Git\cmd\git.exe"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "Git не найден. Установи Git for Windows или запусти: winget install --id Git.Git -e --source winget"
}

$git = Get-GitExe
$repoRoot = Split-Path -Parent $PSScriptRoot

Push-Location $repoRoot
try {
  if (-not (Test-Path ".git")) {
    & $git init -b main
  }

  & $git config core.autocrlf false
  & $git config core.filemode false
  & $git config fetch.prune true
  & $git config pull.rebase false
  & $git config push.autoSetupRemote true

  if ($RemoteUrl) {
    $hasOrigin = & $git remote | Select-String -Pattern "^origin$" -Quiet
    if ($hasOrigin) {
      & $git remote set-url origin $RemoteUrl
    } else {
      & $git remote add origin $RemoteUrl
    }
  }

  Write-Host ""
  Write-Host "Git настроен для проекта." -ForegroundColor Green
  Write-Host "Репозиторий: $repoRoot"
  Write-Host ""
  & $git status --short
}
finally {
  Pop-Location
}
