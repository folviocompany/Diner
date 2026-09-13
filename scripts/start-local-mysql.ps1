$ErrorActionPreference = 'Stop'
$taskWorkspace = Split-Path -Parent $PSScriptRoot
$taskBasePath = Join-Path $taskWorkspace '.local\mysql\mysql-8.4.9-winx64'
$taskDataPath = Join-Path $taskWorkspace '.local\mysql-data'
$taskPidPath = Join-Path $taskWorkspace '.local\mysql.pid'
if (-not (Test-Path -LiteralPath "$taskBasePath\bin\mysqld.exe")) {
  throw 'MySQL portátil não encontrado. Use docker compose up -d --wait ou configure DATABASE_URL para seu MySQL.'
}
$taskBasePath = (Resolve-Path -LiteralPath $taskBasePath).Path
$taskDataPath = (Resolve-Path -LiteralPath $taskDataPath).Path
if (Test-Path -LiteralPath $taskPidPath) {
  $taskMysqlPid = [int](Get-Content -LiteralPath $taskPidPath)
  $taskExisting = Get-Process -Id $taskMysqlPid -ErrorAction SilentlyContinue
  if ($taskExisting -and $taskExisting.Path -eq "$taskBasePath\bin\mysqld.exe") {
    Write-Output 'MySQL local já está ativo em 127.0.0.1:3307.'
    exit 0
  }
}
$taskMysqlProcess = Start-Process -FilePath "$taskBasePath\bin\mysqld.exe" -ArgumentList @('--no-defaults', "--basedir=`"$taskBasePath`"", "--datadir=`"$taskDataPath`"", '--bind-address=127.0.0.1', '--port=3307', '--mysqlx=OFF', '--console') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskWorkspace '.local\mysql-out.log') -RedirectStandardError (Join-Path $taskWorkspace '.local\mysql-error.log')
$taskMysqlProcess.Id | Set-Content -LiteralPath $taskPidPath
Write-Output 'MySQL local iniciado em 127.0.0.1:3307. Consulte .local/mysql-error.log em caso de falha.'
