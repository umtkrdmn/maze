#!/bin/bash

# 3D Maze Game - Frontend Başlatma Scripti
# Frontend Start Script

set -e  # Exit on error

echo "========================================="
echo "3D Maze Game - Frontend"
echo "========================================="
echo ""

# Ana dizine git
cd "$(dirname "$0")"

# Port kontrolü
PORT=7080
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "UYARI: Port $PORT zaten kullanımda!"
    echo "Başka bir port kullanılacak..."
    PORT=7081
fi

echo "Frontend başlatılıyor..."
echo ""
echo "Oyun: http://localhost:$PORT"
echo ""
echo "Durdurmak için Ctrl+C kullanın"
echo ""

# Python HTTP sunucusu başlat
python3 -m http.server $PORT
