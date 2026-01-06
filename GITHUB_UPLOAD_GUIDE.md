# GitHub 업로드 가이드

## 현재 상태
✅ Git 저장소 초기화 완료
✅ 원격 저장소 연결 완료 (https://github.com/ilma1218/vLM.git)
✅ 초기 커밋 완료

## GitHub에 업로드하는 방법

### 방법 1: Personal Access Token 사용 (권장)

1. **GitHub에서 Personal Access Token 생성**
   - GitHub 웹사이트 접속: https://github.com
   - 우측 상단 프로필 클릭 → Settings
   - 좌측 메뉴에서 "Developer settings" 클릭
   - "Personal access tokens" → "Tokens (classic)" 선택
   - "Generate new token" → "Generate new token (classic)" 클릭
   - Note: "vLM project" 등 설명 입력
   - Expiration: 원하는 만료 기간 선택
   - Scopes: `repo` 체크박스 선택 (전체 저장소 권한)
   - "Generate token" 클릭
   - **생성된 토큰을 복사해두세요** (한 번만 보여집니다!)

2. **터미널에서 푸시**
   ```bash
   git push -u origin main
   ```
   - Username: `ilma1218` 입력
   - Password: **Personal Access Token** 입력 (일반 비밀번호가 아님!)

### 방법 2: SSH 키 사용 (더 편리함)

1. **SSH 키 생성 (아직 없다면)**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Enter 키를 눌러 기본 경로 사용
   # 비밀번호 입력 (선택사항)
   ```

2. **SSH 키를 GitHub에 등록**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # 출력된 공개키를 복사
   ```
   - GitHub → Settings → SSH and GPG keys
   - "New SSH key" 클릭
   - Title 입력, Key에 복사한 공개키 붙여넣기
   - "Add SSH key" 클릭

3. **원격 저장소를 SSH로 변경**
   ```bash
   git remote set-url origin git@github.com:ilma1218/vLM.git
   ```

4. **푸시**
   ```bash
   git push -u origin main
   ```

### 방법 3: GitHub CLI 사용

1. **GitHub CLI 설치 및 로그인**
   ```bash
   # Ubuntu/Debian
   sudo apt install gh
   
   # 로그인
   gh auth login
   ```

2. **푸시**
   ```bash
   git push -u origin main
   ```

## 앞으로 코드 업로드하는 일반적인 워크플로우

```bash
# 1. 변경된 파일 확인
git status

# 2. 변경된 파일 추가
git add .                    # 모든 파일
# 또는
git add 파일명               # 특정 파일만

# 3. 커밋 (변경사항 저장)
git commit -m "커밋 메시지"

# 4. GitHub에 업로드
git push origin main
```

## 유용한 Git 명령어

```bash
# 현재 상태 확인
git status

# 변경 이력 보기
git log

# 원격 저장소 확인
git remote -v

# 브랜치 확인
git branch

# 최신 변경사항 가져오기
git pull origin main
```

## 문제 해결

### 인증 오류가 발생하는 경우
- Personal Access Token이 만료되었는지 확인
- SSH 키가 올바르게 등록되었는지 확인
- `git remote -v`로 원격 저장소 URL 확인

### 충돌이 발생하는 경우
```bash
git pull origin main
# 충돌 해결 후
git add .
git commit -m "Merge conflict resolved"
git push origin main
```

