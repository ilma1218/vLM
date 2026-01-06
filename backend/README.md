# Backend - Region-Specific OCR Service

FastAPI 기반 OCR 서비스 백엔드

## 설치

```bash
pip install -r requirements.txt
```

## 실행

```bash
uvicorn main:app --reload --port 8000
```

## API 엔드포인트

- `POST /ocr`: 크롭된 이미지 파일을 받아 OCR 수행
- `GET /history`: OCR 히스토리 조회

## 사전 요구사항

- Python 3.10+
- Ollama가 설치되어 있고 `qwen2.5vl:7b` 모델이 다운로드되어 있어야 합니다:
  ```bash
  ollama pull qwen2.5vl:7b
  ```

