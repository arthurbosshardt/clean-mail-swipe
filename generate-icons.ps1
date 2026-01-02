# Script PowerShell pour creer des icones PNG simples
# Necessite .NET Framework
# Encoding: UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$Size)
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    # Fond avec degrade (simulation avec couleur unie)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(102, 126, 234))
    $graphics.FillEllipse($brush, 2, 2, $Size - 4, $Size - 4)
    
    # Icone d'enveloppe (blanc)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $margin = [int]($Size * 0.15)
    $width = [int]($Size * 0.5)
    $height = [int]($Size * 0.35)
    $x = ($Size - $width) / 2
    $y = [int]($Size * 0.25)
    
    $graphics.FillRectangle($whiteBrush, $x, $y, $width, $height)
    
    # Ligne du haut
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(102, 126, 234), 2)
    $graphics.DrawLine($pen, $x, $y, $Size/2, $y + $height * 0.4)
    $graphics.DrawLine($pen, $Size/2, $y + $height * 0.4, $x + $width, $y)
    
    # X pour nettoyage
    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [int]($Size / 32))
    $crossSize = [int]($Size * 0.2)
    $crossX = [int]($Size * 0.7)
    $crossY = [int]($Size * 0.3)
    
    $graphics.DrawLine($whitePen, $crossX - $crossSize/2, $crossY - $crossSize/2, $crossX + $crossSize/2, $crossY + $crossSize/2)
    $graphics.DrawLine($whitePen, $crossX + $crossSize/2, $crossY - $crossSize/2, $crossX - $crossSize/2, $crossY + $crossSize/2)
    
    $graphics.Dispose()
    
    $bitmap.Save("icons\icon$Size.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    
    Write-Host "Icone icon$Size.png creee"
}

# Creer le dossier icons s'il n'existe pas
if (-not (Test-Path "icons")) {
    New-Item -ItemType Directory -Path "icons"
}

# Creer les icones
Create-Icon -Size 16
Create-Icon -Size 48
Create-Icon -Size 128

Write-Host "`nToutes les icones ont ete creees avec succes !"
