param(
    [string]$OutputPath = "deploy-secrets.local.env",
    [string]$AdminEmail = "admin@morozoveuroparty.ru",
    [string]$SmtpFrom = "Morozov Euro Party <admin@morozoveuroparty.ru>"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-HexSecret {
    param([int]$ByteCount = 32)

    $bytes = New-Object byte[] $ByteCount
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return ([System.BitConverter]::ToString($bytes) -replace "-", "").ToLowerInvariant()
}

function New-Password {
    param([int]$Length = 20)

    $upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    $lower = "abcdefghijkmnopqrstuvwxyz"
    $digits = "23456789"
    $symbols = "!@#$%^&*_-+=?"
    $all = ($upper + $lower + $digits + $symbols).ToCharArray()

    $chars = @(
        $upper[(Get-Random -Minimum 0 -Maximum $upper.Length)]
        $lower[(Get-Random -Minimum 0 -Maximum $lower.Length)]
        $digits[(Get-Random -Minimum 0 -Maximum $digits.Length)]
        $symbols[(Get-Random -Minimum 0 -Maximum $symbols.Length)]
    )

    while ($chars.Count -lt $Length) {
        $chars += $all[(Get-Random -Minimum 0 -Maximum $all.Length)]
    }

    $password = ($chars | Sort-Object { Get-Random }) -join ""
    return $password
}

$adminKey = New-HexSecret
$adminPassword = New-Password

$content = @"
ADMIN_KEY=$adminKey
ADMIN_EMAIL=$AdminEmail
ADMIN_PASSWORD=$adminPassword
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=$SmtpFrom
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), $content, $utf8NoBom)

Write-Host "Secrets file created:" (Join-Path (Get-Location) $OutputPath)
Write-Host "Admin email:" $AdminEmail
Write-Host "SMTP settings left blank by default."
