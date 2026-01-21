# vLM 개발/재현(Dev Environment Repro) 가이드

이 문서는 **다른 GPU 서버에서 현재 vLM 프로젝트를 동일하게 재현**할 수 있도록, 처음부터 끝까지 필요한 환경/버전/설치/실행/검증 절차와 주의사항을 정리합니다.

---

## 1) “동일한 상태”의 기준 (중요)

- **코드 동일**: 같은 Git 커밋/태그를 체크아웃해야 합니다.
  - 현재 원격 `origin/main` 최신 커밋: `354a838`
  - 2차 개발 완료 태그: `v2.0`
- **설정 동일**: 특히 JWT 시크릿 등 환경변수가 동일해야 로그인/히스토리/크레딧이 동일 동작합니다.
- **데이터(DB) 동일**: SQLite DB 파일은 Git에 포함되지 않습니다(기본 `.gitignore`).  
  운영/테스트 데이터까지 동일하게 만들려면 DB 파일을 별도로 복사해야 합니다.

---

## 2) 서비스 구성/포트

- **Frontend (Next.js)**: `http://<HOST>:3000`
- **Backend (FastAPI)**: `http://<HOST>:8000`
- **Ollama**: `http://<HOST>:11434`
- 통합 실행 스크립트: `./start.sh`, 상태 확인: `./status.sh`, 종료: `./stop.sh`

---

## 2-A) “정상 작동”을 위한 필수 조건/환경 설정 (체크리스트)

다른 서버에서 이 레포를 그대로 실행했을 때 아래 조건을 만족하면, **프론트(`:3000`) + 백엔드(`:8000`)는 정상 구동**됩니다.

### 2-A.1 필수 버전
- **Python**: 3.10+
- **Node.js**: 18+ (권장: 18 LTS 또는 20 LTS)
- **npm**: Node에 포함된 버전 사용

### 2-A.2 필수 설치 조건(의존성)
- **Backend**: `backend/requirements.txt` 설치 완료 (venv 권장)
- **Frontend**: `frontend/package-lock.json` 기준으로 `npm ci` 수행 권장

### 2-A.3 환경변수/설정 (중요)

#### Frontend → Backend 연결 주소
- 프론트는 다음 우선순위로 백엔드 주소를 결정합니다:
  - `NEXT_PUBLIC_BACKEND_URL` (설정되어 있으면 사용)
  - 없으면 기본값 `http://localhost:8000`
- **서버 IP/도메인 환경**에서는 `frontend/.env.local`에 백엔드 주소를 명시하는 것을 권장합니다.

#### Backend JWT 설정(로그인/히스토리/크레딧 기능에 영향)
- `JWT_SECRET_KEY`가 서버마다 달라지면 **기존 토큰이 무효**가 됩니다(다시 로그인하면 새 토큰 발급으로 해결).
- 재현/운영에서 안정적으로 쓰려면 아래를 환경변수로 고정하세요:
  - `JWT_SECRET_KEY` (필수 권장)
  - `JWT_EXPIRES_MINUTES` (선택, 기본 10080 = 7일)

### 2-A.4 Ollama 설치 여부에 따른 동작 범위(중요)
- **Ollama 없이도**:
  - 프론트 UI 구동(업로드/크롭 UI)
  - 백엔드 API 서버 구동(로그인/구매/히스토리/크레딧 API 자체는 동작)
  - 단, **OCR 실행은 실패하거나 제한**됩니다.
- **Ollama + 모델(`qwen2.5vl:7b`)까지 설치/실행 시**:
  - OCR 기능까지 포함한 전체 플로우가 정상 동작합니다.

### 2-A.5 실행 직후 정상 확인(간단)

```bash
# Backend 응답 확인
curl -sS http://localhost:8000/ >/dev/null && echo "backend ok"

# Frontend 응답 확인
curl -sS http://localhost:3000/ >/dev/null && echo "frontend ok"

# Ollama(선택) 확인
ollama list >/dev/null && echo "ollama ok"
```

---

## 3) 권장 OS/필수 패키지

### 권장 OS
- Ubuntu 22.04/24.04 LTS (또는 호환 리눅스)

