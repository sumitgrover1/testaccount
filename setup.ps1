<#
  One-shot local setup for the Clinic Management Platform (backend +
  admin panel + public website). Run this from the repo root:

      powershell -ExecutionPolicy Bypass -File .\setup.ps1

  It generates real secrets, writes all three .env files, installs
  dependencies, runs Prisma migrations + the admin seed script + a starter
  treatment/package catalog seed + starter blog article seeds (general +
  skin-focused), and opens each app's dev server in its own window. Safe
  to re-run — it never overwrites an .env file that already exists.

  Only edit the -DbUser / -DbPassword / -DbHost / -DbPort parameters below
  (or pass them on the command line) if your MySQL isn't the default
  root/root on localhost:3306 — nothing else needs manual editing.
#>
param(
  [string]$DbHost = 'localhost',
  [string]$DbPort = '3306',
  [string]$DbUser = 'root',
  [string]$DbPassword = 'root',
  [string]$DbName = 'clinic_db',
  [string]$SeedAdminEmail = 'admin@clinic.local',
  [string]$SeedAdminPassword = 'ChangeMe123!Now'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot

function New-Secret {
  $bytes = New-Object byte[] 64
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $_.ToString('x2') })
}

function Write-EnvFile($Path, $Content) {
  if (Test-Path $Path) {
    Write-Host "  Skipping $Path (already exists)" -ForegroundColor Yellow
    return
  }
  Set-Content -Path $Path -Value $Content -NoNewline
  Write-Host "  Wrote $Path" -ForegroundColor Green
}

Write-Host "`n=== 1/8: Writing .env files ===" -ForegroundColor Cyan

$databaseUrl = "mysql://${DbUser}:${DbPassword}@${DbHost}:${DbPort}/${DbName}"
$accessSecret = New-Secret
$refreshSecret = New-Secret
$cookieSecret = New-Secret

$backendEnv = @"
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
TRUST_PROXY=false

DATABASE_URL="$databaseUrl"

REDIS_URL=

JWT_ACCESS_SECRET=$accessSecret
JWT_REFRESH_SECRET=$refreshSecret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=clinic-backend
JWT_AUDIENCE=clinic-clients

COOKIE_SECRET=$cookieSecret

ACCOUNT_LOCKOUT_THRESHOLD=5
ACCOUNT_LOCKOUT_DURATION_MINUTES=15
PASSWORD_RESET_TOKEN_TTL_MINUTES=30

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10

PRICING_MAX_UNAPPROVED_DISCOUNT_PERCENT=15

MARKETING_WEBHOOK_SECRET_FACEBOOK=
MARKETING_WEBHOOK_SECRET_GOOGLE=

LOG_LEVEL=info
SEED_ADMIN_EMAIL=$SeedAdminEmail
SEED_ADMIN_PASSWORD=$SeedAdminPassword
"@
Write-EnvFile "$RepoRoot\.env" $backendEnv

$frontendEnv = "NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`n"
Write-EnvFile "$RepoRoot\frontend\.env.local" $frontendEnv

$websiteEnv = "NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`n"
Write-EnvFile "$RepoRoot\website\.env.local" $websiteEnv

Write-Host "`n=== 2/8: Installing dependencies (backend, frontend, website) ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npm install
Pop-Location

Push-Location "$RepoRoot\frontend"
npm install
Pop-Location

Push-Location "$RepoRoot\website"
npm install
Pop-Location

Write-Host "`n=== 3/8: Running Prisma migrations ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npx prisma migrate dev --name init
Pop-Location

Write-Host "`n=== 4/8: Seeding first Super Admin account ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npm run prisma:seed
Pop-Location

Write-Host "`n=== 5/8: Seeding treatment + package catalog ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npm run prisma:seed:catalog
Pop-Location

Write-Host "`n=== 6/8: Seeding starter blog articles ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npm run prisma:seed:blog
Pop-Location

Write-Host "`n=== 7/8: Seeding skin-focused blog articles ===" -ForegroundColor Cyan
Push-Location $RepoRoot
npm run prisma:seed:blog:skin
Pop-Location

Write-Host "`n=== 8/8: Launching dev servers in new windows ===" -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$RepoRoot'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$RepoRoot\frontend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$RepoRoot\website'; npm run dev"

Write-Host "`nAll set. Three windows just opened:" -ForegroundColor Green
Write-Host "  Backend:     http://localhost:3000  (API under /api/v1)"
Write-Host "  Admin panel: http://localhost:3001   -> log in with $SeedAdminEmail / $SeedAdminPassword"
Write-Host "  Website:     http://localhost:3002"
Write-Host "`nChange the admin password after your first login if you used the default." -ForegroundColor Yellow
