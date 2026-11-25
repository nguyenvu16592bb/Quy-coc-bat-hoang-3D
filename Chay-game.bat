@echo off
chcp 65001 >nul
title Mong Vo Lam 3D
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8080/index.html"
  echo Dang mo game tai http://localhost:8080/index.html ...
  echo (Giung cua so nay mo de choi. Bam Ctrl+C de tat.)
  python -m http.server 8080
) else (
  echo Khong tim thay Python trong PATH.
  echo Hay dung VS Code Live Server hoac: npx serve .
  pause
)