### 공통 필수 패키지 (예: Ubuntu)

```bash
sudo apt update
sudo apt install -y \
  git curl ca-certificates \
  build-essential \
  python3 python3-venv python3-pip \
  net-tools
```

> `net-tools`는 `status.sh`에서 포트 확인 등을 할 때 편의용입니다(필수는 아님).

---

## 4) GPU 서버 준비 (Ollama용)

### 4.1 NVIDIA 드라이버 확인

```bash
nvidia-smi
```

- 정상적으로 GPU 정보가 나오면 OK
- 안 나오면 서버/클라우드 환경에 맞는 NVIDIA 드라이버 설치가 필요합니다.

### 4.2 Ollama 설치/실행/모델 다운로드

```bash
# Ollama 설치
curl -fsSL https://ollama.ai/install.sh | sh

# Ollama 서버 시작 (백그라운드 권장: 별도 세션/서비스로 띄워도 됨)
ollama serve

# OCR에 사용하는 모델 다운로드 (약 6GB)
ollama pull qwen2.5vl:7b

# 설치 확인
ollama list
```

#### 참고
- 기본적으로 Python Ollama 클라이언트는 `http://localhost:11434`로 접속합니다.
- 원격 Ollama를 쓰거나 포트를 바꾼 경우, Ollama의 환경 변수/설정에 맞춰야 합니다.

---

## 5) Git 클론 및 코드 고정(체크아웃)

```bash
cd /home/work
git clone <YOUR_GIT_REPO_URL> vLM
cd /home/work/vLM

# (옵션 A) 2차 개발 완료 상태로 고정
git checkout v2.0

# (옵션 B) 현재 배포된 최신 상태로 고정(권장: 정확 재현)
git checkout 354a838
```

> **주의**: `main`을 그대로 쓰면 이후 커밋에 의해 상태가 바뀔 수 있습니다. “완전 동일 재현”은 커밋 해시/태그로 고정하는 방식이 안전합니다.

---

## 6) Backend 설치/실행 (FastAPI + SQLite)

### 6.1 Python 버전
- 문서/코드 기준: **Python 3.10+**

### 6.2 가상환경 생성 및 의존성 설치

```bash
cd /home/work/vLM/backend
python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

#### Backend 의존성 버전(고정)
`backend/requirements.txt` 기준:
- fastapi==0.104.1
- uvicorn[standard]==0.24.0
- sqlalchemy==2.0.23
- python-multipart==0.0.6
- python-dotenv==1.0.0
- Pillow==10.1.0
- ollama==0.1.7
- passlib[bcrypt]==1.7.4  *(단, 해싱은 pbkdf2_sha256 사용)*
- python-jose[cryptography]==3.3.0

### 6.3 환경변수(중요)

Backend는 JWT를 사용합니다. 운영/재현 서버에서 아래 값을 **반드시 동일하게** 맞추세요.

- **`JWT_SECRET_KEY`**: JWT 서명 키 (서버마다 달라지면 토큰이 무효가 됩니다)
- **`JWT_EXPIRES_MINUTES`**: 토큰 만료(분) (기본 7일 = 10080)

예)

```bash
export JWT_SECRET_KEY="dev-secret-change-me"
export JWT_EXPIRES_MINUTES="10080"
```

> 코드 기본값은 `dev-secret-change-me`이지만, 운영에서는 반드시 변경 권장입니다.

### 6.4 실행

```bash
cd /home/work/vLM/backend
source .venv/bin/activate

python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### DB(SQLite) 위치/재현
- DB 파일: `backend/ocr_history.db` (자동 생성)
- Git에 포함되지 않습니다(기본 `.gitignore`에서 `*.db` 무시)

**(완전 동일 데이터 재현)** 다른 서버에서도 동일한 히스토리/크레딧 데이터를 보려면, 원본 서버의 DB를 복사해야 합니다:

```bash
# 예: 원본 서버 -> 신규 서버로 DB 복사 (원본 서버에서)
scp /home/work/vLM/backend/ocr_history.db <NEW_SERVER>:/home/work/vLM/backend/ocr_history.db
```

**(초기화/리셋)** 개발 중 DB를 초기화하려면:

