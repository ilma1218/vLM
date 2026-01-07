# Region-Specific OCR Web Service

이미지나 PDF 파일에서 특정 영역을 선택하여 OCR(광학 문자 인식)을 수행하는 웹 서비스입니다.

**현재 버전**: v1.0.0  
**버전 관리**: [VERSION.md](./VERSION.md) 참조

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
- Ollama (Qwen2.5-VL 7B)

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
   ollama pull qwen2.5vl:7b
   ```

## 빠른 시작

### 모든 서비스 한 번에 시작

```bash
# 모든 서비스 시작 (Ollama, Backend, Frontend)
./start.sh

# 서비스 상태 확인
./status.sh

# 모든 서비스 종료
./stop.sh
```

## 설치 및 실행

### Backend 실행

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

백엔드는 http://localhost:8000 에서 실행됩니다.

**백엔드 종료:**
- 터미널에서 `Ctrl + C`를 눌러 종료합니다.

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

**프론트엔드 종료:**
- 터미널에서 `Ctrl + C`를 눌러 종료합니다.

### 서비스 기동 및 종료

#### 스크립트를 사용한 관리 (권장)

**모든 서비스 시작:**
```bash
./start.sh
```

**서비스 상태 확인:**
```bash
./status.sh
```

**모든 서비스 종료:**
```bash
./stop.sh
```

#### 백그라운드에서 실행하기

**Backend 백그라운드 실행:**
```bash
cd backend
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

**Frontend 백그라운드 실행:**
```bash
cd frontend
nohup npm run dev > frontend.log 2>&1 &
```

**실행 중인 프로세스 확인:**
```bash
# Backend 확인
ps aux | grep uvicorn

# Frontend 확인
ps aux | grep "next dev"
```

**서비스 종료:**
```bash
# Backend 종료
pkill -f "uvicorn main:app"

# Frontend 종료
pkill -f "next dev"

# 또는 특정 PID로 종료
kill <PID>
```

#### systemd 서비스로 관리 (선택사항)

**Backend 서비스 파일 생성** (`/etc/systemd/system/ocr-backend.service`):
```ini
[Unit]
Description=OCR Backend Service
After=network.target

[Service]
Type=simple
User=work
WorkingDirectory=/home/work/vLM/backend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**Frontend 서비스 파일 생성** (`/etc/systemd/system/ocr-frontend.service`):
```ini
[Unit]
Description=OCR Frontend Service
After=network.target

[Service]
Type=simple
User=work
WorkingDirectory=/home/work/vLM/frontend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target
```

**서비스 관리:**
```bash
# 서비스 등록
sudo systemctl daemon-reload
sudo systemctl enable ocr-backend
sudo systemctl enable ocr-frontend

# 서비스 시작
sudo systemctl start ocr-backend
sudo systemctl start ocr-frontend

# 서비스 중지
sudo systemctl stop ocr-backend
sudo systemctl stop ocr-frontend

# 서비스 상태 확인
sudo systemctl status ocr-backend
sudo systemctl status ocr-frontend

# 서비스 재시작
sudo systemctl restart ocr-backend
sudo systemctl restart ocr-frontend
```

## 사용 방법

1. 프론트엔드 페이지에서 이미지 또는 PDF 파일을 업로드합니다.
2. 업로드된 이미지에서 드래그하여 OCR을 수행할 영역을 선택합니다.
3. "OCR 실행" 버튼을 클릭합니다.
4. 추출된 텍스트가 표시됩니다.
5. "History" 페이지에서 이전 OCR 기록을 확인할 수 있습니다.

## 주요 기능

- ✅ 이미지 파일 업로드 (JPG, PNG 등)
- ✅ PDF 파일 업로드 및 모든 페이지 처리
- ✅ 드래그하여 영역 선택 (클라이언트 사이드 크롭)
- ✅ PDF의 모든 페이지에서 동일한 영역 추출
- ✅ Qwen2.5-VL 7B 모델을 사용한 OCR
- ✅ OCR 히스토리 저장 및 조회
- ✅ 한글 및 영어 텍스트 추출 지원

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

## Git 배포 방법

### 변경사항 커밋 및 푸시

```bash
# 1. 변경된 파일 확인
git status

# 2. 변경된 파일 추가
git add .

# 3. 커밋 (변경사항 저장)
git commit -m "커밋 메시지"

# 4. GitHub에 푸시
git push origin main
```

### 배포 워크플로우

1. **로컬에서 개발 및 테스트**
   ```bash
   # Backend 테스트
   cd backend
   uvicorn main:app --reload --port 8000
   
   # Frontend 테스트
   cd frontend
   npm run dev
   ```

2. **변경사항 커밋**
   ```bash
   git add .
   git commit -m "feat: 새로운 기능 추가"
   ```

3. **GitHub에 푸시**
   ```bash
   git push origin main
   ```

4. **서버에서 최신 코드 가져오기** (서버에서 실행)
   ```bash
   cd /home/work/vLM
   git pull origin main
   
   # Backend 재시작
   cd backend
   # 기존 프로세스 종료 후
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Frontend 재시작
   cd frontend
   # 기존 프로세스 종료 후
   npm run dev
   ```

### 프로덕션 빌드 및 배포

**Frontend 프로덕션 빌드:**
```bash
cd frontend
npm run build
npm start  # 프로덕션 모드로 실행
```

**Backend 프로덕션 실행:**
```bash
cd backend
# --reload 옵션 제거 (프로덕션에서는 사용하지 않음)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 개발 참고사항

- 클라이언트 사이드에서 이미지 크롭을 수행하여 서버로는 크롭된 영역만 전송합니다.
- PDF는 모든 페이지에서 동일한 영역을 추출합니다.
- Ollama가 실행 중이어야 OCR이 정상적으로 작동합니다.
- Ollama 서버는 별도로 실행되어 있어야 합니다: `ollama serve`
