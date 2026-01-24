# vLM 개발/재현(Dev Environment Repro) 가이드

이 문서는 **다른 GPU 서버에서 현재 vLM 프로젝트를 동일하게 재현**할 수 있도록, 처음부터 끝까지 필요한 환경/버전/설치/실행/검증 절차와 주의사항을 정리합니다.

---

## 1) “동일한 상태”의 기준 (중요)

- **코드 동일**: 같은 Git 커밋/태그를 체크아웃해야 합니다.
  - 현재 원격 `origin/main` 최신 커밋: `acbdc1c`
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

## 2-B) 전체 서비스 “메뉴 구성”(Frontend 기준)

사용자가 실제로 만나는 화면/메뉴는 아래 구조입니다.

### 2-B.1 상단 네비게이션(Navbar)
- **홈**: `/`  
  - 업로드/크롭/OCR 워크스페이스 진입
  - 상단에는 “최근 절약 현황(전체 사용자 최신순)” 카드가 노출될 수 있음
- **요금제**: `/pricing`  
  - 플랜 선택/구매(현재는 실제 결제 없이 모의 구매 성공 처리)
- **히스토리**: `/monitor`  
  - 로그인 사용자의 OCR 저장 기록 조회/편집/삭제/다운로드/채팅
- **언어 선택**: 다국어 토글(한국어/영어/중국어(간체)/일본어/스페인어)
- **로그인/로그아웃**: 아이디/비밀번호 기반
- **크레딧/이용내역(모달)**: Navbar에서 열 수 있는 크레딧/사용내역 UI

### 2-B.2 핵심 페이지 구성(라우팅)
- **`/` (워크스페이스)**:
  - 파일 업로드(PDF/이미지)
  - 영역 지정(Crop) → OCR 실행 → 결과 확인 → **저장(`/history/save`)**
  - 저장 시 크레딧 차감(페이지당 10)
- **`/pricing` (요금제)**:
  - 플랜 키(`plan_key`)를 선택해 `/billing/purchase` 호출(모의 구매)
  - 구매 후 Navbar 크레딧 UI는 `billing:refresh` 이벤트로 즉시 갱신
- **`/monitor` (히스토리)**:
  - 사용자별로 저장된 OCR 기록만 표시(JWT 인증 기반)
  - 파일/세션 단위 그룹 뷰 + 레코드 단위 상세/편집/삭제

### 2-B.3 공개 통계(랜딩 상단 “최근 절약 현황”)
- **API**: `GET /public/recent-savings?limit=6`
- **특징**:
  - 인증 불필요
  - 사용자 이메일은 `user_email_masked`로 마스킹되어 노출
  - 최신순으로 카드 표시

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

#### DB 스크립트(배포 포함): 초기화/백업/복원

DB는 기본적으로 **백엔드 실행 시 자동으로 테이블 생성/스키마 보강**이 되지만,  
운영/이관을 위해 아래 스크립트를 레포에 포함해 두었습니다:

- **테이블 생성/스키마 보강(초기화)**:

```bash
cd /home/work/vLM
./scripts/db_init.sh
```

- **백업(실행 중에도 일관 스냅샷 생성)**:

```bash
cd /home/work/vLM
./scripts/db_backup.sh
```

기본 백업 경로: `backups/ocr_history-<UTC타임스탬프>.db`  
원하는 경로로 저장:

```bash
./scripts/db_backup.sh /home/work/vLM/backups/my-backup.db
```

- **복원(기존 DB 덮어쓰기 / 파괴적 작업)**: *권장: 백엔드 중지 후 실행*