```bash
rm -f /home/work/vLM/backend/ocr_history.db*
```

> `database.py`에 간단한 스키마 보강(ALTER TABLE) 로직이 있어, 기존 DB에도 최소 마이그레이션이 자동 적용됩니다.

### 6.5 기본 시드 계정(개발 편의)
- 서버 시작 시 `user@example.com` 계정이 **Expert(5,000 credits)** 상태로 시드됩니다.
- **주의**: 이 시드는 “크레딧/플랜(UserAccount)” 기준이며, **아이디/비밀번호(UserAuth)** 는 별도입니다.  
  즉 `user@example.com`로 비밀번호 로그인하려면 `/auth/signup`으로 비밀번호를 먼저 설정해야 합니다.

---

## 6-A) Database 스키마 (SQLite)

DB는 기본적으로 `backend/ocr_history.db` 파일로 생성되며, SQLAlchemy 모델은 `backend/database.py`를 기준으로 합니다.

### 6-A.1 테이블 목록

- `ocr_records`: OCR 저장 히스토리(사용자별 분리)
- `prompts`: 프롬프트 템플릿 저장
- `extract_keys`: 고급모드 key:value 추출에 사용하는 키 목록 저장
- `users`: 크레딧/플랜 계정(UserAccount)
- `user_auth`: 아이디/비밀번호 인증(UserAuth)
- `purchases`: 구매 이력(모의 결제 포함)
- `credit_ledger`: 크레딧 증감 원장(지급/차감/중복차감 방지용 유니크 제약 포함)

### 6-A.2 테이블별 컬럼(요약)

#### `ocr_records`
- `id` (INTEGER, PK)
- `email` (VARCHAR, NULL 가능, INDEX): 히스토리 소유자(로그인 사용자 이메일)
- `save_session_id` (VARCHAR, NULL 가능, INDEX): “저장 버튼 1회 클릭” 단위로 묶는 키
- `extracted_text` (VARCHAR, NOT NULL)
- `cropped_image` (VARCHAR, NULL): base64 이미지(저장 시)
- `timestamp` (DATETIME, default=UTC now)
- `filename` (VARCHAR, NULL)
- `page_number` (INTEGER, NULL): PDF 페이지 번호(이미지인 경우 NULL 가능)

#### `users` (UserAccount)
- `id` (INTEGER, PK)
- `email` (VARCHAR, NOT NULL, UNIQUE, INDEX)
- `plan_key` (VARCHAR, NULL): 예) `expert`
- `credits_balance` (INTEGER, NOT NULL, default=0)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

#### `user_auth` (UserAuth)
- `id` (INTEGER, PK)
- `email` (VARCHAR, NOT NULL, UNIQUE, INDEX)
- `password_hash` (VARCHAR, NOT NULL)  *(pbkdf2_sha256 결과 저장)*
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

#### `purchases`
- `id` (INTEGER, PK)
- `email` (VARCHAR, NOT NULL, INDEX)
- `plan_key` (VARCHAR, NOT NULL)
- `amount_krw` (INTEGER, NULL 가능)
- `credits_granted` (INTEGER, NOT NULL, default=0)
- `purchased_at` (DATETIME)

#### `credit_ledger`
- `id` (INTEGER, PK)
- `email` (VARCHAR, NOT NULL, INDEX)
- `delta` (INTEGER, NOT NULL)  *(+지급 / -차감)*
- `reason` (VARCHAR, NOT NULL)  *(예: `purchase`, `ocr_save_page_charge`)*
- `filename` (VARCHAR, NULL)
- `page_key` (INTEGER, NOT NULL, default=-1) *(보통 page_number, PDF 아닌 경우 -1)*
- `save_session_id` (VARCHAR, NULL)
- `meta` (VARCHAR, NULL): JSON 문자열
- `created_at` (DATETIME)

**중복 차감 방지 유니크 제약**
- `credit_ledger`에는 다음 유니크 제약이 있습니다:
  - `(email, reason, save_session_id, page_key)` UNIQUE  
  - 의미: 동일한 “저장 세션(save_session_id)” 내에서 같은 페이지(page_key)에 대해 같은 reason으로 **1회만** 원장 기록(=중복 차감 방지)

