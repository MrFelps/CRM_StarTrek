@echo off
title CRM Inteligente
cd /d "c:\Users\Adm\Desktop\repositorio\CRM_inteligente"

:: Inicia o servidor Node em segundo plano
start /B "" "C:\Program Files\nodejs\node.exe" server/index.js

:: Aguarda 1 segundo
ping 127.0.0.1 -n 2 >nul 2>&1

:: Abre no Chrome em modo Janela Dedicada (App) ou navegador padrao
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3001
) else (
    start http://localhost:3001
)
exit
