@echo off
title CRM Inteligente
cd /d "%~dp0"

:: Inicia o servidor Node em segundo plano
start /B "" node server/index.js

:: Aguarda 1 segundo
ping 127.0.0.1 -n 2 >nul 2>&1

:: Abre no Chrome em modo Janela Dedicada (App) ou navegador padrao
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3002
) else (
    start http://localhost:3002
)
exit
