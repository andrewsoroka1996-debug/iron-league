#Requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Reproducible, isolated PostgreSQL test runner. No remote DB overrides.
$hostName = '127.0.0.1'
$port = 55432
$bin = 'C:\Program Files\PostgreSQL\17-IronLeagueTest\bin'
$psql = Join-Path $bin 'psql.exe'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))
$files = @(
  @{ Name='00-local-bootstrap.sql'; Path=(Join-Path $PSScriptRoot '00-local-bootstrap.sql'); Sha='043B9057459A5D5EA09583E7E072EB05D0CD8D2A10A3C3541C7B234FD6371FFA' },
  @{ Name='REVIEW-ONLY-discord-before-user-created-v2.sql'; Path=(Join-Path $repoRoot 'sql\REVIEW-ONLY-discord-before-user-created-v2.sql'); Sha='88AA265E30737DD369A808BC88986BD6BF26F34B6CDEBE4920A95A79438453CC' },
  @{ Name='02-local-security-tests.sql'; Path=(Join-Path $PSScriptRoot '02-local-security-tests.sql'); Sha='F801493F7D325AC01F95A922386DE63663264409EFDF700FAB4617173A11CCBB' }
)

Write-Host '=== IRON LEAGUE DISCORD HOOK V2: REPRODUCIBLE LOCAL TEST ==='
if (-not (Test-Path -LiteralPath $psql -PathType Leaf)) { throw "STOP: local psql missing: $psql" }
if (-not (Test-Path -LiteralPath (Join-Path $repoRoot '.git'))) { throw 'STOP: repository root is missing' }
foreach ($f in $files) {
  if (-not (Test-Path -LiteralPath $f.Path -PathType Leaf)) { throw "STOP: missing $($f.Name)" }
  $actual = (Get-FileHash -LiteralPath $f.Path -Algorithm SHA256).Hash
  if ($actual -cne $f.Sha) { throw "STOP: $($f.Name) SHA256 mismatch" }
}
Write-Host 'PASS: all three SQL sources match reviewed SHA256.'

$secret = Read-Host 'Enter LOCAL postgres password (127.0.0.1:55432 only)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$database = ('il_hook_v2_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + ([Guid]::NewGuid().ToString('N').Substring(0,8)))
$created = $false
try {
  $id = & $psql -X -w -q -A -t -v ON_ERROR_STOP=1 -h $hostName -p $port -U postgres -d postgres -c "SELECT current_database() || '|' || host(inet_server_addr()) || '|' || inet_server_port() || '|' || current_user;" 2>&1
  if ($LASTEXITCODE -ne 0) { throw "STOP: failed connecting to isolated LOCAL postgres: $id" }
  $expected = 'postgres|127.0.0.1|55432|postgres'
  if (($id | Select-Object -Last 1).ToString().Trim() -cne $expected) {
    throw "STOP: unexpected database identity; expected $expected; got $id"
  }
  Write-Host "PASS: isolated LOCAL server verified: $expected"
  & $psql -X -w -q -v ON_ERROR_STOP=1 -h $hostName -p $port -U postgres -d postgres -c "CREATE DATABASE $database;"
  if ($LASTEXITCODE -ne 0) { throw 'STOP: creating disposable database failed' }
  $created = $true
  Write-Host "Created disposable local DB: $database"
  foreach ($f in $files) {
    Write-Host "Executing local file: $($f.Name)"
    & $psql -X -w -v ON_ERROR_STOP=1 -h $hostName -p $port -U postgres -d $database -f $f.Path
    if ($LASTEXITCODE -ne 0) { throw "STOP: local SQL tests failed at $($f.Name)" }
  }
  Write-Host 'ALL LOCAL DISCORD HOOK V2 TESTS PASSED' -ForegroundColor Green
}
finally {
  if ($created) {
    Write-Host "Removing only disposable LOCAL DB: $database"
    & $psql -X -w -q -v ON_ERROR_STOP=1 -h $hostName -p $port -U postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$database' AND pid<>pg_backend_pid();" | Out-Null
    & $psql -X -w -q -v ON_ERROR_STOP=1 -h $hostName -p $port -U postgres -d postgres -c "DROP DATABASE IF EXISTS $database;"
    if ($LASTEXITCODE -ne 0) { Write-Warning "Local disposable DB cleanup failed: $database" }
  }
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $secret.Dispose()
}