#### `prompts`
- `id` (INTEGER, PK)
- `name` (VARCHAR, NOT NULL)
- `prompt` (VARCHAR, NOT NULL)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

#### `extract_keys`
- `id` (INTEGER, PK)
- `name` (VARCHAR, NOT NULL)
- `keys` (VARCHAR, NOT NULL): JSON 문자열 배열(예: `["key1","key2"]`)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)

### 6-A.3 간단 마이그레이션(ALTER) 동작

Alembic을 쓰지 않고, 서버 시작 시 `init_db()`에서 최소 스키마 보강을 수행합니다:
- `ocr_records.email` 컬럼이 없으면 `ALTER TABLE ... ADD COLUMN`
- `ocr_records.save_session_id` 컬럼이 없으면 `ALTER TABLE ... ADD COLUMN`

> 이미 만들어진 DB 파일을 새 코드로 올렸을 때도 “필수 컬럼”이 부족하면 자동으로 보강되도록 만든 개발 편의 기능입니다.

### 6-A.4 크레딧/히스토리 데이터 흐름(요약)

- **회원가입(`/auth/signup`)**:
  - `user_auth`에 `email/password_hash` 생성
  - `users`에 계정이 없으면 생성(credits 0)
- **로그인(`/auth/login`)**:
  - `user_auth` 검증 후 JWT 발급
- **요금제 구매(`/billing/purchase`)**:
  - `purchases`에 구매 이력 추가
  - `credit_ledger`에 `reason="purchase"`로 +delta 기록
  - `users.credits_balance` 증가
- **OCR 저장(`/history/save`)**:
  - `ocr_records`에 히스토리 저장(소유자 email 포함)
  - `credit_ledger`에 `reason="ocr_save_page_charge"`로 페이지당 -10 기록(유니크 제약으로 중복 차감 방지)
  - `users.credits_balance` 감소

---

## 7) Frontend 설치/실행 (Next.js 14)

### 7.1 Node.js 버전
- Next.js 14 기준 **Node 18+** 권장 (Node 20 LTS도 OK)

### 7.2 의존성 설치 (lockfile 기준)

```bash
cd /home/work/vLM/frontend
npm ci
```

### 7.3 프론트 환경변수 (`.env.local`)

프론트는 백엔드 주소를 아래 우선순위로 사용합니다:
- `NEXT_PUBLIC_BACKEND_URL` (있으면 사용)
- 없으면 기본값 `http://localhost:8000`

신규 서버에서 외부 접속/다른 호스트를 쓰면 `frontend/.env.local`을 만드세요:

```bash
cat > /home/work/vLM/frontend/.env.local << 'EOF'
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
EOF
```

> 예: 백엔드가 다른 IP/도메인이라면 그 값으로 바꿔주세요.

### 7.4 실행

```bash
cd /home/work/vLM/frontend
npm run dev
```

- 기본 접속: `http://<HOST>:3000`

---

## 8) 가장 쉬운 방법: 통합 스크립트로 실행

프로젝트 루트에서:

```bash
cd /home/work/vLM
./start.sh
```

- `./start.sh`는 다음을 수행합니다:
  - Ollama 설치 여부 확인 후 `ollama serve` 실행(가능한 경우)
  - Backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
  - Frontend: `npm run dev`
  - 로그 저장: `logs/` 디렉토리

상태 확인:

```bash
./status.sh
```

종료:

```bash
./stop.sh
```

> `stop.sh`는 **Ollama 종료 여부를 인터랙티브로 질문**합니다.  
> 자동화/무인 환경에서는 직접 `pkill -f "uvicorn main:app"` / `pkill -f "next dev"` 형태로 종료하거나, systemd로 관리하는 편이 안정적입니다.

---

## 9) 동작 검증(체크리스트)

### 9.1 포트 확인

```bash
curl -sS http://localhost:8000/ >/dev/null && echo "backend ok"
curl -sS http://localhost:3000/ >/dev/null && echo "frontend ok"
ollama list >/dev/null && echo "ollama ok"
```

### 9.2 로그인/구매/저장(크레딧 차감) 기본 플로우 테스트(예시)

