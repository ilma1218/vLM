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

## 12) 참고 파일

- 실행 스크립트: `start.sh`, `stop.sh`, `status.sh`
- 백엔드: `backend/main.py`, `backend/database.py`
- 프론트: `frontend/package.json`, `frontend/README.md`
- Ollama 상태 참고: `OLLAMA_STATUS.md`


