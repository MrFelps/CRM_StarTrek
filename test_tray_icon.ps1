Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$bmp = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Fundo cinza escuro elegante
$bgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24, 24, 27))
$g.FillEllipse($bgBrush, 1, 1, 29, 29)

# Borda esbranquiçada / prata
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 200, 210), 1.8)
$g.DrawEllipse($pen, 1, 1, 29, 29)

# Letra 'C' centralizada
$font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(245, 245, 247))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, 32, 32
$g.DrawString("C", $font, $textBrush, $rect, $sf)

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$icoPath = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente\crm_app.ico"
if (Test-Path $icoPath) { Remove-Item $icoPath -Force }
$fs = [System.IO.File]::OpenWrite($icoPath)
$icon.Save($fs)
$fs.Close()

Write-Host "ICON_SUCCESS: Width=$($icon.Width), Height=$($icon.Height), FileSaved=$(Test-Path $icoPath)"