```bash
# 회원가입(비밀번호 설정) 또는 로그인
curl -sS -X POST http://localhost:8000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"test1@example.com","password":"test1234"}' | head -c 200

TOKEN=$(curl -sS -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test1@example.com","password":"test1234"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

# (모의) 요금제 구매 → credits 지급
curl -sS -X POST http://localhost:8000/billing/purchase \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"plan_key":"expert"}' | head -c 300

# OCR 저장(페이지당 10 credits 차감)
curl -sS -X POST http://localhost:8000/history/save \
  -H "Authorization: Bearer $TOKEN" \
  -F 'extracted_text=안녕하세요 OCR 테스트 텍스트 123 (공백 포함)' \
  -F 'cropped_image=ZHVtbXk=' \
  -F 'filename=sample.pdf' \
  -F 'page_number=1' \
  -F 'save_session_id=session-ocr-1' | head -c 300

# 크레딧/이용내역(파일 기준 집계 모드)
curl -sS -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8000/billing/usage?mode=file' | head -c 500
```

---

## 10) 운영/외부접속 시 주의사항

- **CORS**: `backend/main.py`의 `allow_origins`에 `*`가 포함되어 있습니다(개발 편의).  
  운영에서는 도메인을 제한하는 것이 안전합니다.
- **방화벽/보안그룹**: 3000/8000/11434 포트 외부 공개 여부를 정책에 맞게 조정하세요.
- **프로덕션 실행**:
  - Backend: `--reload` 제거 + `--workers` 사용 권장
  - Frontend: `npm run build && npm start` 권장
  - 장기 운영은 `systemd`/`pm2` 등 프로세스 매니저 권장

---

## 11) 트러블슈팅

### “백엔드 서버에 연결할 수 없습니다. (http://localhost:8000)”
- `./status.sh`로 백엔드가 “실행 중”인지 확인
- `logs/backend.log` 확인
- 포트 점유 확인: `lsof -i :8000` 또는 `netstat -tlnp | grep 8000`
- 백엔드 재시작: `pkill -f "uvicorn main:app" && ./start.sh`

### Ollama 관련
- `ollama list`가 실패하면 `ollama serve`가 안 떠있는 상태일 수 있습니다.
- VRAM 부족/느림이면 더 작은 모델로 변경하거나(별도 작업) CPU 모드로 사용해야 합니다.

### 로그인은 되는데 히스토리/크레딧이 401
- `JWT_SECRET_KEY`가 바뀌면 기존 토큰이 무효가 됩니다 → 다시 로그인해서 새 토큰 발급
- 프론트가 다른 백엔드를 바라보는지(`NEXT_PUBLIC_BACKEND_URL`) 확인

### keep-alive 스크립트 관련
- 레포 루트에 `keep_alive.log`는 있으나, 로그상 `keep_alive.py`는 현재 존재하지 않습니다.
  - `python /home/work/vLM/keep_alive.py` 형태로 실행하려 했다면, 해당 스크립트를 별도로 추가해야 합니다.

---

## 13) Crop(영역 지정) 개발 참고사항 (재발 방지 메모)

이 프로젝트에서 파일/페이지 **영역 지정(Crop)**은 UI/상태 동기화가 복잡해서 가장 자주 문제가 재발하는 영역입니다. 아래 내용을 알고 있으면 “왜 이 방식으로 구현했는지”를 빠르게 이해하고, 수정 시 회귀를 줄일 수 있습니다.

### 13.1 사용 라이브러리/좌표계 핵심

- 사용 라이브러리: `react-image-crop` (10.x)
- `onComplete` 콜백은 **(pixelCrop, percentCrop)** 두 값을 제공합니다.
  - `pixelCrop`: 현재 화면(표시 크기) 기준 px 좌표
  - `percentCrop`: 0~100% 비율 좌표

### 13.2 “저장/재적용”은 퍼센트(% Crop) 기반이 안전

PDF처럼 페이지별 캔버스(해상도/표시 크기)가 달라질 수 있는 경우, px 좌표를 그대로 저장하면 페이지가 바뀔 때 오차/깨짐이 발생합니다.  
그래서 이 프로젝트는 저장 구조에 **`cropPercent`(x,y,width,height %)** 를 포함해, “표시 크기”가 달라져도 재계산이 가능하게 했습니다.

