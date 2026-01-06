# 프로젝트 설정 가이드

## 빠른 시작

### 1. Ollama 설치 및 모델 다운로드

```bash
# Ollama 설치 (https://ollama.ai)
# Linux의 경우:
curl -fsSL https://ollama.ai/install.sh | sh

# 모델 다운로드
ollama pull llama3.2-vision
```

### 2. Backend 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

백엔드가 http://localhost:8000 에서 실행됩니다.

### 3. Frontend 실행

새 터미널에서:

```bash
cd frontend
npm install
npm run dev
```

프론트엔드가 http://localhost:3000 에서 실행됩니다.

## 문제 해결

### Ollama 연결 오류
- Ollama가 실행 중인지 확인: `ollama list`
- Ollama 서비스 시작: `ollama serve` (별도 터미널)

### PDF 렌더링 오류
- 브라우저 콘솔에서 PDF.js worker 오류 확인
- 필요시 `frontend/utils/pdfUtils.ts`의 worker URL 확인

### CORS 오류
- `backend/main.py`에서 CORS 설정 확인
- 프론트엔드 URL이 `http://localhost:3000`인지 확인

