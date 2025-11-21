#!/bin/bash

# 3D Maze Game - Backend Başlatma Scripti
# Backend Start Script

set -e  # Exit on error

echo "========================================="
echo "3D Maze Game - Backend"
echo "========================================="
echo ""

# Backend dizinine git
cd "$(dirname "$0")/backend"

# Python versiyonunu kontrol et
echo "Python versiyonu kontrol ediliyor..."
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "HATA: Python $required_version veya üzeri gerekli (mevcut: $python_version)"
    exit 1
fi

echo "✓ Python $python_version kullanılıyor"
echo ""

# Virtual environment kontrolü
if [ ! -d "venv" ]; then
    echo "Virtual environment bulunamadı, oluşturuluyor..."
    python3 -m venv venv
    echo "✓ Virtual environment oluşturuldu"
else
    echo "✓ Virtual environment mevcut"
fi

# Virtual environment aktif et
echo "Virtual environment aktifleştiriliyor..."
source venv/bin/activate

# Bağımlılıkları kontrol et ve yükle
echo ""
echo "Bağımlılıklar kontrol ediliyor..."
if ! python check_setup.py > /dev/null 2>&1; then
    echo "Bağımlılıklar eksik, yükleniyor..."
    pip install -q -r requirements.txt
    echo "✓ Bağımlılıklar yüklendi"
else
    echo "✓ Tüm bağımlılıklar mevcut"
fi

echo ""
echo "========================================="
echo "Backend başlatılıyor..."
echo "========================================="
echo ""
echo "API: http://localhost:7000"
echo "Docs: http://localhost:7000/docs"
echo "WebSocket: ws://localhost:7000/ws"
echo ""
echo "Durdurmak için Ctrl+C kullanın"
echo ""

# Backend'i başlat
python main.py
