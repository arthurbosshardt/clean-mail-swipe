# Script de test pour verifier le manifest
# Encoding: UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Verification du manifest.json..." -ForegroundColor Cyan

# Verifier que le fichier existe
if (-not (Test-Path "manifest.json")) {
    Write-Host "ERREUR: manifest.json n'existe pas!" -ForegroundColor Red
    exit 1
}

# Verifier le JSON
try {
    $manifest = Get-Content "manifest.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "JSON valide" -ForegroundColor Green
    Write-Host "  Nom: $($manifest.name)" -ForegroundColor Yellow
    Write-Host "  Version: $($manifest.version)" -ForegroundColor Yellow
    Write-Host "  Manifest Version: $($manifest.manifest_version)" -ForegroundColor Yellow
} catch {
    Write-Host "ERREUR: JSON invalide - $_" -ForegroundColor Red
    exit 1
}

# Verifier les fichiers referencies
Write-Host "`nVerification des fichiers referencies..." -ForegroundColor Cyan

$files = @(
    "popup.html",
    "background.js",
    "content.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "OK: $file existe" -ForegroundColor Green
    } else {
        Write-Host "ERREUR: $file MANQUANT!" -ForegroundColor Red
    }
}

# Verifier le dossier styles
if (Test-Path "styles\popup.css") {
    Write-Host "OK: styles\popup.css existe" -ForegroundColor Green
} else {
    Write-Host "ERREUR: styles\popup.css MANQUANT!" -ForegroundColor Red
}

Write-Host "`nVerification terminee!" -ForegroundColor Cyan
Write-Host "`nChemin actuel: $(Get-Location)" -ForegroundColor Yellow
Write-Host "C'est ce dossier que vous devez selectionner dans Chrome!" -ForegroundColor Yellow
