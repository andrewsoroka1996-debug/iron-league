#Requires -Version 5.1
<#
  LOCAL ONLY. Two PostgreSQL sessions attempt different types of pending
  requests concurrently for the same fake auth user. The first stays in an
  open transaction while the second must block and fail at the shared PK.
  Only invoke from run-local-tests.ps1 on a disposable il_smoke_* database.
#>
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Database)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$psql = 'C:\Program Files\PostgreSQL\17-IronLeagueTest\bin\psql.exe'
$hostName = '127.0.0.1'
$port = '55432'
if ($Database -cnotmatch '^il_smoke_[0-9]{8}_[0-9]{6}_[0-9a-f]{8}$') {
  throw 'STOP: concurrent test only accepts disposable il_smoke_* database'
}
if (-not (Test-Path -LiteralPath $psql -PathType Leaf)) { throw 'Local psql missing' }
if ([string]::IsNullOrEmpty($env:PGPASSWORD)) { throw 'STOP: local postgres password not provided' }

# Independent check so the script cannot accidentally connect to Production.
$probe = & $psql -h $hostName -p $port -U postgres -d $Database -X -At -v ON_ERROR_STOP=1 -c "SELECT current_database() || '|' || current_setting('data_directory') || '|' || current_setting('listen_addresses');"
if ($LASTEXITCODE -ne 0) { throw 'STOP: database identity query failed' }
$actual = (($probe -join '').Trim().Replace('\','/')).ToLowerInvariant()
$expected = ($Database + '|C:/Program Files/PostgreSQL/17-IronLeagueTest/data|127.0.0.1').ToLowerInvariant()
if ($actual -cne $expected) { throw "STOP: wrong database or server: $actual" }

$uid = '33333333-3333-4333-8333-333333333333'
$checkSql = "SELECT NOT EXISTS(SELECT 1 FROM public.il_pending_player_request_slots WHERE auth_user_id='$uid') AND NOT EXISTS(SELECT 1 FROM public.player_discord_link_requests WHERE auth_user_id='$uid') AND NOT EXISTS(SELECT 1 FROM public.player_profile_creation_requests WHERE auth_user_id='$uid');"
$clean = & $psql -h $hostName -p $port -U postgres -d $Database -X -At -v ON_ERROR_STOP=1 -c $checkSql
if ($LASTEXITCODE -ne 0 -or (($clean -join '').Trim() -ne 't')) {
  throw 'STOP: concurrency test identity already has requests'
}

$dir = Join-Path $env:TEMP ('il-sql-race-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $dir -ErrorAction Stop | Out-Null
$scriptA = Join-Path $dir 'first.sql'
$scriptB = Join-Path $dir 'second.sql'
$firstSql = @'
\set ON_ERROR_STOP on
SET application_name='il_sql_race_first';
SET ROLE authenticated;
SET request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
BEGIN;
INSERT INTO public.player_discord_link_requests(auth_user_id,player_id)
 VALUES ('33333333-3333-4333-8333-333333333333','andrew-sm');
SELECT pg_sleep(12);
COMMIT;
'@
$secondSql = @'
\set ON_ERROR_STOP on
SET application_name='il_sql_race_second';
SET ROLE authenticated;
SET request.jwt.claim.sub='33333333-3333-4333-8333-333333333333';
INSERT INTO public.player_profile_creation_requests(auth_user_id,desired_nickname)
 VALUES ('33333333-3333-4333-8333-333333333333','RaceParallelSQL');
'@
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText($scriptA, $firstSql, $utf8NoBom)
[IO.File]::WriteAllText($scriptB, $secondSql, $utf8NoBom)

$jobA = $null
$jobB = $null
try {
  $jobCode = {
    param([string]$exe,[string]$database,[string]$file)
    $ErrorActionPreference = 'Continue'
    $output = & $exe -h '127.0.0.1' -p '55432' -U 'postgres' -d $database -X -v ON_ERROR_STOP=1 -P pager=off -f $file 2>&1
    return @{ Code = $LASTEXITCODE; Output = ($output | Out-String) }
  }
  $jobA = Start-Job -ScriptBlock $jobCode -ArgumentList @($psql,$Database,$scriptA)
  $ready = $false
  for ($i = 0; $i -lt 35; $i++) {
    Start-Sleep -Milliseconds 200
    $state = & $psql -h $hostName -p $port -U postgres -d $Database -X -At -v ON_ERROR_STOP=1 -c "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='il_sql_race_first' AND state='active' AND query LIKE '%pg_sleep%');"
    if ($LASTEXITCODE -ne 0) { throw 'STOP: cannot observe concurrent first session' }
    if ((($state -join '').Trim()) -eq 't') { $ready = $true; break }
  }
  if (-not $ready) { throw 'STOP: first transaction not confirmed active' }
  $jobB = Start-Job -ScriptBlock $jobCode -ArgumentList @($psql,$Database,$scriptB)
  $blocked = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 200
    $state = & $psql -h $hostName -p $port -U postgres -d $Database -X -At -v ON_ERROR_STOP=1 -c "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='il_sql_race_second' AND wait_event_type='Lock');"
    if ($LASTEXITCODE -ne 0) { throw 'STOP: cannot observe concurrent second session' }
    if ((($state -join '').Trim()) -eq 't') { $blocked = $true; break }
  }
  if (-not $blocked) { throw 'STOP: second session was not observed blocked by first transaction' }
  $done = @(Wait-Job -Job @($jobA,$jobB) -Timeout 35)
  if ($done.Count -ne 2) { throw 'STOP: concurrent test sessions timed out' }
  $a = Receive-Job $jobA
  $b = Receive-Job $jobB
  if ($a.Code -ne 0) { throw "First request failed unexpectedly: $($a.Output)" }
  if ($b.Code -eq 0 -or $b.Output -notmatch 'il_pending_player_request_slots_pkey') {
    throw "STOP: second conflicting request not rejected by shared unique constraint: $($b.Output)"
  }
  $check = & $psql -h $hostName -p $port -U postgres -d $Database -X -At -v ON_ERROR_STOP=1 -c "SELECT (SELECT count(*) FROM public.player_discord_link_requests WHERE auth_user_id='$uid' AND status='pending')=1 AND (SELECT count(*) FROM public.player_profile_creation_requests WHERE auth_user_id='$uid')=0 AND (SELECT count(*) FROM public.il_pending_player_request_slots WHERE auth_user_id='$uid' AND request_kind='link')=1;"
  if ($LASTEXITCODE -ne 0 -or (($check -join '').Trim()) -ne 't') {
    throw 'STOP: concurrent requests left invalid state'
  }
  Write-Host 'PASS: concurrent cross-type requests serialized; second blocked then rejected; one pending slot persists'
} finally {
  foreach ($j in @($jobA,$jobB)) {
    if ($null -ne $j) {
      if ($j.State -eq 'Running') { Stop-Job -Job $j -ErrorAction SilentlyContinue }
      Remove-Job -Job $j -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
}
