@echo off
REM 3D Maze Game - Backend Başlatma Scripti (Windows)
REM Backend Start Script (Windows)

echo =========================================
echo 3D Maze Game - Backend
echo =========================================
echo.

REM Backend dizinine git
cd /d "%~dp0backend"

REM Python versiyonu kontrol et
echo Python versiyonu kontrol ediliyor...
python --version >nul 2>&1
if errorlevel 1 (
    echo HATA: Python bulunamadı! Python 3.11+ kurulu olmalı.
    pause
    exit /b 1
)

echo [OK] Python bulundu
echo.

REM Virtual environment kontrolü
if not exist "venv" (
    echo Virtual environment bulunamadı, oluşturuluyor...
    python -m venv venv
    echo [OK] Virtual environment oluşturuldu
) else (
    echo [OK] Virtual environment mevcut
)

REM Virtual environment aktif et
echo Virtual environment aktifleştiriliyor...
call venv\Scripts\activate.bat

REM Bağımlılıkları kontrol et
echo.
echo Bağımlılıklar kontrol ediliyor...
python check_setup.py >nul 2>&1
if errorlevel 1 (
    echo Bağımlılıklar eksik, yükleniyor...
    pip install -q -r requirements.txt
    echo [OK] Bağımlılıklar yüklendi
) else (
    echo [OK] Tüm bağımlılıklar mevcut
)

echo.
echo =========================================
echo Backend başlatılıyor...
echo =========================================
echo.
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo WebSocket: ws://localhost:8000/ws
echo.
echo Durdurmak için Ctrl+C kullanın
echo.

REM Backend'i başlat
python main.py
