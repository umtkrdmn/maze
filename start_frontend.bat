@echo off
REM 3D Maze Game - Frontend Başlatma Scripti (Windows)
REM Frontend Start Script (Windows)

echo =========================================
echo 3D Maze Game - Frontend
echo =========================================
echo.

REM Ana dizine git
cd /d "%~dp0"

REM Python versiyonu kontrol et
python --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Python bulunamadı! Python kurulu olmalı.
    pause
    exit /b 1
)

echo Frontend başlatılıyor...
echo.
echo Oyun: http://localhost:7080
echo.
echo Durdurmak için Ctrl+C kullanın
echo.

REM Python HTTP sunucusu başlat
python -m http.server 7080
