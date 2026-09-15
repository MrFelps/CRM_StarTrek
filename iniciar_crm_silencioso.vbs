Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "c:\Users\Adm\Desktop\repositorio\CRM_inteligente"

' 1. Inicia o servidor Node.js silenciosamente em segundo plano (se já estiver rodando, fecha sem erro)
Dim nodePath
nodePath = """C:\Program Files\nodejs\node.exe"""
WshShell.Run nodePath & " server/index.js", 0, False

' 2. Aguarda 600ms para inicialização
WScript.Sleep 600

' 3. Abre no Google Chrome em modo Janela Dedicada (App)
Dim chromePath
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

If fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://localhost:3001", 1, False
Else
    WshShell.Run "http://localhost:3001", 1, False
End If
