# Frontend - Region-Specific OCR Service

Next.js 14 기반 OCR 서비스 프론트엔드

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 환경 변수

`.env.local` 파일을 생성하여 백엔드 URL을 설정할 수 있습니다:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## 주요 기능

- 이미지 파일 업로드 및 표시
- PDF 파일 업로드 및 첫 페이지 렌더링
- 드래그하여 영역 선택 (크롭)
- 선택한 영역에서 OCR 수행
- OCR 히스토리 조회