```bash
cd /home/work/vLM
./scripts/db_restore.sh /home/work/vLM/backups/ocr_history-YYYYmmdd-HHMMSS.db
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
  - `credit_ledger`에 `reason="purchase_mock"`로 +delta 기록
  - `users.credits_balance` 증가
- **OCR 저장(`/history/save`)**:
  - `ocr_records`에 히스토리 저장(소유자 email 포함)
  - `credit_ledger`에 `reason="ocr_save_page_charge"`로 페이지당 -10 기록(유니크 제약으로 중복 차감 방지)
  - `users.credits_balance` 감소

### 6-A.5 가격/크레딧 체계(요금제) 설명

이 프로젝트의 결제/요금제는 현재 **실결제 없이 “모의 구매 성공”**으로 동작합니다.  
가격/크레딧 규칙은 백엔드의 `/billing/purchase` 구현을 기준으로 합니다.

#### 6-A.5.1 플랜 키(`plan_key`)와 크레딧 지급량

`POST /billing/purchase` 내부 `plan_catalog` (임시 매핑):
- `free`: +0 credits (₩0)
- `pro`: +1,000 credits (₩100,000)
- `expert`: +5,000 credits (₩300,000)
- `businessFlex`: +10,000 credits (₩300,000)
- `enterprise`: +무제한(매우 큰 값) credits (가격 미정)

> 프론트의 요금제 페이지(`/pricing`)에서 이 `plan_key`를 선택해 호출합니다.

#### 6-A.5.2 크레딧 차감 규칙(중요)

- **OCR 실행 자체는 차감하지 않습니다.**
- 사용자가 결과를 **저장(`/history/save`)** 할 때 크레딧을 차감합니다.
  - **차감 기준**: **페이지당 10 credits**
  - `credit_ledger.reason = "ocr_save_page_charge"`
  - 중복 차감 방지: `(email, reason, save_session_id, page_key)` UNIQUE
    - 동일한 저장 세션(`save_session_id`)에서 같은 페이지(`page_key`)는 1회만 차감되도록 방어

#### 6-A.5.3 구매/차감이 DB에 기록되는 방식

- 구매(모의):
  - `purchases`에 구매 이력 1행 추가
  - `credit_ledger`에 `delta=+credits_granted`, `reason="purchase_mock"`로 원장 기록
  - `users.credits_balance` 증가
- 저장(차감):
  - `ocr_records`에 OCR 결과 저장(`email`, `filename`, `page_number`, `save_session_id`)
  - `credit_ledger`에 `delta=-10`, `reason="ocr_save_page_charge"` 기록(페이지당)
  - `users.credits_balance` 감소

#### 6-A.5.4 이용내역 UI 집계(파일/세션 단위)

- 프론트 Navbar의 “크레딧/이용내역”은 `GET /billing/usage?mode=file`로 **파일/세션 기준 집계**를 사용합니다.
- 이 집계를 위해 `ocr_records.save_session_id`가 함께 저장됩니다.

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

### 13.8 “문서 미리보기/영역지정(워크스페이스) 페이지” 재구현 가이드 (처음부터 다시 만들기 전제)

이 섹션은 **다른 서버/다른 프로젝트에서 동일 UX를 다시 구현**할 수 있도록, 워크스페이스(`/`)의 요구사항을 “상태 모델 + 구현 순서 + API 계약”으로 정리합니다.

#### 13.8.0 “4단 분리” 설계 의도(영역지정 페이지를 다시 만들기 위한 핵심)

영역지정(워크스페이스) 페이지는 기능이 많아서 한 컴포넌트/한 흐름에 모두 섞으면 유지보수가 급격히 어려워집니다.  
현재 구현은 사용자 경험을 **4개의 단계(단)**로 분리해 “입력 → 선택 → 실행 → 확정(저장)”의 책임 경계를 명확히 둡니다.

- **1단: 문서 준비(업로드/렌더/페이지 이동)**
  - **목표**: OCR 대상 “원본”을 안정적으로 화면에 보여주고, 페이지 단위 컨텍스트를 만든다.
  - **입력**: 파일(PDF/이미지)
  - **출력/상태**: `isPdf`, `pdfCanvases`, `thumbnails`, `totalPages`, `currentPage`, `imageSrc`
  - **주의**: “렌더링/페이지 이동”은 OCR/저장 로직과 분리(페이지 이동이 OCR 결과를 깨지 않게)

- **2단: 영역 지정/관리(ReactCrop + 영역 리스트)**
  - **목표**: 사용자가 “어디를 읽을지”를 결정하고, 그 결정을 **% 좌표**로 영속화한다.
  - **입력**: 현재 페이지의 이미지/캔버스(표시 크기 포함)
  - **출력/상태**: `cropAreasByPage(Map)`, `CropAreaData.cropPercent(%)`, `completedCrop(px)`, `editingAreaId`, `pendingCropData`
  - **주의**:
    - 저장/복원/페이지 복사는 **% 좌표(`cropPercent`)** 기준
    - 실제 OCR 실행은 **px 좌표로 변환**(스케일링 포함)

- **3단: OCR 실행/수집(중지 가능)**
  - **목표**: (일반) 영역 단위, (고급) 영역 또는 페이지 전체 단위로 OCR을 수행하고 결과를 누적한다.
  - **입력**: `cropAreasByPage` 또는 `autoCollectFullPage`
  - **출력/상태**: `ocrResultsData`(저장 버튼 입력), `ocrResult`(화면 출력), `croppedPreviews`(썸네일), `processedPagesSet`, `AbortController`
  - **주의**:
    - OCR은 `/ocr`만 호출(크레딧/히스토리 변경 없음)
    - “중지”는 `AbortController.abort()`로 네트워크를 끊어 UI가 멈추지 않게

- **4단: 결과 확정(후처리/절약 계산/저장)**
  - **목표**: 결과 텍스트를 사용자에게 보여주고, 절약 시간을 계산한 뒤, 사용자가 원할 때만 저장한다.
  - **입력**: `ocrResultsData`, `ocrMode`, `extractKeys`, `processedPagesSet`, (일반 모드) `totalChars`
  - **출력/상태**: 절약 시간/금액(`timeSavedMinutes`, `moneySaved`), 저장 요청(`/history/save`), 크레딧 갱신 이벤트(`billing:refresh`)
  - **주의**:
    - 저장은 `/history/save` 단일 경로로 유지(크레딧 차감/중복 방지 정책 일관성)
    - OCR 완료 후 버튼 라벨은 “OCR 재실행”으로 전환(UX: 동일 설정으로 반복 실행 가능)

이 “4단 분리”를 지키면, **각 단을 독립적으로 디버깅/개선**할 수 있고(예: 크롭만 수정, OCR 파이프라인만 교체), 멀티파일/고급 모드 기능 확장 시에도 폭발적으로 복잡해지지 않습니다.

##### 13.8.0.1 워크스페이스 “4단(가로) 레이아웃” 폭 기준(재현용)

다른 시스템/해상도에서 동일 UX로 재구현할 때 가장 흔한 문제는 **Crop(메인 캔버스)만 과도하게 넓어지고**, “페이지 미리보기/선택영역”과 “일반/고급 모드 설정(우측)”이 상대적으로 눌리는 현상입니다.  
이를 방지하기 위해, 현재 구현은 **사이드 패널은 고정 폭(`shrink-0`)**, 메인 캔버스만 **유연 폭(`flex-1 min-w-0`)**으로 동작하도록 폭 규칙을 고정했습니다.

- **1단: 파일 목록(Left Sidebar)**
  - 폭: `w-64` (256px), `shrink-0`
- **2단: Crop 메인 캔버스(Main Viewer)**
  - 폭: `flex-1 min-w-0` (남는 폭을 사용하되, 옆 패널을 침범하지 않음)
- **3단: 선택영역/페이지 미리보기 패널(Selected Areas / Thumbnails)**
  - 폭: `w-80` (320px), `shrink-0`
- **4단: 우측 인스펙터(일반/고급 모드 설정 + 결과/저장)**
  - 폭: `w-[28rem]` (448px), `shrink-0`

- **수정/배포 기록**
  - 파일: `frontend/app/page.tsx`
  - 커밋: `697cf80` (`ui(workspace): rebalance 4-column widths`)

#### 13.8.1 구현 대상 기능(요구사항 체크리스트)

- **일반 모드 / 고급 모드**
  - 일반: “텍스트 전사(plain text)” 중심
  - 고급: “추출 항목(key:value)” 중심 + 프롬프트/양식 기능
- **선택영역(크롭) 미리보기**
  - 영역별로 크롭된 이미지를 우측에 리스트/썸네일로 보여주고, OCR 실행 시 갱신
- **OCR 결과 출력**
  - 영역/페이지별 결과를 누적해 하나의 출력으로 보여주기
- **추출항목 입력 및 삭제(태그 UX)**
  - Enter로 추가, Backspace로 마지막 태그 삭제, 중복 방지, 한글 조합 입력 처리
- **자주쓰는 양식(프리셋)**
  - “영수증/명함/세금계산서” 같이 즉시 적용 가능한 기본 프리셋
- **양식 저장/불러오기/삭제(서버 저장)**
  - 추출 항목 리스트를 이름 붙여 저장하고 불러오기
- **(선택) 고급 프롬프트 저장/불러오기/삭제(서버 저장)**
  - 커스텀 프롬프트 텍스트를 저장/불러오기
- **수집결과(결과 텍스트) + 절약한 시간/금액 계산**
  - 일반: 총 글자수 기반 \( \text{minutes}=\frac{\text{totalChars}}{180} \)
  - 고급: key:value 개수/페이지 기반 \( \text{minutes}=\frac{\text{keys} \times \text{pages} \times 10}{60} \)
  - 금액: \( \text{money}=\frac{\text{minutes}}{60}\times \text{hourlyWage} \)

##### 13.8.1.1 일반 모드(standard) — Data 구성 및 기능(상세)

일반 모드는 “사람이 문서를 보고 그대로 타이핑하는 전사 작업”을 대체하는 UX입니다.  
핵심은 **(1) 크롭으로 ‘읽을 영역’을 정하고 (2) OCR 결과를 “plain text”로 누적**하는 것입니다.

- **UI/입력**
  - **언어 선택(`selectedLanguage`)**: ko/en (일반 모드 프롬프트/후처리 톤에 영향)
  - **영역 선택(필수)**: `cropAreasByPage`에 저장된 영역들을 대상으로 OCR 수행
  - (PDF) 페이지 이동/썸네일/페이지별 영역 표시(페이지마다 영역 개수 뱃지)

- **OCR 호출 방식**
  - **단위**: “영역(크롭) 1개 = `/ocr` 1회”
  - **전송 데이터**: `file`(크롭 이미지 blob), `filename`, `page_number`, `custom_prompt`(일반 모드 기본 프롬프트)
  - **결과 형태**: `extracted_text`는 **plain text 문자열**(사용자에게 바로 보여줄 “전사 결과”)

- **결과 Data(프론트 내부)**
  - `ocrResult: string | null`
    - 화면 우측 결과 패널에 보여주는 “통합 결과 문자열”
    - 일반 모드는 사람이 복사/붙여넣기 하기 쉬운 형태(헤더 + 본문 누적)
  - `ocrResultsData[]`
    - 저장 버튼(`/history/save`)에 들어가는 “원자 데이터” (아래 13.8.1.3 참고)
  - `processedAreasCount`
    - 진행률/상태 UI에 사용(총 처리 영역 수)

- **핵심 기능**
  - **OCR 실행/중지/재실행**
    - 중지: `AbortController.abort()`로 네트워크 취소
    - OCR 완료 후 버튼 라벨을 “OCR 재실행”으로 바꿔 반복 실행 UX 제공
  - **절약 계산(일반 모드)**
    - 총 글자수(공백 포함) 기반으로 시간/금액 계산(13.8.7.2)
    - “영역 개수”가 아니라 “실제 입력해야 할 문자량”이 기준이라 설득력이 높음

##### 13.8.1.2 고급 모드(advanced) — Data 구성 및 기능(상세)

고급 모드는 “문서 내용을 사람이 **정해진 항목(키)으로 분해하여 정리**하는 작업”을 대체하는 UX입니다.  
핵심은 **(1) 추출 항목(keys)과 프롬프트를 구성하고 (2) 결과를 key:value 구조로 받는 것**입니다.

- **UI/입력**
  - **추출 항목 태그(`extractKeys: string[]`)**
    - Enter로 추가 / Backspace로 마지막 태그 삭제 / 중복 방지
    - 한글 IME 조합 입력은 `isComposing` 처리 필수(Enter 오작동 방지)
  - **자주쓰는 양식(프리셋)**
    - `PRESETS`(예: 영수증/명함/세금계산서 등) → `loadPreset()`로 keys 세트 즉시 구성
  - **양식 저장(서버)**
    - `GET/POST/DELETE /extract-keys`로 사용자별 “keys 리스트” 저장/불러오기/삭제
  - **(선택) 커스텀 프롬프트 + 저장**
    - `customPrompt` 직접 입력 + `GET/POST/DELETE /prompts`
  - **페이지 전체 자동수집(`autoCollectFullPage`)**
    - true면 “영역 없이 페이지 전체 이미지”를 대상으로 OCR (선택 영역이 없어도 진행 가능)

- **OCR 호출 방식**
  - **단위**
    - 기본: “영역(크롭) 1개 = `/ocr` 1회”
    - 옵션: “페이지 1개(전체) = `/ocr` 1회” (`autoCollectFullPage===true`)
  - **전송 데이터**: `file`, `filename`, `page_number`, `custom_prompt`
    - 고급 모드 `custom_prompt`는 보통 “keys 목록을 포함한 지시문”으로 생성/조합됨
  - **결과 형태**
    - `extracted_text`가 **JSON 문자열(또는 JSON에 준하는 텍스트)**일 수 있음
    - 즉, 일반 모드처럼 “그대로 복사할 문장”이 아니라 “구조화된 데이터”가 목표

- **결과 Data(프론트 내부)**
  - `ocrResult`
    - 화면 출력은 사람이 읽기 좋은 형태로 누적(예: 페이지/영역 헤더 + JSON 텍스트)
  - `ocrResultsData[]`
    - 저장에 필요한 원자 데이터는 동일 구조(단, `extracted_text` 내용이 구조화됨)
  - `processedPagesSet`
    - 특히 `autoCollectFullPage`에서 “실제 처리 페이지 수” 추적(절약 계산/상태 표시)

- **핵심 기능**
  - **keys 중심의 데이터 모델**
    - 고급 모드는 “keys(요구 스키마)가 바뀌면 결과 구조가 바뀌는” 설계이므로,
      UI에서 keys를 쉽게 편집/저장/재사용할 수 있어야 합니다.
  - **절약 계산(고급 모드)**
    - 현재 구현은 “키 개수(`extractKeys.length`) × 처리 페이지 수 × 10초” 근사(13.8.7.3)
    - 실제 pair 개수(파싱 기반)로 바꾸고 싶다면, `extracted_text` JSON 파싱 규칙부터 고정해야 함

##### 13.8.1.3 공통 Data 저장 단위(저장/히스토리 관점)

일반/고급 모드 모두 **저장(History)은 동일한 원자 데이터 구조로 처리**합니다.  
즉, 모드에 따라 “표현/내용”은 달라도 **저장 단위는 `ocrResultsData[]`(영역/페이지별 레코드)**로 통일됩니다.

- **`ocrResultsData`(권장 단일 소스)**
  - 형태: `Array<{ extracted_text, cropped_image(base64), filename, page_number|null }>`
  - 의미:
    - `extracted_text`: 일반=plain text / 고급=구조화(JSON 등)
    - `cropped_image`: 히스토리 썸네일 및 저장 데이터
    - `filename`, `page_number`: 파일/페이지 집계 및 히스토리 그룹핑 기준
- **저장 API**
  - `POST /history/save` (로그인 필요, 크레딧 차감/중복 방지 정책 포함)
  - `save_session_id`로 동일 세션 중복 차감 방지(백엔드 UNIQUE 제약)

#### 13.8.2 “어디를 보면 되나?” 파일/모듈 지도

- **워크스페이스(미리보기/크롭/OCR/결과/절약 계산)**: `frontend/app/page.tsx`
- **랜딩(파일 업로드 진입 상태)**: `frontend/components/LandingState.tsx`
- **PDF 렌더링 유틸**: `frontend/utils/pdfUtils.ts`
  - 검색 키워드: `renderPdfAllPagesToCanvases`, `getPdfPageCount`
- **크롭(blob 추출) 유틸**: `frontend/utils/cropUtils.ts`
  - 검색 키워드: `cropImageToBlob`
- **OCR/양식/프롬프트 API**: `backend/main.py`
  - 검색 키워드: `@app.post("/ocr")`, `@app.post("/extract-keys")`, `@app.post("/prompts")`, `@app.post("/history/save")`

#### 13.8.3 핵심 상태 모델(프론트) — “이 구조를 그대로 따라가면 재현이 쉬움”

- **문서/페이지 렌더 상태**
  - `isPdf`, `pdfFile`, `pdfCanvases`, `currentPage`, `totalPages`, `imageSrc`
  - 다중 파일을 지원하려면 `files`, `currentFileIndex`, `filesData(Map)`로 확장
- **영역 저장 구조(가장 중요)**
  - `cropAreasByPage: Map<number | undefined, CropAreaData[]>`
    - PDF: key=페이지번호(1..N)
    - 이미지: key=`undefined`
  - `CropAreaData` 필드 핵심:
    - `cropPercent` (% 좌표): **저장/복원/페이지 복사**의 기준
    - `completedCrop` (px 좌표): 즉시 UI/미리보기 생성에 사용
    - `pageNumber` (PDF에서 영역이 속한 페이지)
- **선택영역 미리보기(누수 방지 중요)**
  - `croppedPreviews: Map<string, string>` (areaId → `URL.createObjectURL(blob)` URL)
  - 영역 삭제/재실행 시 `URL.revokeObjectURL(url)`로 정리
- **모드/프롬프트/양식 상태**
  - `ocrMode: 'standard' | 'advanced'`
  - 일반 모드: `selectedLanguage`(ko/en) 기반 기본 프롬프트
  - 고급 모드: `extractKeys: string[]`(태그), `customPrompt`(커스텀), `autoCollectFullPage`(영역 없이 전체 페이지 자동수집)
  - 자주쓰는 양식(프리셋): `PRESETS` + `loadPreset()`
  - 서버 저장 양식: `savedExtractKeys` + CRUD(`/extract-keys`)
  - 서버 저장 프롬프트: `savedPrompts` + CRUD(`/prompts`)
- **OCR 결과/저장 상태**
  - `ocrResult: string | null` (화면에 출력되는 통합 결과)
  - `ocrResultsData: Array<{ extracted_text, cropped_image(base64), filename, page_number|null }>` (**저장 버튼**의 입력)
  - `processedAreasCount`, `processedPagesSet`: 절약 계산의 “실제 처리량” 추적
  - `OCR_RESULT_STORAGE_KEY`: 새로고침에도 결과를 남기려면 localStorage 동기화

#### 13.8.4 재구현 순서(추천) — 이 순서가 가장 덜 헤맵니다

1) **UI 뼈대부터**
   - 좌측: 문서 미리보기(이미지/PDF 페이지)
   - 우측: 모드/양식/결과/액션(실행/저장) 패널

2) **파일 업로드 → PDF/이미지 렌더**
   - PDF면 `getPdfPageCount()` → `renderPdfAllPagesToCanvases()`로 모든 페이지 캔버스 생성
   - 현재 페이지 캔버스를 `imageSrc`(dataURL)로 만들어 `<img>`에 보여주거나 `<canvas>`를 그대로 노출

3) **ReactCrop으로 영역 지정 + % 좌표 저장**
   - `onComplete`에서 `percentCrop`을 받아 `cropPercent`로 저장
   - **저장은 %**, 실제 크롭 실행은 px(원본/표시 스케일링 포함)로 변환
   - 편집 UX: `editingAreaId`를 두고 “오버레이 vs ReactCrop” 충돌을 방지

4) **영역 리스트/편집/삭제 + (PDF) 전체 페이지 적용**
   - 페이지 이동 시 해당 페이지에 영역이 없으면 첫 페이지 영역을 복사하는 전략(UX 안정)
   - “전체 적용 모달”은 `pendingCropData`로 현재 crop을 캡처해 두고, 확인 시 `applyCropArea(true, cropData)`로 생성

##### 13.8.4.1 (PDF) “영역 지정 후 다른 페이지 적용 여부” 결정 로직(중요)

다중 페이지 PDF에서 사용자가 영역을 한 번 지정했을 때, 그 영역을 **현재 페이지에만 적용할지 / 모든 페이지에 적용할지**를 사용자가 선택하도록 되어 있습니다.  
또한 “페이지별로 반복 지정” 부담을 줄이기 위해, **특정 페이지에 영역이 없으면 1페이지 영역을 자동 복사**하는 보조 로직이 함께 동작합니다.

- **A) 수동 선택: ‘현재 페이지만’ vs ‘모든 페이지’(Apply-to-all 모달)**
  - **트리거**
    - 사용자가 ReactCrop으로 박스를 만든 뒤 “영역 추가”를 누를 때
    - 조건: `isPdf && totalPages > 1 && !editingAreaId`
      - PDF이고, 페이지가 2장 이상이며, “편집 중(기존 영역 업데이트)”이 아닐 때만 모달을 띄웁니다.
  - **데이터 캡처(pending)**
    - 모달을 띄우기 전에, 현재 크롭을 아래 형태로 `pendingCropData`에 저장합니다.
      - `cropPercent`: 0~100% 좌표(저장/복원/페이지 복사 기준)
      - `finalCrop`: 현재 표시 크기 기준 px 좌표(즉시 UI 표시용)
  - **사용자 선택 → 적용 함수**
    - “현재 페이지만”: `applyCropArea(false, pendingCropData)`
    - “모든 페이지”: `applyCropArea(true, pendingCropData)`
  - **적용(추가) 규칙**
    - `applyToAllPages === true`면 1..N 모든 페이지에 동일한 `cropPercent`를 추가합니다.
    - 각 페이지에 들어가는 레코드는 `pageNumber`만 다르고, “같은 모양의 영역”이 페이지마다 생성되는 구조입니다.
  - **편집 모드 예외**
    - `editingAreaId !== null`인 경우는 “다른 페이지 적용”이 아니라 **현재 페이지의 해당 영역만 업데이트**합니다.
    - 이때는 모달을 띄우지 않고, `cropPercent`/`completedCrop(px)`를 해당 영역에 덮어씁니다.

- **B) 자동 보조: ‘영역이 없는 페이지’에 1페이지 영역 자동 복사(UX 안정)**
  - **목표**: 사용자가 페이지마다 매번 영역을 다시 그리지 않도록, “기본 템플릿”처럼 1페이지 영역을 재사용합니다.
  - **동작 시점(대표 2곳)**
    - 페이지 이동(`handlePageChange(newPage)`) 직후, 해당 페이지에 저장된 영역이 없으면 복사
    - 이미지 로드(`onImageLoad`) 시, 현재 페이지에 영역이 없고 `currentPage > 1`이면 복사
  - **복사 조건(핵심)**
    - `newPage > 1`
    - `newPageAreas.length === 0` (대상 페이지에 영역이 아직 없음)
    - `firstPageAreas.length > 0` (1페이지에 영역이 존재)
    - OCR 처리 중이 아닐 때만 복원/세팅(`!isProcessing`)하여 UI가 흔들리지 않게 함
  - **복사 데이터**
    - 1페이지의 각 영역에서 **`cropPercent`를 그대로 복제**하고 `pageNumber`를 대상 페이지로 바꿉니다.
    - UI 표시를 위해 대상 페이지의 현재 이미지 크기에 맞춰 `completedCrop(px)`도 다시 계산해 넣습니다.
  - **UI 초기 선택**
    - 복사 후(또는 이미 영역이 있으면) “첫 번째 영역”을 현재 크롭으로 세팅해 사용자가 즉시 미세조정할 수 있게 합니다.

> 구현 위치 참고: `frontend/app/page.tsx`의 `addCropArea`(모달 트리거), `applyCropArea`(적용), `handlePageChange`/`onImageLoad`(1페이지 영역 자동 복사)

5) **선택영역 미리보기 만들기**
   - OCR 실행 시 각 영역의 Blob을 만들고 `URL.createObjectURL(blob)`로 미리보기 URL 생성
   - `croppedPreviews(area.id) = url`
   - 삭제/재실행/언마운트 시 revoke(메모리 누수 방지)

6) **일반/고급 모드 + 추출항목 태그 UX**
   - `addKeyTag() / removeKeyTag()`로 태그 추가/삭제
   - 한글 IME: `e.nativeEvent.isComposing` 및 `onCompositionStart/End` 처리 필수(Enter 오작동 방지)
   - Backspace UX: 입력값이 비었을 때 마지막 태그 삭제

7) **자주쓰는 양식(프리셋) + 양식 저장(서버)**
   - 프리셋: `PRESETS` 상수 + `loadPreset(presetName)`
   - 서버 저장:
     - 최초 로드: `fetchExtractKeys()` → `GET /extract-keys`
     - 저장: `saveExtractKeysToList(name, keys)` → `POST /extract-keys`
     - 불러오기/삭제: `loadSavedExtractKeys(keys)` / `DELETE /extract-keys/{id}`

8) **OCR 실행 파이프라인(가장 중요)**
   - `AbortController`를 두고 “중지” 버튼에서 abort 처리
   - **영역 OCR(기본)**:
     - (PDF) `canvas = pdfCanvases[page-1]`에서 `cropPercent → cropArea(px)` 변환
     - (이미지) `imgRef.current` + 표시 크기(`getBoundingClientRect`)를 `cropImageToBlob(..., displaySize)`에 전달
     - `POST /ocr`(FormData) 호출 후 결과를 `ocrResultsData`에 누적, `ocrResult`에 문자열 누적
   - **고급 모드 전체 자동수집(옵션)**:
     - `ocrMode==='advanced' && autoCollectFullPage===true`면 영역 없이 페이지 전체 이미지를 그대로 `/ocr`로 전송

9) **결과 출력 + 절약 계산(표시 문구 포함)**
   - 총 글자수: 가능하면 `ocrResultsData.reduce(sum(len(extracted_text)))` 사용(정확)
   - 일반 시간(분): `totalChars / 180`
   - 고급 시간(분): `(extractKeys.length * 실제처리페이지수 * 10) / 60`
   - 금액(원): `(timeSavedMinutes/60) * 10320`
   - 출력 주석(요구사항): `(CPM - Characters Per Minute)` 포함

10) **저장(History) + 크레딧 갱신**
   - 저장은 OCR 실행과 분리(중요): OCR은 `/ocr`만 호출, **저장은 `/history/save`**에서만 수행
   - 저장 시 `save_session_id`를 생성해 같은 세션의 페이지 차감을 중복 방지(백엔드 UNIQUE 제약)
   - 저장 성공 후 `window.dispatchEvent(new Event('billing:refresh'))`로 Navbar 크레딧 UI 즉시 갱신
   - 버튼 라벨: OCR 결과가 있으면 **“OCR 재실행”**, 없으면 “OCR 실행”

#### 13.8.5 백엔드 API 계약(재구현에 필요한 최소 스펙)

- **OCR 실행**: `POST /ocr` (multipart/form-data)
  - 입력:
    - `file`: (png/jpg 등 이미지 blob)
    - `filename`: 원본 파일명
    - `page_number`: PDF 페이지 번호(1..N), 이미지면 0 또는 생략
    - `custom_prompt`: (선택) 커스텀 프롬프트
  - 출력(JSON):
    - `extracted_text`: 추출 텍스트(고급 모드면 JSON 문자열일 수 있음)
    - `cropped_image`: base64 이미지(저장/히스토리 썸네일용)
    - `filename`, `page_number`

- **추출 항목(양식) CRUD**:
  - `GET /extract-keys`
  - `POST /extract-keys` body: `{ "name": string, "keys": string[] }`
  - `DELETE /extract-keys/{id}`

- **프롬프트 CRUD(선택)**:
  - `GET /prompts`
  - `POST /prompts` body: `{ "name": string, "prompt": string }`
  - `DELETE /prompts/{id}`

- **OCR 결과 저장(로그인 필요)**: `POST /history/save` (multipart/form-data)
  - 헤더: `Authorization: Bearer <JWT>`
  - 입력:
    - `extracted_text`, `cropped_image`, `filename`, `page_number?`
    - `user_email` (프론트에서 전달하지만, 서버는 JWT 이메일을 기준으로 필터링/저장)
    - `save_session_id` (중복 차감 방지/파일 집계 기준)

#### 13.8.6 재구현 시 자주 깨지는 포인트(실수 방지)

- **% vs px 혼용**: 저장은 %(`cropPercent`), 실행은 px(스케일링 포함)로 분리하지 않으면 PDF/반응형에서 깨집니다.
- **ObjectURL 누수**: `croppedPreviews`는 반드시 `revokeObjectURL`로 정리(삭제/재실행/언마운트).
- **한글 태그 입력**: `isComposing` 미처리 시 Enter로 태그가 중복 추가되거나 입력이 끊깁니다.
- **OCR과 저장 분리**: `/ocr`에서 자동 저장하면 크레딧 차감/히스토리 정책이 꼬입니다. 저장은 `/history/save` 단일 경로로 유지.
- **“OCR 재실행” 분기**: 결과가 있을 때만 라벨/동작이 재실행 UX가 됩니다.

#### 13.8.7 예상 “시간 절약 / 금액 절약” 계산기 — 작동원리와 수식(재구현용)

이 계산기는 “OCR 결과를 사람이 직접 문서에서 옮겨 적거나(key:value로 정리) 하는 데 드는 시간”을 **근사치**로 환산합니다.  
표시 위치는 워크스페이스 우측 결과 패널이며, 구현은 `frontend/app/page.tsx`의 **Money Saved Calculator** 블록(검색 키워드: `MINIMUM_WAGE_PER_HOUR`, `TYPING_CPM`, `timeSavedMinutes`, `moneySaved`)입니다.

##### 13.8.7.1 공통 상수/입력값 정의

- **시급(원/시간)**: \(W = 10{,}320\)  *(코드: `MINIMUM_WAGE_PER_HOUR = 10320`)*
- **타이핑 속도(CPM)**: \(C = 180\) *(코드: `TYPING_CPM = 180`)*  
  - 주석/문구 요구사항: **(CPM - Characters Per Minute)** / “분당 약 180타(180 CPM)”
- **총 글자수(일반 모드에 사용)**:
  - 1순위: `ocrResultsData[].extracted_text`의 총 길이 합
  - 2순위(폴백): 화면에 표시되는 통합 `ocrResult` 문자열 길이
- **키:값 개수(고급 모드에 사용)**:
  - 현재 구현은 `extractKeys.length`를 사용(즉, 사용자가 설정한 “추출 항목 수”)
- **실제 처리 페이지 수**
  - 1순위: `processedPagesSet.size` (OCR 실행 중 실제로 처리된 페이지를 추적)
  - 2순위(폴백): PDF면 `totalPages`, 이미지면 1

##### 13.8.7.2 일반 모드(standard) — “총 글자수 ÷ 180CPM”

일반 모드는 영역 개수보다 “실제로 입력해야 하는 글자 수”에 시간이 비례한다고 보고 계산합니다.

- **절약 시간(분)**:
  \[
  T_{\text{min}}=\frac{\text{totalChars}}{C}
  \]
- **절약 금액(원)**:
  \[
  M=\frac{T_{\text{min}}}{60}\times W
  \]
- **출력 예시 문구(현재 UI 컨셉)**:
  - `(총 글자수 N자 ÷ 180CPM  / 시급기준 10,320원)`
  - `(CPM - Characters Per Minute)`

##### 13.8.7.3 고급 모드(advanced) — “키:값 × 페이지 × 10초”

고급 모드는 key:value 항목을 사람 손으로 정리/입력한다고 가정하고, “항목 1개당 페이지당 10초”로 근사합니다.

- **절약 시간(초)**:
  \[
  T_{\text{sec}}=\text{keyCount}\times \text{pages}\times 10
  \]
- **절약 시간(분)**:
  \[
  T_{\text{min}}=\frac{T_{\text{sec}}}{60}
  \]
- **절약 금액(원)**:
  \[
  M=\frac{T_{\text{min}}}{60}\times W
  \]
- **주의(재구현 시 결정 포인트)**:
  - 현재 구현의 `keyCount`는 “실제 추출된 pair 개수”가 아니라 **사용자가 지정한 추출 항목 수(`extractKeys.length`)** 입니다.  
    “실제 pair 개수(파싱 기반)”로 바꾸려면 `extracted_text` JSON 파싱/키 개수를 세는 로직을 별도로 정의해야 합니다.

##### 13.8.7.4 멀티파일/자동수집 모드에서의 처리량 산정 원칙

- **멀티파일 업로드**:
  - OCR 결과 문자열은 파일/페이지 헤더를 붙여 누적(`allResults.push(...)`)하되,
  - 절약 계산은 가급적 `ocrResultsData` 기반(=실제 결과 단위)으로 계산하는 것이 안정적입니다.
- **고급 모드 “페이지 전체 자동수집”**:
  - 영역 개수 대신 페이지를 1개 결과 단위로 처리하며 `processedPagesSet`으로 실제 처리 페이지를 추적합니다.
  - 이 경우에도 고급 모드 수식은 동일하게 적용됩니다(키:값 × 처리 페이지 × 10초).

---

## 12) 참고 파일

- 실행 스크립트: `start.sh`, `stop.sh`, `status.sh`
- 백엔드: `backend/main.py`, `backend/database.py`
- 프론트: `frontend/package.json`, `frontend/README.md`
- Ollama 상태 참고: `OLLAMA_STATUS.md`