- 참고 구현:
  - 영역 저장/재적용: `frontend/app/page.tsx`의 `cropPercent` 처리
  - 원본/표시 크기 스케일링 크롭: `frontend/utils/cropUtils.ts`의 `cropImageToBlob()`

### 13.3 편집 시 “단일 진실원천(single source of truth)” 원칙

과거 이슈: **저장된 오버레이(사각형)와 ReactCrop 선택 박스가 각각 움직여** 편집이 꼬이는 문제가 있었습니다.  
현재 구현은 편집 모드에서 다음 원칙을 지킵니다:

- 편집 중(`editingAreaId` 활성)에는 **저장된 오버레이를 숨기고**, ReactCrop만 사용자가 조작하도록 함
- 저장된 영역을 클릭하면 그 영역의 `cropPercent`를 기반으로 **ReactCrop의 selection을 로드**하여 ReactCrop이 “단일 진실원천”이 되도록 함

### 13.4 “두 번 눌러야 업데이트” 문제(상태 비동기) 예방

React state는 비동기 업데이트라서,
- “버튼 클릭 → setState → 다음 로직에서 state를 읽음” 패턴은
  타이밍에 따라 **첫 클릭에서는 이전 값**이 적용되는 문제가 날 수 있습니다.

따라서 업데이트 버튼 로직은:
- 상태(`pendingCropData`)를 거쳐 다시 읽기보다,
- **현재 crop 데이터(함수 인자)** 를 즉시 전달해 한 번의 클릭으로 저장되도록 구성합니다.

### 13.5 UX: 드래그로 crop 직후 버튼 노출

초기 UX 이슈: crop을 만든 뒤, 저장 버튼이 **추가 클릭을 해야 보이는** 문제가 있었습니다.  
현재는 crop 드래그 완료 시점(`onComplete`)에 “추가/업데이트” 액션이 바로 노출되도록 처리합니다.

### 13.6 디버깅 체크리스트(빠른 확인)

- 퍼센트/픽셀 좌표 혼용 여부 확인
  - 저장에는 % (`cropPercent`)가 들어가는지
  - 실제 이미지 크롭에는 표시 크기 대비 스케일링이 적용되는지
- 편집 모드에서 오버레이가 숨겨지는지(`editingAreaId`)
- 업데이트 버튼이 1회 클릭으로 반영되는지(상태 비동기 의존 제거)

### 13.7 코드 위치 “바로가기”(검색 키워드 포함)

아래는 crop 관련 로직을 수정할 때 가장 먼저 보는 지점들입니다.  
에디터에서 **파일을 연 뒤 키워드로 검색**하면 빠르게 접근할 수 있습니다.

#### A) Crop 상태/데이터 구조 (상태 변수)

- **파일**: `frontend/app/page.tsx`
  - **검색 키워드**
    - `const [currentCrop, setCurrentCrop]`
    - `const [currentCompletedCrop, setCurrentCompletedCrop]`
    - `const [cropAreasByPage, setCropAreasByPage]`
    - `const [editingAreaId, setEditingAreaId]`
    - `const [pendingCropData, setPendingCropData]`
    - `const [showApplyToAllModal, setShowApplyToAllModal]`
  - **의미**
    - `currentCrop`: ReactCrop에 바인딩되는 “현재 선택 박스” 상태
    - `currentCompletedCrop`: 드래그 완료된 crop 결과(PixelCrop) + `_cropRatio`(0.0~1.0) 확장 값
    - `cropAreasByPage`: 페이지별 저장 영역 Map (PDF면 key=페이지번호, 이미지면 key=`undefined`)
    - `editingAreaId`: 편집 중인 저장 영역 id (편집 중에는 오버레이 숨김/ReactCrop만 조작)
    - `pendingCropData`: “PDF 전체 페이지 적용” 모달에서 쓰는 임시 데이터(cropPercent/finalCrop)

#### B) 좌표계 정규화(핵심): onComplete 처리

