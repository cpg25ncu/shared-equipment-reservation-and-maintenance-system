param([Parameter(Mandatory=$true)][string]$PostgresBin)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$run = Join-Path $repo ('.cache/issue6-fresh-' + [guid]::NewGuid().ToString('N').Substring(0, 10))
$data = Join-Path $run 'pg'
$pg = (Resolve-Path -LiteralPath $PostgresBin).Path
$jar = Join-Path $repo 'app/target/serms-0.1.0-SNAPSHOT.jar'
if (!(Test-Path -LiteralPath $jar)) { throw 'Build the backend JAR first.' }
New-Item -ItemType Directory -Force $run | Out-Null
function FreePort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
  return $port
}
$dbPort = FreePort
$appPort = FreePort
$old = @{}
foreach ($key in @('SERMS_DB_URL','SERMS_DB_USER','SERMS_DB_PASSWORD','SPRING_PROFILES_ACTIVE',
    'SERVER_ADDRESS','SERVER_PORT','SERMS_LOCAL_DEMO_PASSWORD','SPRING_FLYWAY_TARGET')) {
  $old[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
$backend = $null
$started = $false
function Query([string]$sql) {
  $result = & (Join-Path $pg 'psql.exe') -h 127.0.0.1 -p $dbPort -U serms_fresh -d serms_local_demo -tA -v ON_ERROR_STOP=1 -c $sql
  if ($LASTEXITCODE -ne 0) { throw 'Fresh database query failed.' }
  return ($result -join '').Trim()
}
function Seed([string]$log) {
  $preference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & (Join-Path $pg 'psql.exe') -h 127.0.0.1 -p $dbPort -U serms_fresh -d serms_local_demo -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'demo-data.sql') *> (Join-Path $run $log)
    $exitCode = $LASTEXITCODE
  } finally { $ErrorActionPreference = $preference }
  if ($exitCode -ne 0) { throw "Seed failed: $log" }
}
# Use the JDK's own java.exe: the Oracle "javapath" launcher on PATH starts the JVM as a child
# process, so stopping the launcher's PID would leave the backend running.
$java = if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  Join-Path $env:JAVA_HOME 'bin\java.exe' } else { (Get-Command java.exe).Source }
function StartBackend([string]$name) {
  $process = Start-Process -FilePath $java -ArgumentList @('-jar', ('"' + $jar + '"')) -WorkingDirectory $repo -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run "backend-$name.log") -RedirectStandardError (Join-Path $run "backend-$name.err")
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    if ($process.HasExited) { throw 'The fresh database backend exited during startup.' }
    try {
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/v1/health" -TimeoutSec 2
      if ($health.status -eq 'UP') { return $process }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  throw 'Fresh database backend did not become healthy.'
}
try {
  & (Join-Path $pg 'initdb.exe') -D $data -U serms_fresh -A trust --encoding=UTF8 --locale=C *> (Join-Path $run 'initdb.log')
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }
  $start = Start-Process -FilePath (Join-Path $pg 'pg_ctl.exe') -ArgumentList @(
    '-D', ('"' + $data + '"'), '-l', ('"' + (Join-Path $run 'postgres.log') + '"'),
    '-o', ('"-h 127.0.0.1 -p ' + $dbPort + '"'), '-w', 'start'
  ) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $run 'start.log') -RedirectStandardError (Join-Path $run 'start.err')
  if (-not $start.WaitForExit(30000)) { throw 'PostgreSQL startup timed out.' }
  & (Join-Path $pg 'pg_ctl.exe') -D $data status *> (Join-Path $run 'status.log')
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed.' }
  $started = $true
  $env:SERMS_DB_URL = "jdbc:postgresql://127.0.0.1:$dbPort/serms_local_demo?currentSchema=serms,public"
  $env:SERMS_DB_USER = 'serms_fresh'
  $env:SERMS_DB_PASSWORD = ''
  $env:SPRING_PROFILES_ACTIVE = 'local'
  $env:SERVER_ADDRESS = '127.0.0.1'
  $env:SERVER_PORT = "$appPort"
  $env:SERMS_LOCAL_DEMO_PASSWORD = [guid]::NewGuid().ToString('N')
  # session_version (V007) is excluded from the row snapshot so the same query compares a V006
  # database with its upgraded V007 state; its values are checked separately.
  $snapshot = "SELECT json_build_object('users',(SELECT json_agg(to_jsonb(u) - 'session_version' ORDER BY user_id) FROM serms.app_user u),'roles',(SELECT json_agg(to_jsonb(ur) ORDER BY user_id,role_id) FROM serms.user_role ur),'equipment',(SELECT json_agg(to_jsonb(e) ORDER BY equipment_id) FROM serms.equipment e),'categories',(SELECT json_agg(to_jsonb(c) ORDER BY name) FROM serms.equipment_category c))::text"
  $history = "SELECT count(*) || ':' || max(version::int) FROM public.serms_flyway_history WHERE success AND version IS NOT NULL"
  $sessions = "SELECT count(*) || ':' || count(*) FILTER (WHERE session_version = 0) FROM serms.app_user"
  function StopBackend {
    Stop-Process -Id $backend.Id -Force
    if (-not $backend.WaitForExit(15000)) { throw 'The backend did not stop.' }
    $stillServing = $true
    try { Invoke-RestMethod -Uri "http://127.0.0.1:$appPort/api/v1/health" -TimeoutSec 2 | Out-Null } catch { $stillServing = $false }
    if ($stillServing) { throw 'A backend is still serving after stop; the restart check would not be real.' }
  }

  # 1. Fresh start: an empty database migrates V001-V007 with the application's real Flyway configuration.
  & (Join-Path $pg 'createdb.exe') -h 127.0.0.1 -p $dbPort -U serms_fresh serms_local_demo
  if ($LASTEXITCODE -ne 0) { throw 'createdb failed.' }
  $backend = StartBackend 'fresh'
  $migrations = Query $history
  if ($migrations -ne '7:7') { throw "Unexpected Flyway history on a fresh database: $migrations" }
  Seed 'seed-first.log'
  $before = Query $snapshot
  $masterData = Query "SELECT count(*) || ':' || count(DISTINCT serial_number) || ':' || count(*) FILTER (WHERE status='RETIRED' AND condition='POOR') FROM serms.equipment"
  if ($masterData -ne '8:8:1') { throw "Unexpected V005 equipment data: $masterData" }
  if ((Query $sessions) -ne '6:6') { throw 'Fresh demo accounts do not start at session version 0.' }
  Seed 'seed-repeat.log'
  if ((Query $snapshot) -ne $before) { throw 'Repeated seed changed the fresh database.' }
  StopBackend
  $backend = StartBackend 'fresh-restart'
  if ((Query $snapshot) -ne $before) { throw 'Restart changed the fresh database.' }
  if ((Query $sessions) -ne '6:6') { throw 'Restart changed session versions.' }
  Write-Output 'PASS fresh V001-V007 Flyway, V005 seed, repeat seed and backend restart'
  StopBackend

  # 2. Upgrade with data: migrate only to V006, seed, then let the application apply V007.
  & (Join-Path $pg 'dropdb.exe') -h 127.0.0.1 -p $dbPort -U serms_fresh --force serms_local_demo
  if ($LASTEXITCODE -ne 0) { throw 'dropdb failed.' }
  & (Join-Path $pg 'createdb.exe') -h 127.0.0.1 -p $dbPort -U serms_fresh serms_local_demo
  if ($LASTEXITCODE -ne 0) { throw 'createdb failed.' }
  $env:SPRING_FLYWAY_TARGET = '6'
  $backend = StartBackend 'upgrade-v006'
  $migrations = Query $history
  if ($migrations -ne '6:6') { throw "Flyway target 6 produced: $migrations" }
  Seed 'seed-v006.log'
  $before = Query $snapshot
  StopBackend
  # Remove the variable itself: under PowerShell 7 a .NET null assignment can leave an empty value
  # that the child JVM still sees, and Flyway rejects an empty target.
  Remove-Item -LiteralPath Env:SPRING_FLYWAY_TARGET -ErrorAction SilentlyContinue
  $backend = StartBackend 'upgrade-v007'
  $migrations = Query $history
  if ($migrations -ne '7:7') { throw "Upgrade did not reach V007: $migrations" }
  if ((Query $snapshot) -ne $before) { throw 'The V007 upgrade changed existing users, roles, equipment or categories.' }
  if ((Query $sessions) -ne '6:6') { throw 'Upgraded accounts do not start at session version 0.' }
  Seed 'seed-after-upgrade.log'
  if ((Query $snapshot) -ne $before) { throw 'Seeding after the upgrade changed existing data.' }
  Write-Output "PASS V006-to-V007 upgrade with demo data preserved and session versions 0. Evidence: $run"
} finally {
  if ($backend -and !$backend.HasExited) { Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue }
  if ($started) { & (Join-Path $pg 'pg_ctl.exe') -D $data -m fast -w stop | Out-Null }
  foreach ($key in $old.Keys) {
    if ($null -eq $old[$key]) { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
    else { Set-Item -LiteralPath "Env:$key" -Value $old[$key] }
  }
}
