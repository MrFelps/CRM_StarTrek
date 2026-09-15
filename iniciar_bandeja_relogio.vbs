Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente"

Dim psExe, scriptPath, cmd
psExe = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
scriptPath = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente\tray_crm.ps1"

cmd = Chr(34) & psExe & Chr(34) & " -NoProfile -ExecutionPolicy Bypass -File " & Chr(34) & scriptPath & Chr(34)

WshShell.Run cmd, 0, False
