Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' 1. Inicia o servidor Node.js silenciosamente em segundo plano
WshShell.Run "node server/index.js", 0, False

' 2. Aguarda 600ms para inicialização
WScript.Sleep 600

' 3. Abre no Google Chrome em modo Janela Dedicada (App) ou navegador padrao
Dim chromePath
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

If fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://localhost:3002", 1, False
Else
    WshShell.Run "http://localhost:3002", 1, False
End If
