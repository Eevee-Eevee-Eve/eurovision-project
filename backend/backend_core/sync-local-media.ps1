$ErrorActionPreference = 'Stop'

$participants = Get-Content 'participants_2026.json' -Raw | ConvertFrom-Json
$actsDir = Join-Path $PSScriptRoot 'public/media/acts/2026'
$flagsDir = Join-Path $PSScriptRoot 'public/media/flags'

New-Item -ItemType Directory -Force -Path $actsDir, $flagsDir | Out-Null

$manifest = @()

foreach ($participant in $participants) {
  $code = [string]$participant.code
  $slug = $code.ToLowerInvariant()
  $tempPath = Join-Path $actsDir "$slug.tmp"
  $imageUrl = [string]$participant.imageUrl
  $lowerImageUrl = $imageUrl.ToLowerInvariant()
  $extension = if ($lowerImageUrl -match 'webp') {
    'webp'
  } elseif ($lowerImageUrl -match 'png') {
    'png'
  } else {
    'jpg'
  }

  $finalPhotoPath = Join-Path $actsDir "$slug.$extension"
  if (Test-Path $finalPhotoPath) {
    Remove-Item $finalPhotoPath -Force
  }
  & curl.exe -L --fail --silent --show-error $imageUrl --output $tempPath
  Move-Item -Path $tempPath -Destination $finalPhotoPath -Force

  $flagPath = Join-Path $flagsDir "$slug.png"
  & curl.exe -L --fail --silent --show-error "https://flagcdn.com/w160/$slug.png" --output $flagPath

  $manifest += [pscustomobject]@{
    code = $code
    sourcePhotoUrl = [string]$participant.imageUrl
    sourceProfileUrl = [string]$participant.profileUrl
    localPhotoUrl = "/media/acts/2026/$slug.$extension"
    localFlagUrl = "/media/flags/$slug.png"
  }
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content (Join-Path $actsDir 'manifest.json')
