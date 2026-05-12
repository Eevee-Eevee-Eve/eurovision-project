param(
    [string]$HostName = "90.156.225.223",
    [string]$User = "root",
    [string]$KeyPath = "$env:USERPROFILE\.ssh\morozoveuroparty",
    [string]$ProjectPath = "/opt/eurovision_project",
    [string]$RemoteBackupDir = "/opt/eurovision_private_backups/state",
    [string]$DownloadDirectory = ""
)

$ErrorActionPreference = "Stop"

$remoteScript = @"
set -e
stamp=`$(date +%Y%m%d-%H%M%S)
mkdir -p "$RemoteBackupDir"
cd "$ProjectPath"
cid=`$(docker compose ps -q backend)
docker exec "`$cid" sh -lc 'tar -czf /tmp/backend-state.tar.gz -C /app data public/uploads 2>/tmp/backend-state-tar.err || tar -czf /tmp/backend-state.tar.gz -C /app data'
target="$RemoteBackupDir/backend-state-`$stamp.tar.gz"
docker cp "`$cid":/tmp/backend-state.tar.gz "`$target"
chmod 600 "`$target"
printf '%s\n' "`$target"
"@

$remoteTarget = "$User@$HostName"
$remotePath = ssh -i $KeyPath $remoteTarget $remoteScript

Write-Host "Created remote backup: $remotePath"

if ($DownloadDirectory.Trim()) {
    New-Item -ItemType Directory -Force -Path $DownloadDirectory | Out-Null
    scp -i $KeyPath "${remoteTarget}:$remotePath" $DownloadDirectory
    Write-Host "Downloaded backup to: $DownloadDirectory"
}
