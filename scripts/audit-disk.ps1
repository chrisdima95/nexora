# One-off disk audit for this repo (safe read-only)
param(
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

function Get-DirBytes {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return 0 }
  $sum = (
    Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum
  ).Sum
  if ($null -eq $sum) { return 0 }
  return [long]$sum
}

Write-Host "Root: $Root"
$total = Get-DirBytes $Root
Write-Host ("Total (all files under root): {0:N2} MB" -f ($total / 1MB))
Write-Host ""

Write-Host "=== Top-level directories (MB) ==="
Get-ChildItem -LiteralPath $Root -Directory -Force -ErrorAction SilentlyContinue | ForEach-Object {
  $name = $_.Name
  $full = $_.FullName
  $b = Get-DirBytes $full
  [PSCustomObject]@{ Name = $name; MB = [math]::Round($b / 1MB, 2); Bytes = $b }
} | Sort-Object Bytes -Descending | Format-Table -AutoSize

$keys = @(
  'node_modules', 'dist', '.angular', 'coverage', '.pytest_cache', '.cache',
  'public', 'src', 'backend', 'backend/.venv', '.venv', 'venv', '.git'
)
Write-Host "=== Key paths ==="
foreach ($k in $keys) {
  $p = Join-Path $Root $k
  $b = Get-DirBytes $p
  Write-Host ("{0,-20} {1,12:N2} MB" -f $k, ($b / 1MB))
}

Write-Host ""
Write-Host "=== Largest files (top 35, excluding node_modules) ==="
Get-ChildItem -LiteralPath $Root -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
  Sort-Object Length -Descending |
  Select-Object -First 35 @{N='MB';E={[math]::Round($_.Length/1MB,2)}}, @{N='Path';E={$_.FullName}} |
  Format-Table -AutoSize

Write-Host ""
Write-Host "=== public/ largest images (top 20) ==="
$pub = Join-Path $Root 'public'
if (Test-Path -LiteralPath $pub) {
  Get-ChildItem -LiteralPath $pub -Recurse -Force -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '\.(jpe?g|png|webp|gif|svg|avif)$' } |
    Sort-Object Length -Descending |
    Select-Object -First 20 @{N='MB';E={[math]::Round($_.Length/1MB,2)}}, Name |
    Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== backend db / sqlite ==="
Get-ChildItem -LiteralPath (Join-Path $Root 'backend') -Recurse -Force -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in '.sqlite3','.db','.sql' -or $_.Name -match 'sqlite' } |
  Select-Object @{N='MB';E={[math]::Round($_.Length/1MB,2)}}, FullName |
  Format-Table -AutoSize
