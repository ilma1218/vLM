# IO-VISION OCR - 특정영역추출 서비스 작동 문서

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [주요 기능](#주요-기능)
5. [페이지별 상세 설명](#페이지별-상세-설명)
6. [API 엔드포인트](#api-엔드포인트)
7. [데이터베이스 구조](#데이터베이스-구조)
8. [유틸리티 함수](#유틸리티-함수)
9. [사용 방법](#사용-방법)
10. [개발 참고사항](#개발-참고사항)

---

## 프로젝트 개요

**IO-VISION OCR**은 이미지나 PDF 파일에서 사용자가 선택한 특정 영역의 텍스트를 추출하는 웹 서비스입니다. 

- **클라이언트 사이드 크롭**: 브라우저에서 이미지/PDF를 크롭하여 서버로는 크롭된 영역만 전송
- **다중 영역 지원**: 하나의 파일에서 여러 개의 크롭 영역을 선택하여 동시에 OCR 수행 가능
- **PDF 다중 페이지 지원**: PDF 파일의 모든 페이지에서 동일한 영역 또는 페이지별 다른 영역 추출
- **커스텀 프롬프트**: OCR 정확도를 높이기 위한 사용자 정의 시스템 프롬프트 지원
- **OCR 히스토리 관리**: 파일별로 그룹화된 OCR 기록 조회, 수정, 삭제 기능

---

## 기술 스택

### Backend
- **Python 3.10+**
- **FastAPI**: RESTful API 서버
- **SQLite + SQLAlchemy**: 데이터베이스 및 ORM
- **Ollama**: 로컬 LLM 서버 (Qwen2.5-VL 7B 모델 사용)
- **Pillow**: 이미지 검증 및 처리

### Frontend
- **Next.js 14**: React 프레임워크 (App Router)
- **TypeScript**: 타입 안정성
- **Tailwind CSS**: 스타일링
- **react-image-crop**: 이미지 크롭 UI
- **react-pdf + pdfjs-dist**: PDF 렌더링 및 처리
- **lucide-react**: 아이콘

---

## 프로젝트 구조

```
vLM/
├── backend/                    # FastAPI 백엔드
│   ├── main.py                 # FastAPI 애플리케이션 및 API 엔드포인트
│   ├── database.py             # SQLite 데이터베이스 모델 및 설정
│   ├── requirements.txt        # Python 의존성
│   └── ocr_history.db          # SQLite 데이터베이스 파일 (자동 생성)
│
├── frontend/                   # Next.js 프론트엔드
│   ├── app/
│   │   ├── page.tsx            # 메인 OCR 페이지
│   │   ├── monitor/
│   │   │   └── page.tsx        # OCR 히스토리 페이지
│   │   ├── layout.tsx          # 레이아웃 컴포넌트
│   │   └── globals.css         # 전역 스타일
│   ├── utils/
│   │   ├── cropUtils.ts        # 이미지 크롭 유틸리티
│   │   └── pdfUtils.ts         # PDF 렌더링 유틸리티
│   └── package.json            # Node.js 의존성
│
├── start.sh                    # 모든 서비스 시작 스크립트
├── stop.sh                     # 모든 서비스 종료 스크립트
├── status.sh                   # 서비스 상태 확인 스크립트
├── README.md                   # 프로젝트 README
├── TODO.md                     # TODO 리스트
└── working.md                  # 이 문서
```

---

## 주요 기능

### Home 메뉴
#### 1. 파일 업로드 및 렌더링
- **이미지 파일**: JPG, PNG 등 이미지 파일 직접 표시
- **PDF 파일**: 모든 페이지를 Canvas로 렌더링하여 표시
- **진행 상황 표시**: 파일 업로드 및 처리 진행률을 프로그레스 바로 표시

### 2. 영역 선택 및 크롭
- **드래그하여 영역 선택**: ReactCrop을 사용한 직관적인 크롭 UI
- **다중 영역 지원**: 하나의 파일에서 여러 개의 크롭 영역 추가 가능
- **영역 편집**: 저장된 영역을 클릭하여 편집하거나 드래그하여 이동 가능
- **퍼센트 기반 저장**: 크롭 영역을 퍼센트로 저장하여 페이지 이동 시에도 정확한 위치 유지

### 3. PDF 페이지 네비게이션
- **페이지 이동**: 이전/다음 버튼으로 PDF 페이지 이동
- **크롭 영역 고정**: 페이지 이동 시에도 선택한 크롭 영역이 동일한 위치에 표시
- **OCR 진행 중 페이지 이동**: OCR 처리 중에도 페이지를 이동하여 다른 페이지 확인 가능

### 4. 커스텀 프롬프트
- **시스템 프롬프트 입력**: OCR 정확도를 높이기 위한 사용자 정의 프롬프트 입력
- **프롬프트 저장/불러오기**: 자주 사용하는 프롬프트를 저장하고 불러올 수 있음
- **기본 프롬프트**: 기본적으로 제공되는 최적화된 프롬프트 사용

### 5. OCR 실행
- **다중 영역 처리**: 선택한 모든 크롭 영역을 순차적으로 OCR 처리
- **진행 상황 표시**: 각 영역 처리 진행 상황을 실시간으로 표시
- **크롭된 이미지 미리보기**: 처리된 각 영역의 크롭된 이미지 미리보기 제공

### 6. OCR 결과 표시
- **텍스트 추출 결과**: 추출된 텍스트를 깔끔하게 포맷팅하여 표시
- **영역별 구분**: 여러 영역의 결과를 구분선으로 분리하여 표시
- **localStorage 저장**: OCR 결과를 브라우저에 저장하여 새로고침 후에도 유지

### History 메뉴
#### 1. OCR 히스토리 관리
- **파일별 그룹화**: 같은 파일에서 추출한 OCR 기록을 파일별로 그룹화하여 표시
- **상세 보기**: 크롭된 이미지(왼쪽)와 추출된 텍스트(오른쪽)를 나란히 표시
- **텍스트 수정**: 추출된 텍스트를 직접 수정하여 저장 가능
- **레코드 삭제**: 불필요한 OCR 기록 삭제
- **레코드 네비게이션**: 이전/다음 레코드로 이동 (키보드 화살표 키 지원)

---

## 페이지별 상세 설명

### 1. 메인 OCR 페이지 (`/` - `app/page.tsx`)

#### 주요 상태 관리
- `file`: 업로드된 파일
- `imageSrc`: 표시할 이미지 소스 (이미지 URL 또는 PDF Canvas Data URL)
- `cropAreasByPage`: 페이지별 크롭 영역 관리 (Map<pageNumber, CropAreaData[]>)
- `currentCrop`: 현재 선택 중인 크롭 영역
- `isProcessing`: OCR 처리 중 여부
- `ocrResult`: OCR 결과 텍스트
- `customPrompt`: 사용자 정의 프롬프트

#### 주요 기능

**파일 업로드**
```typescript
handleFileSelect()
```
- 이미지 파일: FileReader로 Data URL 생성
- PDF 파일: `renderPdfAllPagesToCanvases()`로 모든 페이지를 Canvas로 렌더링
- 업로드 진행률을 프로그레스 바로 표시

**크롭 영역 관리**
```typescript
addCropArea()          // 크롭 영역 추가
removeCropArea()       // 크롭 영역 삭제
handleCropAreaClick()  // 크롭 영역 클릭하여 편집 모드로 전환
handleCropAreaMouseDown() // 크롭 영역 드래그 시작
```
- 크롭 영역을 퍼센트 기반으로 저장하여 페이지 이동 시에도 정확한 위치 유지
- 드래그하여 크롭 영역 이동 가능
- 클릭하여 크롭 영역 편집 가능

**PDF 페이지 이동**
```typescript
handlePageChange(newPage)
```
- OCR 진행 중에도 페이지 이동 가능
- 페이지 이동 시 해당 페이지의 크롭 영역 자동 복원
- 첫 페이지의 크롭 영역을 다른 페이지에 자동 복사

**OCR 실행**
```typescript
handleRunOCR()
```
- 모든 크롭 영역을 순차적으로 처리
- 각 영역의 `cropPercent` 값을 사용하여 정확한 크롭 수행
- PDF의 경우 각 페이지의 Canvas에서 직접 크롭
- 이미지의 경우 원본 이미지 크기에 맞게 스케일링하여 크롭
- 처리 진행 상황을 실시간으로 표시

**프롬프트 관리**
- 기본 프롬프트 또는 사용자 정의 프롬프트 사용
- 프롬프트 저장/불러오기 기능
- localStorage에 프롬프트 저장

#### UI 구성
1. **파일 업로드 영역**: 파일 선택 버튼 및 업로드 진행률 표시
2. **이미지 크롭 영역**: ReactCrop을 사용한 크롭 UI 및 저장된 영역 오버레이
3. **PDF 페이지 네비게이션**: 이전/다음 버튼 및 현재 페이지 표시
4. **크롭 영역 목록**: 현재 페이지의 크롭 영역 목록 표시
5. **프롬프트 입력 영역**: 시스템 프롬프트 입력 및 저장/불러오기
6. **OCR 실행 버튼**: 선택한 모든 영역에 대해 OCR 실행
7. **크롭된 이미지 미리보기**: 처리된 각 영역의 크롭된 이미지 미리보기
8. **OCR 결과**: 추출된 텍스트 표시

---

### 2. OCR 히스토리 페이지 (`/monitor` - `app/monitor/page.tsx`)

#### 주요 상태 관리
- `files`: 파일별로 그룹화된 OCR 기록 목록
- `expandedFiles`: 확장된 파일 그룹 Set
- `selectedRecord`: 현재 선택된 OCR 기록
- `isEditing`: 텍스트 편집 모드 여부
- `editedText`: 편집 중인 텍스트

#### 주요 기능

**파일별 그룹화**
```typescript
fetchHistory()
```
- 백엔드에서 `grouped=true` 파라미터로 파일별 그룹화된 데이터 요청
- 같은 파일명의 여러 업로드 세션을 `first_timestamp`로 구분

**파일 목록 표시**
- 파일별로 접기/펼치기 가능
- 각 파일의 총 기록 수 및 최신 타임스탬프 표시
- 같은 파일명의 여러 세션을 타임스탬프로 구분하여 표시

**상세 보기**
- 레코드 클릭 시 상세 보기 모드로 전환
- 왼쪽: 크롭된 이미지 (base64 디코딩하여 표시)
- 오른쪽: 추출된 텍스트, ID, 타임스탬프, 페이지 번호

**텍스트 편집**
```typescript
handleEdit()      // 편집 모드로 전환
handleSave()      // 수정된 텍스트 저장
handleCancelEdit() // 편집 취소
```
- 원본 텍스트와 수정 중인 텍스트를 나란히 비교 표시
- 수정된 줄은 빨간색으로 강조 표시
- textarea에서 직접 텍스트 편집 가능

**레코드 삭제**
```typescript
handleDelete()
```
- 삭제 확인 다이얼로그 표시
- 레코드 삭제 후 파일 목록에서 자동 제거

**레코드 네비게이션**
```typescript
navigateToPrevious()  // 이전 레코드
navigateToNext()      // 다음 레코드
```
- 이전/다음 버튼으로 레코드 이동
- 키보드 화살표 키 (← →) 지원
- 현재 레코드 인덱스 및 전체 개수 표시

#### UI 구성
1. **파일 목록 모드**: 파일별로 그룹화된 OCR 기록 목록
2. **상세 보기 모드**: 
   - 크롭된 이미지 (왼쪽)
   - 추출된 텍스트 및 메타데이터 (오른쪽)
   - 편집/삭제 버튼
   - 레코드 네비게이션 버튼

---

## API 엔드포인트

### POST `/ocr`

크롭된 이미지 파일을 받아서 OCR을 수행합니다.

**Request:**
- `file`: 이미지 파일 (multipart/form-data, required)
- `filename`: 원본 파일명 (FormData, optional)
- `page_number`: PDF 페이지 번호 (FormData, optional)
- `custom_prompt`: 사용자 정의 프롬프트 (FormData, optional)

**Response:**
```json
{
  "id": 1,
  "extracted_text": "추출된 텍스트",
  "cropped_image": "base64_encoded_image_string",
  "timestamp": "2025-01-06T10:00:00",
  "filename": "example.pdf",
  "page_number": 1
}
```

**처리 과정:**
1. 이미지 파일 검증 (Pillow 사용)
2. 이미지를 base64로 인코딩
3. Ollama API 호출 (Qwen2.5-VL 7B 모델)
   - 시스템 프롬프트: 정확한 OCR 수행을 위한 프롬프트
   - 사용자 프롬프트: `custom_prompt` 또는 기본 프롬프트
   - 이미지: base64 인코딩된 이미지
   - 옵션: `num_predict: 16384`, `temperature: 0.0`, `num_ctx: 32768`
4. 응답 후처리 (`clean_ocr_response()`)
   - 불필요한 설명 제거
   - 중복 라인 제거
   - 숫자 시퀀스 패턴 제거
   - 여러 줄 패턴 반복 제거
5. 데이터베이스에 저장
6. 결과 반환

---

### GET `/history`

OCR 히스토리를 반환합니다.

**Query Parameters:**
- `grouped`: 파일별로 그룹화할지 여부 (boolean, default: false)

**Response (grouped=false):**
```json
[
  {
    "id": 1,
    "extracted_text": "추출된 텍스트",
    "cropped_image": "base64_encoded_image_string",
    "timestamp": "2025-01-06T10:00:00",
    "filename": "example.pdf",
    "page_number": 1
  }
]
```

**Response (grouped=true):**
```json
[
  {
    "filename": "example.pdf",
    "records": [
      {
        "id": 1,
        "extracted_text": "추출된 텍스트",
        "cropped_image": "base64_encoded_image_string",
        "timestamp": "2025-01-06T10:00:00",
        "page_number": 1
      }
    ],
    "total_records": 1,
    "latest_timestamp": "2025-01-06T10:00:00",
    "first_timestamp": "2025-01-06T10:00:00"
  }
]
```

---

### PUT `/history/{record_id}`

OCR 기록의 텍스트를 수정합니다.

**Request:**
- `extracted_text`: 수정할 텍스트 (FormData, required)

**Response:**
```json
{
  "id": 1,
  "extracted_text": "수정된 텍스트",
  "cropped_image": "base64_encoded_image_string",
  "timestamp": "2025-01-06T10:00:00",
  "filename": "example.pdf",
  "page_number": 1
}
```

---

### DELETE `/history/{record_id}`

OCR 기록을 삭제합니다.

**Response:**
- `200 OK`: 삭제 성공

---

## 데이터베이스 구조

### OCRRecord 테이블

```python
class OCRRecord(Base):
    __tablename__ = "ocr_records"

    id = Column(Integer, primary_key=True, index=True)
    extracted_text = Column(String, nullable=False)
    cropped_image = Column(String, nullable=True)  # base64 encoded image
    timestamp = Column(DateTime, default=datetime.utcnow)
    filename = Column(String, nullable=True)  # 원본 파일명
    page_number = Column(Integer, nullable=True)  # PDF 페이지 번호
```

**필드 설명:**
- `id`: 고유 식별자 (자동 증가)
- `extracted_text`: 추출된 텍스트
- `cropped_image`: 크롭된 이미지 (base64 인코딩)
- `timestamp`: OCR 수행 시간 (UTC)
- `filename`: 원본 파일명
- `page_number`: PDF 페이지 번호 (이미지인 경우 None)

---

## 유틸리티 함수

### 1. `cropUtils.ts`

#### `cropImageToBlob()`

이미지 요소 또는 Canvas에서 선택된 영역을 Blob으로 추출합니다.

**파라미터:**
- `imageElement`: HTMLImageElement 또는 HTMLCanvasElement
- `cropArea`: 크롭할 영역 (x, y, width, height)

**처리 과정:**
1. **이미지 요소인 경우:**
   - 표시 크기와 원본 크기의 비율 계산
   - 크롭 영역을 원본 이미지 크기에 맞게 조정
2. **Canvas 요소인 경우:**
   - 이미 원본 크기이므로 그대로 사용
3. **해상도 최적화:**
   - 최소 해상도 600px 보장
   - 충분히 큰 이미지는 1.2배 확대하여 선명도 향상
4. **고품질 렌더링:**
   - `imageSmoothingEnabled: true`
   - `imageSmoothingQuality: 'high'`
5. **Blob 변환:**
   - PNG 형식으로 변환

**반환값:**
- `Promise<Blob>`: 크롭된 이미지 Blob

---

### 2. `pdfUtils.ts`

#### `renderPdfFirstPageToCanvas()`

PDF의 첫 페이지를 Canvas로 렌더링합니다.

**파라미터:**
- `file`: PDF 파일 (File 객체)

**반환값:**
- `Promise<HTMLCanvasElement>`: 렌더링된 Canvas

---

#### `renderPdfAllPagesToCanvases()`

PDF의 모든 페이지를 Canvas 배열로 렌더링합니다.

**파라미터:**
- `file`: PDF 파일 (File 객체)

**처리 과정:**
1. PDF.js로 PDF 문서 로드
2. 각 페이지를 순차적으로 렌더링
3. `scale: 2.0`으로 고해상도 렌더링
4. Canvas 배열로 반환

**반환값:**
- `Promise<HTMLCanvasElement[]>`: 렌더링된 Canvas 배열

---

#### `getPdfPageCount()`

PDF의 총 페이지 수를 반환합니다.

**파라미터:**
- `file`: PDF 파일 (File 객체)

**반환값:**
- `Promise<number>`: 총 페이지 수

---

## 사용 방법

### 1. 서비스 시작

```bash
# 모든 서비스 한 번에 시작
./start.sh

# 또는 개별적으로 시작
# Ollama 서버
ollama serve

# Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev
```

### 2. OCR 수행

1. **파일 업로드**
   - "파일 선택" 버튼 클릭
   - 이미지 파일 (JPG, PNG) 또는 PDF 파일 선택

2. **영역 선택**
   - 업로드된 이미지에서 드래그하여 크롭할 영역 선택
   - "영역 추가" 버튼 클릭하여 영역 저장
   - 여러 영역 추가 가능

3. **PDF 페이지 이동** (PDF인 경우)
   - 이전/다음 버튼으로 페이지 이동
   - 각 페이지에서 영역 선택 가능

4. **프롬프트 설정** (선택사항)
   - 프롬프트 입력 영역에서 커스텀 프롬프트 입력
   - 저장된 프롬프트 불러오기 가능

5. **OCR 실행**
   - "OCR 실행" 버튼 클릭
   - 처리 진행 상황 확인
   - 결과 확인

### 3. 히스토리 조회

1. **히스토리 페이지 이동**
   - `/monitor` 경로로 이동

2. **파일 목록 확인**
   - 파일별로 그룹화된 OCR 기록 목록 확인
   - 파일 클릭하여 펼치기/접기

3. **상세 보기**
   - 레코드 클릭하여 상세 보기
   - 크롭된 이미지와 추출된 텍스트 확인

4. **텍스트 수정**
   - "수정" 버튼 클릭
   - 텍스트 편집
   - "저장" 버튼 클릭

5. **레코드 삭제**
   - "삭제" 버튼 클릭
   - 확인 후 삭제

---

## 개발 참고사항

### 1. 크롭 영역 저장 방식

크롭 영역은 **퍼센트 기반**으로 저장됩니다:
```typescript
cropPercent = {
  x: (crop.x / imgWidth) * 100,
  y: (crop.y / imgHeight) * 100,
  width: (crop.width / imgWidth) * 100,
  height: (crop.height / imgHeight) * 100,
}
```

이 방식을 사용하는 이유:
- 페이지 이동 시에도 정확한 위치 유지
- 이미지 크기 변경에 대응
- PDF 페이지 간 일관된 크롭 영역 적용

### 2. OCR 응답 후처리

`clean_ocr_response()` 함수에서 다음 작업을 수행합니다:
- 불필요한 설명 제거 ("The image contains the text..." 등)
- 중복 라인 제거
- 숫자 시퀀스 패턴 제거 (예: "10, 11, 12, ...")
- 여러 줄 패턴 반복 제거

### 3. Ollama 모델 설정

현재 사용 중인 모델: **Qwen2.5-VL 7B**

**모델 옵션:**
- `num_predict: 16384`: 최대 생성 토큰 수
- `temperature: 0.0`: 결정적 출력 (일관성 보장)
- `num_ctx: 32768`: 컨텍스트 윈도우 크기
- `stop: []`: 중지 토큰 없음 (완전한 출력 보장)

### 4. CORS 설정

개발 환경에서는 모든 origin을 허용하도록 설정되어 있습니다:
```python
allow_origins=["*"]
```

프로덕션 환경에서는 특정 origin만 허용하도록 변경해야 합니다.

### 5. localStorage 사용

다음 데이터를 localStorage에 저장합니다:
- `ocr_result`: OCR 결과 텍스트
- `custom_prompt`: 사용자 정의 프롬프트
- `saved_prompts`: 저장된 프롬프트 목록

### 6. 이미지 해상도 최적화

OCR 정확도를 높이기 위해:
- 최소 해상도 600px 보장
- 충분히 큰 이미지는 1.2배 확대
- 고품질 이미지 스무딩 적용

### 7. PDF 렌더링

PDF는 `scale: 2.0`으로 렌더링하여 고해상도 보장:
- 더 정확한 텍스트 인식
- 선명한 이미지 품질

### 8. OCR 진행 중 페이지 이동

OCR 처리 중에도 페이지 이동이 가능하도록 구현:
- `isProcessing` 상태와 무관하게 페이지 이동 허용
- 크롭 영역은 `cropPercent` 값으로 저장되어 페이지 이동과 무관하게 정확하게 처리

---

## 주요 개선 사항

### 1. 다중 영역 지원
- 하나의 파일에서 여러 개의 크롭 영역 선택 가능
- 각 영역별로 독립적인 OCR 수행

### 2. PDF 다중 페이지 지원
- PDF의 모든 페이지에서 동일한 영역 또는 페이지별 다른 영역 추출
- 페이지 네비게이션으로 각 페이지 확인 가능

### 3. 커스텀 프롬프트
- 사용자 정의 시스템 프롬프트로 OCR 정확도 향상
- 프롬프트 저장/불러오기 기능

### 4. 파일별 그룹화
- OCR 히스토리를 파일별로 그룹화하여 관리
- 같은 파일의 여러 업로드 세션 구분

### 5. 텍스트 편집
- 추출된 텍스트를 직접 수정하여 저장 가능
- 원본과 수정본을 비교하여 표시

### 6. OCR 진행 중 페이지 이동
- OCR 처리 중에도 다른 페이지 확인 가능
- 진행 상황을 실시간으로 표시

---

## 향후 개선 계획

현재 TODO.md에 기록된 향후 개선 사항:
- 히스토리 페이지 파일별 그룹화 (완료)
- 다중 파일 업로드 및 실행
- 시스템 프롬프트 입력 UI (완료)

---

## 문제 해결

### 1. OCR 결과가 잘리는 경우
- `num_predict` 값을 증가시킴 (현재: 16384)
- `num_ctx` 값을 증가시킴 (현재: 32768)
- 재시도 메커니즘 구현 (최대 3회 시도)

### 2. 크롭 영역이 정확하지 않은 경우
- 퍼센트 기반 저장 방식 사용
- 원본 이미지 크기와 표시 크기 비율 계산
- PDF Canvas의 경우 직접 픽셀 좌표 사용

### 3. 중복 텍스트가 추출되는 경우
- `clean_ocr_response()` 함수에서 중복 제거
- 여러 줄 패턴 반복 제거
- 숫자 시퀀스 패턴 제거

---

## 라이선스 및 저작권

이 프로젝트는 개인 프로젝트입니다.

---

**작성일**: 2025-01-06  
**최종 업데이트**: 2025-01-06

