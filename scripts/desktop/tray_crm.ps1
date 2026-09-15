Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$repoDir = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente"
Set-Location $repoDir

$appContext = New-Object System.Windows.Forms.ApplicationContext

# 1. Função ultra-rápida via Sockets para testar a porta 3001 do CRM
function Test-CrmPort {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", 3001, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(400, $false)
        if (-not $wait) {
            $tcp.Close()
            return $false
        }
        $tcp.EndConnect($iar)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Ensure-CrmServer {
    if (-not (Test-CrmPort)) {
        $nodeExe = "C:\Program Files\nodejs\node.exe"
        if (Test-Path $nodeExe) {
            Start-Process -FilePath $nodeExe -ArgumentList "server/index.js" -WorkingDirectory $repoDir -WindowStyle Hidden
        } else {
            Start-Process -FilePath "node" -ArgumentList "server/index.js" -WorkingDirectory $repoDir -WindowStyle Hidden
        }
        Start-Sleep -Milliseconds 700
    }
}

# Garante que o servidor está de pé
Ensure-CrmServer

# 2. Ação de Abertura do App no Chrome (Janela Dedicada App)
function Open-CrmApp {
    Ensure-CrmServer
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (Test-Path $chromePath) {
        Start-Process $chromePath -ArgumentList "--app=http://localhost:3001"
    } else {
        Start-Process "http://localhost:3001"
    }
}

# 3. Criação do NotifyIcon na bandeja (perto do relógio)
$notify = New-Object System.Windows.Forms.NotifyIcon

$icoPath = Join-Path $repoDir "crm_app.ico"
if (Test-Path $icoPath) {
    try {
        $notify.Icon = New-Object System.Drawing.Icon($icoPath)
    } catch {
        $notify.Icon = [System.Drawing.SystemIcons]::Application
    }
} else {
    $notify.Icon = [System.Drawing.SystemIcons]::Application
}

$notify.Text = "CRM Inteligente - Gestão Veicular"
$notify.Visible = $true

# 4. Eventos de Clique
$notify.add_MouseClick({
    param($sender, $e)
    if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        Open-CrmApp
    }
})

$notify.add_DoubleClick({
    param($sender, $e)
    Open-CrmApp
})

# 5. Menu com botão direito
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$openAppItem = $contextMenu.Items.Add("Abrir CRM Inteligente")
$openAppItem.Font = New-Object System.Drawing.Font($openAppItem.Font, [System.Drawing.FontStyle]::Bold)
$openAppItem.add_Click({ Open-CrmApp })

$openBrowserItem = $contextMenu.Items.Add("Abrir no Navegador Padrão")
$openBrowserItem.add_Click({ Start-Process "http://localhost:3001" })

[void]$contextMenu.Items.Add("-")

$restartItem = $contextMenu.Items.Add("Reiniciar Servidor (Porta 3001)")
$restartItem.add_Click({
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 600
    Ensure-CrmServer
    $notify.ShowBalloonTip(2000, "CRM Inteligente", "Servidor reiniciado com sucesso!", [System.Windows.Forms.ToolTipIcon]::Info)
})

[void]$contextMenu.Items.Add("-")

$exitItem = $contextMenu.Items.Add("Sair da Bandeja")
$exitItem.add_Click({
    $notify.Visible = $false
    $appContext.ExitThread()
    [System.Windows.Forms.Application]::Exit()
})

$notify.ContextMenuStrip = $contextMenu

# 6. Notificação Balão de Boas-Vindas
$notify.ShowBalloonTip(2500, "CRM Inteligente Ativo", "Clique no ícone perto do relógio para abrir o CRM a qualquer momento.", [System.Windows.Forms.ToolTipIcon]::Info)

# 7. Execução Contínua via ApplicationContext
[System.Windows.Forms.Application]::Run($appContext)
