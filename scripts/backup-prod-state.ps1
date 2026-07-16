param(
    [string]$HostName = "90.156.225.223",
    [string]$User = "root",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\morozoveuroparty",
    [string]$ProjectPath = "/opt/eurovision_project",
    [string]$RemoteBackupDir = "/opt/eurovision_private_backups/state",
    [string]$DownloadDirectory = "",
    [string]$PasswordFile = ""
)

$ErrorActionPreference = "Stop"

function Get-OpenSslPath {
    $command = Get-Command openssl -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        "$env:ProgramFiles\Git\usr\bin\openssl.exe",
        "$env:ProgramFiles\Git\mingw64\bin\openssl.exe"
    )
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw "OpenSSL was not found. Install Git for Windows or OpenSSL."
}

function Get-BackupPassword {
    param([string]$Path)

    if ($Path.Trim()) {
        if (-not (Test-Path -LiteralPath $Path)) {
            throw "Password file was not found: $Path"
        }
        $value = (Get-Content -LiteralPath $Path -Raw).Trim()
        if ($value.Length -lt 20) {
            throw "Backup password must contain at least 20 characters."
        }
        return $value
    }

    if ($env:MEP_BACKUP_PASSWORD) {
        return $env:MEP_BACKUP_PASSWORD
    }

    $secure = Read-Host "Backup password" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
    if ($value.Length -lt 20) {
        throw "Backup password must contain at least 20 characters."
    }
    return $value
}

if (-not $DownloadDirectory.Trim()) {
    $DownloadDirectory = if (Test-Path -LiteralPath "D:\") {
        "D:\MorozovEuroParty-Backups\encrypted"
    }
    else {
        Join-Path ([Environment]::GetFolderPath("MyDocuments")) "MorozovEuroParty-Backups\encrypted"
    }
}

$openssl = Get-OpenSslPath
$password = Get-BackupPassword -Path $PasswordFile
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "morozoveuroparty-runtime-$stamp.tar.gz"
$encryptedName = "$archiveName.mepbak"
$tempDirectory = Join-Path ([IO.Path]::GetTempPath()) "mep-backup-$stamp"
$plainPath = Join-Path $tempDirectory $archiveName
$verificationPath = Join-Path $tempDirectory "verify-$archiveName"
$encryptedPath = Join-Path $DownloadDirectory $encryptedName
$hashPath = "$encryptedPath.sha256"
$remotePlainPath = "$RemoteBackupDir/$archiveName"
$remoteTarget = "$User@$HostName"

$remoteScript = @"
set -eu
mkdir -p "$RemoteBackupDir"
cd "$ProjectPath"
cid=`$(docker compose ps -q backend)
test -n "`$cid"
docker exec "`$cid" sh -lc 'tar -czf /tmp/$archiveName -C /app data public/uploads'
docker cp "`$cid":/tmp/$archiveName "$remotePlainPath"
docker exec "`$cid" rm -f /tmp/$archiveName
chmod 600 "$remotePlainPath"
printf '%s\n' "$remotePlainPath"
"@

New-Item -ItemType Directory -Force -Path $DownloadDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

try {
    $createdRemotePath = (ssh -i $KeyPath -o BatchMode=yes $remoteTarget $remoteScript | Select-Object -Last 1).Trim()
    if (-not $createdRemotePath) {
        throw "The server did not return a backup path."
    }

    scp -i $KeyPath "${remoteTarget}:$createdRemotePath" $plainPath
    if ($LASTEXITCODE -ne 0) {
        throw "Could not download the production backup."
    }

    $entries = tar -tzf $plainPath
    if ($LASTEXITCODE -ne 0 -or -not ($entries -contains "data/app-state.json")) {
        throw "The downloaded archive is invalid or does not contain data/app-state.json."
    }

    $env:MEP_BACKUP_PASSWORD = $password
    & $openssl enc -aes-256-cbc -salt -pbkdf2 -iter 250000 -md sha256 `
        -in $plainPath -out $encryptedPath -pass env:MEP_BACKUP_PASSWORD
    if ($LASTEXITCODE -ne 0) {
        throw "Could not encrypt the backup."
    }

    & $openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 -md sha256 `
        -in $encryptedPath -out $verificationPath -pass env:MEP_BACKUP_PASSWORD
    if ($LASTEXITCODE -ne 0) {
        throw "Could not decrypt the backup verification copy."
    }

    $verifiedEntries = tar -tzf $verificationPath
    if ($LASTEXITCODE -ne 0 -or -not ($verifiedEntries -contains "data/app-state.json")) {
        throw "Encrypted backup verification failed."
    }

    $hash = (Get-FileHash -LiteralPath $encryptedPath -Algorithm SHA256).Hash.ToLowerInvariant()
    Set-Content -LiteralPath $hashPath -Value "$hash  $encryptedName" -Encoding ASCII

    ssh -i $KeyPath -o BatchMode=yes $remoteTarget "rm -f '$createdRemotePath'"

    Write-Host "Encrypted backup created and verified:"
    Write-Host $encryptedPath
    Write-Host "Accounts, rooms, predictions, statistics, achievements, and uploads are included."
}
finally {
    Remove-Item Env:MEP_BACKUP_PASSWORD -ErrorAction SilentlyContinue
    $password = $null
    if (Test-Path -LiteralPath $tempDirectory) {
        Remove-Item -LiteralPath $tempDirectory -Recurse -Force
    }
}
