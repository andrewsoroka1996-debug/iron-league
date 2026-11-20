#Requires -Version 5.1
<#
Iron League SQL integration smoke test v2. LOCAL ONLY, PostgreSQL 17-IronLeagueTest.
Creates its OWN disposable il_smoke_* database, or resumes an explicitly named clean v1 failure.
Never uses or drops iron_league_sql_test.
Does not connect to Production Supabase, GitHub or Vercel, or modify the repository.
#>
[CmdletBinding()]
param(
    [string]$Repo = 'C:\Users\Admin\iron-league',
    [string]$ResumeDatabase = '',
    [switch]$KeepDatabase
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$serverRoot = 'C:\Program Files\PostgreSQL\17-IronLeagueTest'
$psql = Join-Path $serverRoot 'bin\psql.exe'
$createdb = Join-Path $serverRoot 'bin\createdb.exe'
$dropdb = Join-Path $serverRoot 'bin\dropdb.exe'
$prepared = Join-Path $Repo 'sql\REVIEW-ONLY-iron-league-player-accounts-prepared-v5.sql'
$registry = Join-Path $Repo 'data\players.ts'
$kitDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bootstrap = Join-Path $kitDir '00-bootstrap.sql'
$verify = Join-Path $kitDir '02-verify.sql'
$hostAddress = '127.0.0.1'
$port = '55432'
$db = 'il_smoke_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
$resume = -not [string]::IsNullOrWhiteSpace($ResumeDatabase)
if ($resume) {
    if ($ResumeDatabase -cnotmatch '^il_smoke_[0-9]{8}_[0-9]{6}_[0-9a-f]{8}$') {
        throw 'STOP: ResumeDatabase must be a known disposable il_smoke_* database'
    }
    throw 'STOP: v5 test suite requires a fresh disposable database; resume is disabled'
}
$created = $false
$finished = $false
$oldPassword = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
$secret = $null
$bstr = [IntPtr]::Zero

function Assert-Exit([string]$action) {
    if ($LASTEXITCODE -ne 0) { throw "$action failed (exit code $LASTEXITCODE)" }
}

try {
    Write-Host '=== IRON LEAGUE LOCAL SQL INTEGRATION ==='
    if ((Get-Item -LiteralPath $Repo).PSIsContainer -ne $true) { throw 'Repository directory not found' }
    foreach ($file in @($psql, $createdb, $dropdb, $prepared, $registry, $bootstrap, $verify)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing required file: $file" }
    }

    if ((& git -C $Repo branch --show-current).Trim() -ne 'main') {
        throw 'STOP: the repository must be on main'
    }
    $head = (& git -C $Repo rev-parse --short HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Git HEAD check failed' }
    Write-Host "Repository HEAD: $head (no code changes will be made)"

    $srcHash = (Get-FileHash -LiteralPath $registry -Algorithm SHA256).Hash.ToLowerInvariant()
    $sqlText = [System.IO.File]::ReadAllText($prepared, [System.Text.Encoding]::UTF8)
    if (-not $sqlText.Contains("-- Source SHA256: $srcHash")) {
        throw 'STOP: prepared SQL does not match the current data/players.ts hash'
    }
    if ($sqlText.Contains('IL_LEGACY_SNAPSHOT_PLACEHOLDER') -or
        $sqlText -notmatch '(?s)INSERT INTO public\.il_legacy_players\(id, nickname\) VALUES.*?;\s*DO \$\$\s*BEGIN' -or
        $sqlText -notmatch '(?i)CREATE UNIQUE INDEX il_legacy_players_nickname_key_idx' -or
        $sqlText -notmatch 'count\(DISTINCT x\.id\)' -or
        $sqlText -notmatch 'CREATE TABLE public\.il_pending_player_request_slots' -or
        $sqlText -notmatch 'CREATE TRIGGER il_guard_link_request_slot' -or
        $sqlText -notmatch 'CREATE TRIGGER il_guard_profile_request_slot') {
        throw 'STOP: prepared SQL is not the reviewed v5 schema'
    }
    if ($sqlText -match '(?m)^-- Snapshot rows: (\d+);') {
        $playerCount = [int]$Matches[1]
    } else {
        throw 'STOP: prepared SQL has no historical player count'
    }
    if ($playerCount -lt 1) { throw 'STOP: empty legacy snapshot' }
    Write-Host "Prepared SQL verified: $playerCount historical players; SHA256 matches"

    # Allow the *reviewed exact* v5 SQL template to be tested before commit.
    # The historical player data and offline generator must remain unmodified.
    $sourceStatus = @(& git -C $Repo status --porcelain -- 'data/players.ts' 'scripts/generate-player-accounts-sql.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Git status check failed' }
    if ($sourceStatus.Count -gt 0) { throw "STOP: registry/generator modified: $($sourceStatus -join '; ')" }
    # git hash-object honors the repository's LF/CRLF conversion, so the
    # identity check stays valid after Windows checkout and later commits.
    $templateRel = 'sql/REVIEW-ONLY-iron-league-player-accounts-foundation.sql'
    $expectedTemplateBlob = '4d84ef7978e81a8f2a81c69c8c0ea2cd7c1fede6'
    $currentTemplateBlob = (& git -C $Repo hash-object -- $templateRel).Trim()
    if ($LASTEXITCODE -ne 0 -or $currentTemplateBlob -cne $expectedTemplateBlob) {
        throw 'STOP: SQL template differs from the reviewed v5 security patch'
    }

    Write-Host 'Password: enter the password for LOCAL postgres only (never the Supabase password).'
    $secret = Read-Host 'LOCAL postgres password' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr = [IntPtr]::Zero

    Write-Host '=== VERIFY LOCAL SERVER IDENTITY ==='
    $query = "SELECT current_setting('data_directory') || '|' || current_setting('port') || '|' || current_setting('listen_addresses') || '|' || (current_setting('server_version_num')::int / 10000)::text || '|' || current_setting('server_encoding');"
    $identity = & $psql -h $hostAddress -p $port -U postgres -d postgres -X -At -v ON_ERROR_STOP=1 -c $query
    Assert-Exit 'Local server verification'
    $identity = ($identity -join '').Trim().Replace('\', '/').ToLowerInvariant()
    $expected = 'c:/program files/postgresql/17-ironleaguetest/data|55432|127.0.0.1|17|utf8'
    if ($identity -ne $expected) { throw "STOP: unexpected server identity: $identity" }
    Write-Host 'Verified isolated PostgreSQL 17 at 127.0.0.1:55432.'

    $existing = & $psql -h $hostAddress -p $port -U postgres -d postgres -X -At -v ON_ERROR_STOP=1 -c "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '$db');"
    Assert-Exit 'Database existence check'
    if ($resume) {
        if (($existing -join '').Trim() -ne 't') {
            throw "STOP: resume database does not exist: $db"
        }
        Write-Host "=== RESUME RETAINED DISPOSABLE DATABASE: $db ==="
        # A v1 run failed at the first unauthorised INSERT. Only resume when
        # migration/mock are intact AND there are no partial test fixtures.
        # Other failures require a fresh disposable database, not a reset.
        $resumeSql = @'
SELECT
  current_database() LIKE 'il_smoke_%'
  AND (SELECT count(*) FROM public.il_legacy_players) = EXPECTED_LEGACY_COUNT
  AND to_regclass('auth.identities') IS NOT NULL
  AND to_regprocedure('public.admin_approve_new_player_profile(uuid,text,text[],text[])') IS NOT NULL
  AND (SELECT count(*) FROM auth.identities) = 5
  AND (SELECT count(*) FROM public.player_profiles) = 0
  AND (SELECT count(*) FROM public.player_discord_links) = 0
  AND (SELECT count(*) FROM public.player_discord_link_requests) = 0
  AND (SELECT count(*) FROM public.player_profile_creation_requests) = 0;
'@
        $resumeSql = $resumeSql.Replace('EXPECTED_LEGACY_COUNT', [string]$playerCount)
        $clean = & $psql -h $hostAddress -p $port -U postgres -d $db -X -At -v ON_ERROR_STOP=1 -c $resumeSql
        Assert-Exit 'Retained database integrity check'
        if (($clean -join '').Trim() -ne 't') {
            throw 'STOP: retained database is not a clean, migrated v1 test database'
        }
        $created = $true
        Write-Host 'PASS: retained local database is safe to resume; bootstrap and migration skipped.'
    } else {
        if (($existing -join '').Trim() -ne 'f') { throw "STOP: temporary database already exists: $db" }
        Write-Host "=== CREATE DISPOSABLE DATABASE: $db ==="
        & $createdb -h $hostAddress -p $port -U postgres -E UTF8 -T template0 $db
        Assert-Exit 'Create ephemeral database'
        $created = $true

        Write-Host '=== BOOTSTRAP LOCAL SUPABASE AUTH MOCK ==='
        & $psql -h $hostAddress -p $port -U postgres -d $db -X -v ON_ERROR_STOP=1 -P pager=off -f $bootstrap
        Assert-Exit 'Local auth bootstrap'

        Write-Host '=== APPLY REVIEWED MIGRATION TO EPHEMERAL DATABASE ONLY ==='
        & $psql -h $hostAddress -p $port -U postgres -d $db -X -v ON_ERROR_STOP=1 -P pager=off -f $prepared
        Assert-Exit 'SQL migration'
    }

    Write-Host '=== RUN SECURITY / RLS / APPROVAL INTEGRATION TESTS ==='
    & $psql -h $hostAddress -p $port -U postgres -d $db -X -v ON_ERROR_STOP=1 -P pager=off -f $verify
    Assert-Exit 'SQL integration tests'

    Write-Host '=== RUN PARALLEL CROSS-TYPE REQUEST RACE TEST ==='
    $raceTest = Join-Path $kitDir '04-concurrent-requests.ps1'
    if (-not (Test-Path -LiteralPath $raceTest -PathType Leaf)) { throw 'Race test script missing' }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $raceTest -Database $db
    Assert-Exit 'Concurrent pending request test'

    $finished = $true
    Write-Host 'ALL LOCAL INTEGRATION TESTS PASSED.' -ForegroundColor Green
    if (-not $KeepDatabase) {
        if ($db -notmatch '^il_smoke_[0-9]{8}_[0-9]{6}_[0-9a-f]{8}$') {
            throw 'Refusing cleanup: unexpected disposable database name'
        }
        Write-Host "=== REMOVE ONLY DISPOSABLE DATABASE $db ==="
        & $dropdb -h $hostAddress -p $port -U postgres --maintenance-db postgres $db
        Assert-Exit 'Drop disposable database'
        $created = $false
        Write-Host 'Disposable test database removed; iron_league_sql_test unchanged.'
    } else {
        Write-Host "Retained disposable database as explicitly requested: $db"
    }
    Write-Host 'No Production Supabase, Vercel, Git commits/pushes or application flags were changed.'
}
catch {
    Write-Host "TEST STOPPED: $($_.Exception.Message)" -ForegroundColor Red
    if ($created) {
        Write-Host "For investigation, disposable local database retained: $db" -ForegroundColor Yellow
        Write-Host 'Do not drop any database manually until the failure has been reviewed.'
    }
    throw
}
finally {
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($null -ne $oldPassword) { $env:PGPASSWORD = $oldPassword }
    else { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    $secret = $null
}
