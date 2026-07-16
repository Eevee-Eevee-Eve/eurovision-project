[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string[]]$Directory,
    [ValidateRange(1, 365)]
    [int]$Daily = 7,
    [ValidateRange(1, 104)]
    [int]$Weekly = 4,
    [ValidateRange(1, 120)]
    [int]$Monthly = 6
)

$ErrorActionPreference = "Stop"
$backupPattern = '^morozoveuroparty-runtime-(?<stamp>\d{8}-\d{6})\.tar\.gz\.mepbak$'

function Get-IsoWeekKey {
    param([datetime]$Date)

    $dayNumber = [int]$Date.DayOfWeek
    if ($dayNumber -eq 0) {
        $dayNumber = 7
    }

    $thursday = $Date.Date.AddDays(4 - $dayNumber)
    $weekYear = $thursday.Year
    $januaryFourth = [datetime]::new($weekYear, 1, 4)
    $januaryFourthDay = [int]$januaryFourth.DayOfWeek
    if ($januaryFourthDay -eq 0) {
        $januaryFourthDay = 7
    }

    $firstThursday = $januaryFourth.AddDays(4 - $januaryFourthDay)
    $weekNumber = [int](1 + [math]::Floor(($thursday - $firstThursday).TotalDays / 7))
    return "{0:D4}-W{1:D2}" -f $weekYear, $weekNumber
}

function Select-LatestPerPeriod {
    param(
        [object[]]$Backups,
        [scriptblock]$KeySelector,
        [int]$Limit
    )

    return @(
        $Backups |
            Group-Object -Property $KeySelector |
            ForEach-Object {
                $_.Group | Sort-Object Timestamp -Descending | Select-Object -First 1
            } |
            Sort-Object Timestamp -Descending |
            Select-Object -First $Limit
    )
}

$resolvedDirectories = @(
    $Directory |
        Where-Object { $_ -and $_.Trim() } |
        ForEach-Object {
            if (Test-Path -LiteralPath $_ -PathType Container) {
                (Resolve-Path -LiteralPath $_).Path
            }
        } |
        Select-Object -Unique
)

if ($resolvedDirectories.Count -eq 0) {
    throw "No backup directories were found."
}

foreach ($backupDirectory in $resolvedDirectories) {
    $backups = @(
        Get-ChildItem -LiteralPath $backupDirectory -File |
            ForEach-Object {
                if ($_.Name -notmatch $backupPattern) {
                    return
                }

                $timestamp = [datetime]::MinValue
                $parsed = [datetime]::TryParseExact(
                    $Matches.stamp,
                    "yyyyMMdd-HHmmss",
                    [Globalization.CultureInfo]::InvariantCulture,
                    [Globalization.DateTimeStyles]::None,
                    [ref]$timestamp
                )
                if (-not $parsed) {
                    return
                }

                $hashPath = "$($_.FullName).sha256"
                if (-not (Test-Path -LiteralPath $hashPath -PathType Leaf)) {
                    Write-Warning "Skipping unverified or legacy backup without SHA256 file: $($_.FullName)"
                    return
                }

                [pscustomobject]@{
                    File = $_
                    HashPath = $hashPath
                    Timestamp = $timestamp
                }
            }
    )

    if ($backups.Count -eq 0) {
        Write-Host "No verified encrypted backups found in $backupDirectory"
        continue
    }

    $keep = [Collections.Generic.HashSet[string]]::new(
        [StringComparer]::OrdinalIgnoreCase
    )
    $dailyBackups = Select-LatestPerPeriod `
        -Backups $backups `
        -KeySelector { $_.Timestamp.ToString("yyyy-MM-dd") } `
        -Limit $Daily
    $weeklyBackups = Select-LatestPerPeriod `
        -Backups $backups `
        -KeySelector { Get-IsoWeekKey $_.Timestamp } `
        -Limit $Weekly
    $monthlyBackups = Select-LatestPerPeriod `
        -Backups $backups `
        -KeySelector { $_.Timestamp.ToString("yyyy-MM") } `
        -Limit $Monthly

    @($dailyBackups) + @($weeklyBackups) + @($monthlyBackups) |
        ForEach-Object {
            [void]$keep.Add($_.File.FullName)
        }

    $remove = @(
        $backups |
            Where-Object { -not $keep.Contains($_.File.FullName) } |
            Sort-Object Timestamp
    )

    Write-Host ""
    Write-Host "Backup rotation: $backupDirectory"
    Write-Host "Verified backups: $($backups.Count)"
    Write-Host "Keeping: $($keep.Count)"
    Write-Host "Removing: $($remove.Count)"
    Write-Host "Retention: $Daily daily, $Weekly weekly, $Monthly monthly"

    foreach ($backup in $remove) {
        if ($PSCmdlet.ShouldProcess($backup.File.FullName, "Remove expired encrypted backup and SHA256 file")) {
            Remove-Item -LiteralPath $backup.File.FullName -Force
            Remove-Item -LiteralPath $backup.HashPath -Force
            Write-Host "Removed: $($backup.File.Name)"
        }
    }
}