- **파일**: `frontend/app/page.tsx`
  - **함수**: `onCropComplete`
  - **검색 키워드**: `const onCropComplete = useCallback`
  - **역할**
    - `percentageCrop`(%)가 있으면 우선 사용하여 `cropRatio(0.0~1.0)`로 정규화
    - 표시 크기(`getBoundingClientRect`) 기준으로 `PixelCrop`을 만들고,
    - `currentCompletedCrop`에 `_cropRatio`를 임시 저장(후속 저장/재적용에 사용)

#### C) “영역 추가/업데이트” 단일 클릭 보장

- **파일**: `frontend/app/page.tsx`
  - **함수**: `applyCropArea`
  - **검색 키워드**: `const applyCropArea = useCallback`
  - **역할**
    - `cropData` 인자를 우선 사용하고, 없을 때만 `pendingCropData`를 사용
    - `editingAreaId`가 있으면 기존 영역 업데이트, 없으면 새 영역 추가
    - PDF에서 “전체 페이지 적용”이면 각 페이지에 동일 영역을 생성
  - **회귀 포인트**
    - 업데이트가 “2번 클릭”이 되면 `pendingCropData` 같은 state에 의존하고 있을 확률이 큼  
      → `applyCropArea(false, { cropPercent, finalCrop })`처럼 **현재 데이터(인자)** 로 호출하는지 확인

#### D) “영역 추가” 버튼 노출/모달 분기(PDF 전체 적용)

- **파일**: `frontend/app/page.tsx`
  - **함수**: `addCropArea`
  - **검색 키워드**: `const addCropArea = useCallback`
  - **역할**
    - 현재 `currentCompletedCrop`을 기반으로 `cropPercent`(0~100) + `finalCrop(px)` 생성
    - PDF + 다중페이지 + (편집중 아님)인 경우:
      - `setPendingCropData(...)` 후 `setShowApplyToAllModal(true)`로 모달 오픈
    - 그 외(이미지/단일페이지/편집중)는 즉시 `applyCropArea(false, ...)` 호출
  - **참고**
    - 일반 모드에서 “전체 페이지 크롭 방지(40% 제한)”도 여기에서 수행

#### E) 저장된 영역 편집: ReactCrop만 움직이게 만들기(단일 진실원천)

- **파일**: `frontend/app/page.tsx`
  - **함수**: `handleCropAreaClick`
  - **검색 키워드**: `const handleCropAreaClick = useCallback`
  - **역할**
    - 저장된 영역 클릭 시 `cropPercent`가 있으면 **unit='%'** 로 `setCurrentCrop(...)`
    - `setCurrentCompletedCrop(area.completedCrop)` + `setEditingAreaId(areaId)`
    - 결과적으로 편집 모드에서 ReactCrop만 선택 박스로 표시되게 유도

#### F) 저장 오버레이 숨김(편집 중 충돌 방지) / UI 문구 분기

- **파일**: `frontend/app/page.tsx`
  - **검색 키워드**
    - `편집 모드에서는 저장된 오버레이를 숨기고 ReactCrop 박스만 보이게 해서`
    - `{editingAreaId ?`
    - `{editingAreaId && (`
  - **역할**
    - 편집 중에는 저장 오버레이를 숨기고 ReactCrop만 조작 가능하게 함
    - “영역 추가/업데이트” 버튼 라벨도 `editingAreaId` 기준으로 분기

#### G) 실제 이미지 크롭(blob 생성) - 원본/표시 크기 스케일링

- **파일**: `frontend/utils/cropUtils.ts`
  - **함수**: `cropImageToBlob(imageElement, cropArea, displaySize?)`
  - **검색 키워드**: `export async function cropImageToBlob`
  - **역할**
    - `naturalWidth/naturalHeight`와 `displayWidth/displayHeight` 비율로 원본 좌표로 변환
    - OCR 정확도를 위해 최소 해상도(600px) 및 약간의 업스케일 적용

---

## 12) 참고 파일

- 실행 스크립트: `start.sh`, `stop.sh`, `status.sh`
- 백엔드: `backend/main.py`, `backend/database.py`
- 프론트: `frontend/package.json`, `frontend/README.md`
- Ollama 상태 참고: `OLLAMA_STATUS.md`


