param(
  [string]$TargetPath = "$HOME\\Projects\\eurovision-project",
  [switch]$OpenVSCode
)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/Eevee-Eevee-Eve/eurovision-project.git"

function Get-GitExe {
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  if ($gitCommand) {
    return $gitCommand.Source
  }

  $fallback = "C:\Program Files\Git\cmd\git.exe"
  if (Test-Path $fallback) {
    return $fallback
  }

  throw "Git was not found. Install Git for Windows first."
}

function Get-CodeExe {
  $codeCommand = Get-Command code -ErrorAction SilentlyContinue
  if ($codeCommand) {
    return $codeCommand.Source
  }

  $fallback = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd"
  if (Test-Path $fallback) {
    return $fallback
  }

  return $null
}

$git = Get-GitExe

if (-not (Test-Path $TargetPath)) {
  $parent = Split-Path -Parent $TargetPath
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  & $git clone $RepoUrl $TargetPath
} else {
  if (-not (Test-Path (Join-Path $TargetPath ".git"))) {
    throw "Target folder exists but is not a git repository: $TargetPath"
  }

  Push-Location $TargetPath
  try {
    & $git pull --rebase
  }
  finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "Project is ready on this computer." -ForegroundColor Green
Write-Host "Folder: $TargetPath"
Write-Host ""
Write-Host "Next:"
Write-Host "1. Open PROJECT_CONTEXT.md"
Write-Host "2. Open SESSION_LOG.md"
Write-Host "3. Open KNOWN_ISSUES.md"
Write-Host "4. If needed, copy deploy-secrets.local.env manually from your first PC"
Write-Host ""

if ($OpenVSCode) {
  $code = Get-CodeExe
  if ($code) {
    & $code $TargetPath
  } else {
    Write-Host "VS Code CLI was not found. Open the folder manually in VS Code." -ForegroundColor Yellow
  }
}
