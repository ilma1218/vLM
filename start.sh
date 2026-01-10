#!/bin/bash

# Region-Specific OCR Service 시작 스크립트
# 모든 서비스(Ollama, Backend, Frontend)를 시작합니다.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Region-Specific OCR Service 시작"
echo "=========================================="

# 로그 디렉토리 생성
mkdir -p logs

# Ollama 명령어가 있는지 확인
OLLAMA_AVAILABLE=false
if command -v ollama &> /dev/null; then
    OLLAMA_AVAILABLE=true
fi

# 1. Ollama 서버 확인 및 시작
echo ""
echo "[1/3] Ollama 서버 확인 중..."
OLLAMA_PID=""

if [ "$OLLAMA_AVAILABLE" = true ]; then
    if ! pgrep -f "ollama serve" > /dev/null; then
        echo "Ollama 서버 시작 중..."
        nohup ollama serve > logs/ollama.log 2>&1 &
        OLLAMA_PID=$!
        echo "Ollama 서버 시작됨 (PID: $OLLAMA_PID)"
        sleep 3
    else
        OLLAMA_PID=$(pgrep -f "ollama serve" | head -1)
        echo "Ollama 서버가 이미 실행 중입니다. (PID: $OLLAMA_PID)"
    fi

    # Ollama 서버가 정상적으로 응답하는지 확인
    if ! ollama list > /dev/null 2>&1; then
        echo "경고: Ollama 서버가 응답하지 않습니다. 잠시 후 다시 시도합니다..."
        sleep 5
        if ! ollama list > /dev/null 2>&1; then
            echo "경고: Ollama 서버를 시작할 수 없습니다. OCR 기능이 작동하지 않을 수 있습니다."
            echo "      Ollama를 설치하려면: curl -fsSL https://ollama.ai/install.sh | sh"
            OLLAMA_PID=""
        else
            echo "Ollama 서버가 정상적으로 시작되었습니다."
        fi
    else
        echo "Ollama 서버가 정상적으로 시작되었습니다."
    fi

    # 모델 확인 (Ollama가 정상 작동하는 경우에만)
    if [ -n "$OLLAMA_PID" ]; then
        echo "설치된 모델 확인 중..."
        ollama list || echo "경고: 모델 목록을 가져올 수 없습니다."
    fi
else
    echo "경고: Ollama가 설치되어 있지 않습니다. OCR 기능이 작동하지 않습니다."
    echo "      Ollama를 설치하려면: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "      모델 다운로드: ollama pull qwen2.5vl:7b"
fi

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
if [ -n "$OLLAMA_PID" ]; then
    echo "$OLLAMA_PID" > logs/ollama.pid
else
    echo "" > logs/ollama.pid
fi
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid

echo ""
echo "=========================================="
echo "서비스 시작 완료!"
echo "=========================================="
echo ""
echo "서비스 정보:"
if [ -n "$OLLAMA_PID" ]; then
    echo "  ✓ Ollama: http://localhost:11434 (PID: $OLLAMA_PID)"
else
    echo "  ✗ Ollama: 설치되지 않음 (OCR 기능 사용 불가)"
fi
echo "  ✓ Backend: http://localhost:8000 (PID: $BACKEND_PID)"
echo "  ✓ Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "로그 파일:"
if [ -n "$OLLAMA_PID" ]; then
    echo "  - Ollama: logs/ollama.log"
fi
echo "  - Backend: logs/backend.log"
echo "  - Frontend: logs/frontend.log"
echo ""
if [ "$OLLAMA_AVAILABLE" = false ] || [ -z "$OLLAMA_PID" ]; then
    echo "⚠️  참고: Ollama가 설치되어 있지 않거나 시작되지 않았습니다."
    echo "   OCR 기능을 사용하려면 Ollama를 설치하세요:"
    echo "   curl -fsSL https://ollama.ai/install.sh | sh"
    echo "   ollama pull qwen2.5vl:7b"
    echo ""
fi
echo "서비스 종료: ./stop.sh"
echo "서비스 상태 확인: ./status.sh"
echo ""


