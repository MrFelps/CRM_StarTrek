Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$logPath = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente\app_context_test.log"
"Starting..." | Out-File $logPath

$appContext = New-Object System.Windows.Forms.ApplicationContext

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Visible = $true
$notify.Text = "Teste App Context"

"Entering Application::Run..." | Out-File $logPath -Append
[System.Windows.Forms.Application]::Run($appContext)
"Exited Application::Run!" | Out-File $logPath -Append
