#!/bin/bash

# Region-Specific OCR Service 시작 스크립트
# 모든 서비스(Ollama, Backend, Frontend)를 시작합니다.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Region-Specific OCR Service 시작"
echo "=========================================="

# 로그 디렉토리 생성
mkdir -p logs

# 1. Ollama 서버 확인 및 시작
echo ""
echo "[1/3] Ollama 서버 확인 중..."
if ! pgrep -f "ollama serve" > /dev/null; then
    echo "Ollama 서버 시작 중..."
    nohup ollama serve > logs/ollama.log 2>&1 &
    OLLAMA_PID=$!
    echo "Ollama 서버 시작됨 (PID: $OLLAMA_PID)"
    sleep 3
else
    echo "Ollama 서버가 이미 실행 중입니다."
fi

# Ollama 서버가 정상적으로 응답하는지 확인
if ! ollama list > /dev/null 2>&1; then
    echo "경고: Ollama 서버가 응답하지 않습니다. 잠시 후 다시 시도합니다..."
    sleep 5
    if ! ollama list > /dev/null 2>&1; then
        echo "오류: Ollama 서버를 시작할 수 없습니다."
        exit 1
    fi
fi

# 모델 확인
echo "설치된 모델 확인 중..."
ollama list

# 2. Backend 시작
echo ""
echo "[2/3] Backend 서버 시작 중..."
cd backend

# 기존 프로세스 종료 (이미 실행 중인 경우)
if pgrep -f "uvicorn main:app" > /dev/null; then
    echo "기존 Backend 프로세스 종료 중..."
    pkill -f "uvicorn main:app" || true
    sleep 2
fi

# Backend 시작
nohup python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend 서버 시작됨 (PID: $BACKEND_PID)"
echo "Backend URL: http://localhost:8000"
echo "로그 파일: logs/backend.log"

# Backend가 시작될 때까지 대기
sleep 3
if ! curl -s http://localhost:8000/ > /dev/null; then
    echo "경고: Backend 서버가 아직 응답하지 않습니다."
else
    echo "Backend 서버가 정상적으로 시작되었습니다."
fi

cd ..

# 3. Frontend 시작
echo ""
echo "[3/3] Frontend 서버 시작 중..."
cd frontend

# 기존 프로세스 종료 (이미 실행 중인 경우)
if pgrep -f "next dev" > /dev/null; then
    echo "기존 Frontend 프로세스 종료 중..."
    pkill -f "next dev" || true
    sleep 2
fi

# Frontend 시작
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend 서버 시작됨 (PID: $FRONTEND_PID)"
echo "Frontend URL: http://localhost:3000"
echo "로그 파일: logs/frontend.log"

cd ..

# PID 파일 저장
echo "$OLLAMA_PID" > logs/ollama.pid
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid

echo ""
echo "=========================================="
echo "모든 서비스가 시작되었습니다!"
echo "=========================================="
echo ""
echo "서비스 정보:"
echo "  - Ollama: http://localhost:11434 (PID: $OLLAMA_PID)"
echo "  - Backend: http://localhost:8000 (PID: $BACKEND_PID)"
echo "  - Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "로그 파일:"
echo "  - Ollama: logs/ollama.log"
echo "  - Backend: logs/backend.log"
echo "  - Frontend: logs/frontend.log"
echo ""
echo "서비스 종료: ./stop.sh"
echo "서비스 상태 확인: ./status.sh"
echo ""


