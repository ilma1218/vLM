#!/bin/bash

# Region-Specific OCR Service 종료 스크립트
# 모든 서비스(Ollama, Backend, Frontend)를 종료합니다.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Region-Specific OCR Service 종료"
echo "=========================================="

# PID 파일에서 읽어서 종료
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Frontend 서버 종료 중... (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null || pkill -f "next dev"
        rm logs/frontend.pid
        echo "Frontend 서버가 종료되었습니다."
    else
        echo "Frontend 서버가 실행 중이 아닙니다."
        rm logs/frontend.pid
    fi
else
    # PID 파일이 없으면 프로세스 이름으로 종료
    if pgrep -f "next dev" > /dev/null; then
        echo "Frontend 서버 종료 중..."
        pkill -f "next dev"
        echo "Frontend 서버가 종료되었습니다."
    else
        echo "Frontend 서버가 실행 중이 아닙니다."
    fi
fi

if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "Backend 서버 종료 중... (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null || pkill -f "uvicorn main:app"
        rm logs/backend.pid
        echo "Backend 서버가 종료되었습니다."
    else
        echo "Backend 서버가 실행 중이 아닙니다."
        rm logs/backend.pid
    fi
else
    # PID 파일이 없으면 프로세스 이름으로 종료
    if pgrep -f "uvicorn main:app" > /dev/null; then
        echo "Backend 서버 종료 중..."
        pkill -f "uvicorn main:app"
        echo "Backend 서버가 종료되었습니다."
    else
        echo "Backend 서버가 실행 중이 아닙니다."
    fi
fi

# Ollama는 다른 프로세스에서도 사용할 수 있으므로 주의해서 종료
# (일반적으로 Ollama는 계속 실행하는 것을 권장)
echo ""
read -p "Ollama 서버도 종료하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f logs/ollama.pid ]; then
        OLLAMA_PID=$(cat logs/ollama.pid)
        if ps -p $OLLAMA_PID > /dev/null 2>&1; then
            echo "Ollama 서버 종료 중... (PID: $OLLAMA_PID)"
            kill $OLLAMA_PID 2>/dev/null || pkill -f "ollama serve"
            rm logs/ollama.pid
            echo "Ollama 서버가 종료되었습니다."
        else
            echo "Ollama 서버가 실행 중이 아닙니다."
            rm logs/ollama.pid
        fi
    else
        if pgrep -f "ollama serve" > /dev/null; then
            echo "Ollama 서버 종료 중..."
            pkill -f "ollama serve"
            echo "Ollama 서버가 종료되었습니다."
        else
            echo "Ollama 서버가 실행 중이 아닙니다."
        fi
    fi
else
    echo "Ollama 서버는 계속 실행됩니다."
fi

echo ""
echo "=========================================="
echo "서비스 종료 완료"
echo "=========================================="

