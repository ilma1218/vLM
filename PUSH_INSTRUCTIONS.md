# GitHub 푸시 방법

## 현재 상황
- Git 저장소 초기화 완료 ✅
- 원격 저장소 연결 완료 ✅
- 초기 커밋 완료 ✅
- SSH 키가 읽기 전용으로 설정되어 있어 HTTPS 방식 사용 필요

## GitHub에 업로드하기

### 1단계: Personal Access Token 생성

1. GitHub 웹사이트 접속: https://github.com
2. 우측 상단 프로필 아이콘 클릭 → **Settings**
3. 좌측 메뉴 하단에서 **Developer settings** 클릭
4. **Personal access tokens** → **Tokens (classic)** 선택
5. **Generate new token** → **Generate new token (classic)** 클릭
6. 설정:
   - **Note**: "vLM project" (설명)
   - **Expiration**: 원하는 기간 선택 (예: 90 days)
   - **Scopes**: `repo` 체크박스 선택 (모든 저장소 권한)
7. **Generate token** 클릭
8. **생성된 토큰을 복사** (한 번만 보여집니다!)

### 2단계: 터미널에서 푸시

```bash
cd /home/work/vLM
git push -u origin main
```

**입력 요청 시:**
- **Username**: `ilma1218`
- **Password**: **복사한 Personal Access Token** 입력 (일반 비밀번호가 아님!)

### 3단계: 성공 확인

GitHub 웹사이트에서 https://github.com/ilma1218/vLM 접속하여 파일이 업로드되었는지 확인하세요.

## 앞으로 코드 업로드하는 방법

```bash
# 1. 변경사항 확인
git status

# 2. 파일 추가
git add .

# 3. 커밋
git commit -m "변경사항 설명"

# 4. GitHub에 업로드
git push origin main
```

## 참고사항

- Personal Access Token은 비밀번호처럼 안전하게 보관하세요
- 토큰이 만료되면 새로 생성해야 합니다
- 더 편리하게 사용하려면 GitHub CLI (`gh`) 설치를 고려하세요

