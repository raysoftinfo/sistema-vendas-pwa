@echo off
title Controle Doces
cd /d "%~dp0"

echo.
echo  Controle Doces - Iniciando...
echo  (build do frontend + servidor - aguarde)
echo.

start "Controle Doces - Servidor" cmd /k "npm run dev"
timeout /t 10 /nobreak >nul
start http://localhost:3333

echo.
echo  Navegador aberto em http://localhost:3333
echo  Nao feche a janela do servidor.
echo.
pause
