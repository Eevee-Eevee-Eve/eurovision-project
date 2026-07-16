param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,
    [string]$PasswordFile = ""
)

$ErrorActionPreference = "Stop"

function Get-OpenSslPath {
    $command = Get-Command openssl -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    foreach ($candidate in @(
        "$env:ProgramFiles\Git\usr\bin\openssl.exe",
        "$env:ProgramFiles\Git\mingw64\bin\openssl.exe"
    )) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }
    throw "OpenSSL was not found."
}

function Get-BackupPassword {
    if ($PasswordFile.Trim()) {
        return (Get-Content -LiteralPath $PasswordFile -Raw).Trim()
    }
    if ($env:MEP_BACKUP_PASSWORD) {
        return $env:MEP_BACKUP_PASSWORD
    }

    $secure = Read-Host "Backup password" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

if (-not (Test-Path -LiteralPath $BackupPath)) {
    throw "Backup file was not found: $BackupPath"
}

$openssl = Get-OpenSslPath
$password = Get-BackupPassword
$tempPath = Join-Path ([IO.Path]::GetTempPath()) "mep-verify-$([Guid]::NewGuid().ToString('N')).tar.gz"

try {
    $env:MEP_BACKUP_PASSWORD = $password
    & $openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -md sha256 `
        -in $BackupPath -out $tempPath -pass env:MEP_BACKUP_PASSWORD
    if ($LASTEXITCODE -ne 0) {
        throw "Could not decrypt the backup."
    }

    $entries = tar -tzf $tempPath
    if ($LASTEXITCODE -ne 0 -or -not ($entries -contains "data/app-state.json")) {
        throw "The backup is invalid."
    }

    Write-Host "Backup is valid."
    Write-Host "Contains account state: yes"
    Write-Host "Contains uploads: $([bool]($entries | Where-Object { $_ -like 'public/uploads/*' }))"
    Write-Host "Archive entries: $($entries.Count)"
}
finally {
    Remove-Item Env:MEP_BACKUP_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
    if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -Force
    }
}
