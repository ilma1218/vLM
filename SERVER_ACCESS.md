# 서버 접근 설정 가이드

## 서버 정보
- 서버 IP: `172.17.0.3`
- Frontend URL: `http://172.17.0.3:3000`
- Backend URL: `http://172.17.0.3:8000`

## 설정 방법

### 1. Frontend 실행 (외부 접근 가능)

Frontend는 이미 `0.0.0.0`으로 바인딩되도록 설정되어 있습니다:

```bash
cd frontend
npm run dev
```

이제 `http://172.17.0.3:3000`으로 접근할 수 있습니다.

### 2. Backend 실행

Backend는 기본적으로 모든 인터페이스에서 접근 가능합니다:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 환경 변수 설정 (선택사항)

Frontend에서 Backend URL을 명시적으로 설정하려면:

```bash
cd frontend
cp .env.local.example .env.local
# .env.local 파일을 편집하여 서버 IP 주소로 변경
```

`.env.local` 파일 내용:
```
NEXT_PUBLIC_BACKEND_URL=http://172.17.0.3:8000
```

### 4. 방화벽 설정

서버에 방화벽이 활성화되어 있다면 포트를 열어야 합니다:

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp

# 또는 iptables 사용 시
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT
```

## 접근 방법

1. **로컬에서 접근**: `http://localhost:3000`
2. **같은 네트워크에서 접근**: `http://172.17.0.3:3000`
3. **외부에서 접근**: 서버의 공인 IP 주소 사용 (포트 포워딩 필요할 수 있음)

## 문제 해결

### CORS 오류가 발생하는 경우
- Backend의 `main.py`에서 `allow_origins`에 접근하는 주소를 추가하세요.

### 연결이 안 되는 경우
1. 서버 IP 주소 확인: `hostname -I`
2. 포트가 열려있는지 확인: `netstat -tuln | grep -E '3000|8000'`
3. 방화벽 설정 확인

