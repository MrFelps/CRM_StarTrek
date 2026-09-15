$WshShell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$startup = [Environment]::GetFolderPath("Startup")
$repoDir = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente"
$icoPath = Join-Path $repoDir "crm_app.ico"
$wscriptExe = "C:\Windows\System32\wscript.exe"

# 1. Atalho na Área de Trabalho - CRM Inteligente (Abre o App direto em janela limpa)
$mainShortcutPath = Join-Path $desktop "CRM Inteligente.lnk"
if (Test-Path $mainShortcutPath) { Remove-Item $mainShortcutPath -Force }

$shortcut = $WshShell.CreateShortcut($mainShortcutPath)
$shortcut.TargetPath = $wscriptExe
$shortcut.Arguments = "`"$repoDir\iniciar_crm_silencioso.vbs`""
$shortcut.WorkingDirectory = $repoDir
if (Test-Path $icoPath) {
    $shortcut.IconLocation = "$icoPath, 0"
}
$shortcut.Description = "CRM Inteligente - Gestão de Processos & Frotas"
$shortcut.Save()

# 2. Atalho na Área de Trabalho - Iniciar na Bandeja (Perto do Relógio)
$trayShortcutPath = Join-Path $desktop "CRM na Bandeja (Relógio).lnk"
if (Test-Path $trayShortcutPath) { Remove-Item $trayShortcutPath -Force }

$scTray = $WshShell.CreateShortcut($trayShortcutPath)
$scTray.TargetPath = $wscriptExe
$scTray.Arguments = "`"$repoDir\iniciar_bandeja_relogio.vbs`""
$scTray.WorkingDirectory = $repoDir
if (Test-Path $icoPath) {
    $scTray.IconLocation = "$icoPath, 0"
}
$scTray.Description = "Ativar CRM Inteligente na Bandeja do Sistema"
$scTray.Save()

# 3. Atalho na Inicialização Automática do Windows (shell:startup)
# Isso garante que sempre que ligar o computador, o ícone já estará lá perto do relógio!
$startupShortcutPath = Join-Path $startup "CRM_Inteligente_Bandeja.lnk"
if (Test-Path $startupShortcutPath) { Remove-Item $startupShortcutPath -Force }

$scStartup = $WshShell.CreateShortcut($startupShortcutPath)
$scStartup.TargetPath = $wscriptExe
$scStartup.Arguments = "`"$repoDir\iniciar_bandeja_relogio.vbs`""
$scStartup.WorkingDirectory = $repoDir
if (Test-Path $icoPath) {
    $scStartup.IconLocation = "$icoPath, 0"
}
$scStartup.Description = "Inicialização do CRM Inteligente na Bandeja"
$scStartup.Save()

Write-Host "ATALHOS_CONFIGURADOS_COM_SUCESSO"
Write-Host "Desktop: $mainShortcutPath"
Write-Host "Startup: $startupShortcutPath"
