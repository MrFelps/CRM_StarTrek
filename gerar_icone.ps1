Add-Type -AssemblyName System.Drawing

$icoPath = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente\crm_icon.ico"

$bmp = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Fundo circular grafite fosco
$brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(26, 26, 30))
$g.FillEllipse($brushBg, 1, 1, 30, 30)

# Borda esbranquiçada sutil
$penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 180, 190)), 1.8
$g.DrawEllipse($penBorder, 1, 1, 30, 30)

# Texto "CRM" centralizado
$font = New-Object System.Drawing.Font "Segoe UI", 8.5, [System.Drawing.FontStyle]::Bold
$brushText = [System.Drawing.Brushes]::White
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 1, 32, 32
$g.DrawString("CRM", $font, $brushText, $rect, $sf)

# Salva como ícone
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()
$icon.Dispose()
$bmp.Dispose()

Write-Host "ICONE_GERADO_COM_SUCESSO"
