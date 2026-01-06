# Region-Specific OCR Web Service

이미지나 PDF 파일에서 특정 영역을 선택하여 OCR(광학 문자 인식)을 수행하는 웹 서비스입니다.

## 프로젝트 구조

```
vLM/
├── backend/          # FastAPI 백엔드
│   ├── main.py       # FastAPI 애플리케이션
│   ├── database.py   # SQLite 데이터베이스 모델
│   └── requirements.txt
└── frontend/         # Next.js 14 프론트엔드
    ├── app/          # Next.js App Router
    ├── components/   # React 컴포넌트
    ├── utils/        # 유틸리티 함수
    └── package.json
```

## 기술 스택

### Backend
- Python 3.10+
- FastAPI
- SQLite + SQLAlchemy
- Ollama (Llama 3.2 Vision)

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- react-image-crop
- react-pdf

## 사전 요구사항

1. **Python 3.10+** 설치
2. **Node.js 18+** 설치
3. **Ollama** 설치 및 모델 다운로드:
   ```bash
   # Ollama 설치 (https://ollama.ai)
   ollama pull llama3.2-vision
   ```

## 설치 및 실행

### Backend 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

백엔드는 http://localhost:8000 에서 실행됩니다.

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

## 사용 방법

1. 프론트엔드 페이지에서 이미지 또는 PDF 파일을 업로드합니다.
2. 업로드된 이미지에서 드래그하여 OCR을 수행할 영역을 선택합니다.
3. "OCR 실행" 버튼을 클릭합니다.
4. 추출된 텍스트가 표시됩니다.
5. "History" 페이지에서 이전 OCR 기록을 확인할 수 있습니다.

## 주요 기능

- ✅ 이미지 파일 업로드 (JPG, PNG 등)
- ✅ PDF 파일 업로드 및 첫 페이지 렌더링
- ✅ 드래그하여 영역 선택 (클라이언트 사이드 크롭)
- ✅ Llama 3.2 Vision 모델을 사용한 OCR
- ✅ OCR 히스토리 저장 및 조회

## API 엔드포인트

### POST /ocr
크롭된 이미지 파일을 받아 OCR을 수행합니다.

**Request:**
- `file`: 이미지 파일 (multipart/form-data)

**Response:**
```json
{
  "id": 1,
  "extracted_text": "추출된 텍스트",
  "timestamp": "2025-01-06T10:00:00"
}
```

### GET /history
OCR 히스토리를 반환합니다.

**Response:**
```json
[
  {
    "id": 1,
    "extracted_text": "추출된 텍스트",
    "timestamp": "2025-01-06T10:00:00"
  }
]
```

## 개발 참고사항

- 클라이언트 사이드에서 이미지 크롭을 수행하여 서버로는 크롭된 영역만 전송합니다.
- PDF는 첫 페이지만 렌더링하여 표시합니다.
- Ollama가 실행 중이어야 OCR이 정상적으로 작동합니다.
