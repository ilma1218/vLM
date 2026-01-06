#!/bin/bash

# Region-Specific OCR Service 상태 확인 스크립트

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Region-Specific OCR Service 상태"
echo "=========================================="
echo ""

# Ollama 상태
echo "[Ollama]"
if pgrep -f "ollama serve" > /dev/null; then
    OLLAMA_PID=$(pgrep -f "ollama serve" | head -1)
    echo "  상태: 실행 중 (PID: $OLLAMA_PID)"
    if ollama list > /dev/null 2>&1; then
        echo "  연결: 정상"
        echo "  설치된 모델:"
        ollama list | tail -n +2 | awk '{print "    - " $1}'
    else
        echo "  연결: 실패"
    fi
else
    echo "  상태: 중지됨"
fi
echo ""

# Backend 상태
echo "[Backend]"
if pgrep -f "uvicorn main:app" > /dev/null; then
    BACKEND_PID=$(pgrep -f "uvicorn main:app" | head -1)
    echo "  상태: 실행 중 (PID: $BACKEND_PID)"
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "  연결: 정상 (http://localhost:8000)"
    else
        echo "  연결: 실패"
    fi
else
    echo "  상태: 중지됨"
fi
echo ""

# Frontend 상태
echo "[Frontend]"
if pgrep -f "next dev" > /dev/null; then
    FRONTEND_PID=$(pgrep -f "next dev" | head -1)
    echo "  상태: 실행 중 (PID: $FRONTEND_PID)"
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "  연결: 정상 (http://localhost:3000)"
    else
        echo "  연결: 실패"
    fi
else
    echo "  상태: 중지됨"
fi
echo ""

# 로그 파일 정보
if [ -d logs ]; then
    echo "[로그 파일]"
    if [ -f logs/ollama.log ]; then
        echo "  Ollama: logs/ollama.log ($(wc -l < logs/ollama.log) lines)"
    fi
    if [ -f logs/backend.log ]; then
        echo "  Backend: logs/backend.log ($(wc -l < logs/backend.log) lines)"
    fi
    if [ -f logs/frontend.log ]; then
        echo "  Frontend: logs/frontend.log ($(wc -l < logs/frontend.log) lines)"
    fi
fi

echo ""
echo "=========================================="

