from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import ollama
import base64
import re
import io
import json
import subprocess
import tempfile
import os
from pathlib import Path
from PIL import Image
from database import init_db, get_db, OCRRecord, Prompt, ExtractKeys, UserAccount, Purchase, CreditLedger, SessionLocal, UserAuth
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

app = FastAPI(title="Region-Specific OCR Service")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://172.17.0.3:3000",  # 서버 IP 주소
        "*"  # 개발 환경에서는 모든 origin 허용 (프로덕션에서는 제거 권장)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 초기화
init_db()

#
# Auth (ID/Password + JWT)
#
# bcrypt는 환경에 따라(passlib/bcrypt 버전 조합) 백엔드 호환성 문제가 발생할 수 있어
# 기본 내장 구현으로 안정적인 pbkdf2_sha256을 사용합니다.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# 개발 기본값. 운영 환경에서는 반드시 환경변수로 설정하세요.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "10080"))  # 기본 7일


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def _create_access_token(email: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=JWT_EXPIRES_MINUTES)
    payload = {"sub": email, "iat": int(now.timestamp()), "exp": int(exp.timestamp())}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _get_email_from_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def require_auth_email(authorization: Optional[str]) -> str:
    email = _get_email_from_bearer(authorization)
    if not email:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    return email.strip().lower()


class AuthSignupRequest(BaseModel):
    email: str
    password: str


class AuthLoginRequest(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    email: str
    name: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


@app.post("/auth/signup", response_model=AuthResponse)
def auth_signup(payload: AuthSignupRequest, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    password = payload.password or ""

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="올바른 이메일(아이디)을 입력해주세요.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="비밀번호는 최소 6자 이상이어야 합니다.")

    existing_auth = db.query(UserAuth).filter(UserAuth.email == email).first()
    if existing_auth:
        raise HTTPException(status_code=409, detail="이미 가입된 아이디입니다.")

    # 크레딧/플랜(UserAccount)이 이미 있더라도(예: user@example.com 시드),
    # 비밀번호 인증(UserAuth)이 없다면 회원가입(비밀번호 설정)을 허용합니다.
    user_account = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user_account:
        user_account = UserAccount(email=email, plan_key=None, credits_balance=0)
        db.add(user_account)

    auth_row = UserAuth(email=email, password_hash=_hash_password(password))
    db.add(auth_row)
    db.commit()

    token = _create_access_token(email)
    return AuthResponse(
        access_token=token,
        user=AuthUser(email=email, name=email.split("@")[0]),
    )


@app.post("/auth/login", response_model=AuthResponse)
def auth_login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    password = payload.password or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="아이디/비밀번호를 입력해주세요.")

    auth_row = db.query(UserAuth).filter(UserAuth.email == email).first()
    if not auth_row or not _verify_password(password, auth_row.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    token = _create_access_token(email)
    return AuthResponse(
        access_token=token,
        user=AuthUser(email=email, name=email.split("@")[0]),
    )


@app.get("/auth/me", response_model=AuthUser)
def auth_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    email = _get_email_from_bearer(authorization)
    if not email:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")

    # 계정 존재 여부 확인 (크레딧/플랜 관리용)
    user_account = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user_account:
        # 토큰은 유효하지만 계정이 없다면 생성(방어)
        user_account = UserAccount(email=email, plan_key=None, credits_balance=0)
        db.add(user_account)
        db.commit()

    return AuthUser(email=email, name=email.split("@")[0])


def seed_default_user(db: Session):
    """
    개발 기본 계정(user@example.com)을 Expert 구매 상태로 시드합니다.
    - Expert 구매 1회(5,000 credits) 없으면 생성
    - 사용자 계정 없으면 생성
    - 이미 구매 이력이 있으면 중복 지급하지 않음
    """
    email = "user@example.com"
    plan_key = "expert"
    credits_granted = 5000
    amount_krw = 300000

    user = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user:
        user = UserAccount(email=email, plan_key=plan_key, credits_balance=0)
        db.add(user)
        db.flush()

    existing_purchase = (
        db.query(Purchase)
        .filter(Purchase.email == email, Purchase.plan_key == plan_key)
        .first()
    )

    if not existing_purchase:
        purchase = Purchase(
            email=email,
            plan_key=plan_key,
            amount_krw=amount_krw,
            credits_granted=credits_granted,
        )
        db.add(purchase)

        user.plan_key = plan_key
        user.credits_balance = (user.credits_balance or 0) + credits_granted

        db.add(
            CreditLedger(
                email=email,
                delta=credits_granted,
                reason="purchase",
                filename=None,
                page_key=-1,
                save_session_id=f"seed-{plan_key}",
                meta=json.dumps(
                    {"plan_key": plan_key, "amount_krw": amount_krw, "credits_granted": credits_granted},
                    ensure_ascii=False,
                ),
            )
        )

    db.commit()


@app.on_event("startup")
def _startup_seed_user():
    """
    개발 편의: 서버 시작 시 기본 계정(user@example.com)을 Expert 구매 상태로 시드합니다.
    - uvicorn reload 환경에서도 함수 정의 순서 문제 없이 안전하게 실행되도록 startup hook을 사용
    """
    db = SessionLocal()
    try:
        seed_default_user(db)
        print("[billing] seeded default user: user@example.com (expert, 5000 credits)")
    except Exception as e:
        # 시드 실패가 서비스 전체를 죽이지 않도록 방어
        print(f"[billing] seed_default_user failed: {e}")
    finally:
        try:
            db.close()
        except Exception:
            pass


def clean_ocr_response(text: str) -> str:
    """
    OCR 응답에서 불필요한 설명이나 따옴표를 제거하고, 중복 라인을 제거합니다.
    """
    # "The image contains the text "..." 형식 제거
    text = re.sub(r'^The image contains the text\s*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^The text in the image is\s*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^The image shows the text\s*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^Here is the text from the image\s*[:]?\s*["\']', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^Extracted text\s*[:]?\s*["\']', '', text, flags=re.IGNORECASE)
    
    # 끝에 있는 따옴표 제거
    text = re.sub(r'["\']\s*$', '', text)
    
    # "..." 형식에서 실제 텍스트만 추출
    quoted_match = re.search(r'["\']([^"\']+)["\']', text)
    if quoted_match:
        text = quoted_match.group(1)
    
    # 잘림 표시 제거 (..., … 등)
    text = re.sub(r'\.\.\.\s*$', '', text)
    text = re.sub(r'…\s*$', '', text)
    text = re.sub(r'\.\.\s*$', '', text)
    text = re.sub(r'\s*by\s+c\.\.\.\s*$', '', text, flags=re.IGNORECASE)  # "by c..." 형식 제거
    
    # 같은 라인 내에서 문구 반복 제거
    # 예: "광고 프로젝트의 진행 및 광고 프로젝트의 진행 및 ..." -> "광고 프로젝트의 진행 및"
    def remove_repeated_phrases(text_line: str) -> str:
        """
        같은 라인 내에서 반복되는 문구를 제거합니다.
        """
        if not text_line or len(text_line.strip()) < 10:
            return text_line
        
        # 방법 1: 정규표현식으로 같은 문구가 3번 이상 반복되는 패턴 찾기
        # 최소 5자 이상의 문구가 공백으로 구분되어 반복되는 경우
        # 예: "광고 프로젝트의 진행 및 광고 프로젝트의 진행 및 ..."
        pattern = r'(.{5,}?)(?:\s+\1){2,}'
        
        def replace_repeat(match):
            # 반복된 문구를 한 번만 반환
            return match.group(1)
        
        result = re.sub(pattern, replace_repeat, text_line)
        
        # 방법 2: 단어 그룹 반복 확인 (더 정확한 감지)
        # 2-8개 단어로 구성된 그룹이 3번 이상 반복되는 경우
        words = result.split()
        if len(words) > 15:  # 충분히 긴 경우만 검사
            # 역순으로 검사하여 가장 긴 반복 패턴부터 찾기
            max_group_size = min(8, len(words) // 3)
            
            for group_size in range(max_group_size, 1, -1):  # 큰 그룹부터 작은 그룹까지
                i = 0
                while i <= len(words) - group_size * 3:
                    group = words[i:i + group_size]
                    
                    # 이 그룹이 연속으로 몇 번 반복되는지 확인
                    repeat_count = 1
                    pos = i + group_size
                    
                    while pos + group_size <= len(words):
                        next_group = words[pos:pos + group_size]
                        if next_group == group:
                            repeat_count += 1
                            pos += group_size
                        else:
                            break
                    
                    # 3번 이상 반복되면 첫 번째만 유지하고 나머지 제거
                    if repeat_count >= 3:
                        # 반복된 부분 제거
                        new_words = words[:i + group_size]
                        new_words.extend(words[i + group_size * repeat_count:])
                        words = new_words
                        # 다시 처음부터 검사
                        i = 0
                        continue
                    
                    i += 1
                
                # 반복 패턴을 찾았으면 더 작은 그룹은 검사하지 않음
                if len(words) < len(result.split()):
                    break
            
            result = ' '.join(words)
        
        return result
    
    # 비정상적으로 긴 숫자 시퀀스 제거 (같은 라인 내에서 숫자가 10개 이상 반복되는 경우)
    # 예: "10, 11, 12, 13, ... 365," -> 제거
    lines = text.split('\n')
    cleaned_lines = []
    
    for line in lines:
        # 문구 반복 제거 먼저 수행
        line = remove_repeated_phrases(line)
        # 숫자 시퀀스 패턴 찾기 (예: "10, 11, 12, 13" 또는 "10,11,12,13")
        # 숫자가 10개 이상 연속으로 나오는 경우를 감지
        # 더 강력한 패턴: 숫자, 콤마, 공백이 반복되는 패턴
        number_sequence_pattern = r'(\d+\s*[,，]\s*){10,}'
        
        # 숫자 시퀀스가 있는지 확인
        match = re.search(number_sequence_pattern, line)
        if match:
            start_pos = match.start()
            
            # 숫자 시퀀스 시작 전의 텍스트 확인
            before_text = line[:start_pos]
            
            # 숫자 시퀀스가 시작된 이후의 모든 숫자 시퀀스 길이 확인
            # 숫자 시퀀스 부분 추출
            sequence_part = line[start_pos:]
            # 숫자 개수 세기
            numbers_in_sequence = re.findall(r'\d+', sequence_part)
            
            # 숫자가 10개 이상이면 제거
            if len(numbers_in_sequence) >= 10:
                # 괄호가 열려있는지 확인
                open_paren_count = before_text.count('(') - before_text.count(')')
                
                if open_paren_count > 0:
                    # 괄호 안의 숫자 시퀀스인 경우
                    # 괄호 시작 부분을 찾아서 숫자 시퀀스 전까지 유지
                    last_open_paren = before_text.rfind('(')
                    if last_open_paren >= 0:
                        # 괄호 시작부터 숫자 시퀀스 전까지의 텍스트 유지
                        # 예: "소재지 대전 유성구 (카인 : 10, 11, ..." -> "소재지 대전 유성구 (카인 :"
                        line = line[:start_pos].rstrip()
                        # 끝에 불필요한 구두점 제거 (콜론은 유지)
                        line = re.sub(r'[,\s]+$', '', line)
                        # 닫는 괄호가 없으면 추가하지 않음 (원본 텍스트 유지)
                    else:
                        # 괄호가 없거나 찾을 수 없는 경우, 숫자 시퀀스 시작 전까지 유지
                        line = line[:start_pos].rstrip()
                        line = re.sub(r'[,\s:：]+$', '', line)
                else:
                    # 괄호 밖의 숫자 시퀀스인 경우
                    # 숫자 시퀀스 시작 전까지의 텍스트만 유지
                    line = line[:start_pos].rstrip()
                    # 끝에 불필요한 구두점 제거
                    line = re.sub(r'[,\s:：]+$', '', line)
        
        # 추가 검사: 라인 전체가 숫자 시퀀스로만 구성되어 있는 경우 제거
        if line.strip():
            # 라인이 숫자와 콤마, 공백만으로 구성되어 있고 길이가 매우 긴 경우
            if re.match(r'^[\s\d,，]+$', line) and len(line) > 50:
                # 숫자가 10개 이상인지 확인
                numbers = re.findall(r'\d+', line)
                if len(numbers) >= 10:
                    # 이 라인은 완전히 제거
                    continue
        
        cleaned_lines.append(line)
    
    text = '\n'.join(cleaned_lines)
    
    # 중복 라인 제거 (연속된 동일한 라인 제거)
    lines = text.split('\n')
    cleaned_lines = []
    prev_line = None
    
    for line in lines:
        line_stripped = line.strip()
        # 빈 라인은 유지하되, 연속된 빈 라인은 하나만 유지
        if not line_stripped:
            if cleaned_lines and cleaned_lines[-1].strip():
                cleaned_lines.append('')
            continue
        
        # 이전 라인과 동일하지 않으면 추가
        if line_stripped != prev_line:
            cleaned_lines.append(line)
            prev_line = line_stripped
    
    text = '\n'.join(cleaned_lines)
    
    # 여러 줄 패턴의 반복 제거
    # 예: "A\nB\nA\nB\nA\nB" -> "A\nB"
    lines = text.split('\n')
    if len(lines) > 4:  # 최소 4줄 이상일 때만 패턴 검사
        # 패턴 길이를 2부터 전체의 절반까지 시도
        max_pattern_length = min(len(lines) // 2, 10)  # 최대 10줄 패턴까지 검사
        
        for pattern_len in range(2, max_pattern_length + 1):
            # 패턴이 반복되는지 확인
            pattern = lines[:pattern_len]
            # 빈 줄을 제외한 패턴 텍스트 생성
            pattern_text = '\n'.join([l.strip() for l in pattern if l.strip()])
            
            if not pattern_text:  # 빈 패턴은 건너뛰기
                continue
            
            # 패턴이 3번 이상 반복되는지 확인
            repeat_count = 1
            pos = pattern_len
            
            while pos + pattern_len <= len(lines):
                current_pattern = lines[pos:pos + pattern_len]
                # 빈 줄을 제외한 현재 패턴 텍스트 생성
                current_pattern_text = '\n'.join([l.strip() for l in current_pattern if l.strip()])
                
                if current_pattern_text == pattern_text:
                    repeat_count += 1
                    pos += pattern_len
                else:
                    break
            
            # 패턴이 3번 이상 반복되면 첫 번째 패턴만 유지
            if repeat_count >= 3:
                # 반복된 패턴 제거
                remaining_lines = lines[repeat_count * pattern_len:]
                text = '\n'.join(pattern + remaining_lines)
                break  # 첫 번째로 발견된 패턴만 제거
    
    # 패턴 제거 후 다시 한 번 연속된 동일한 라인 제거 (남은 중복 제거)
    lines = text.split('\n')
    final_lines = []
    prev_line = None
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped:
            if final_lines and final_lines[-1].strip():
                final_lines.append('')
            continue
        
        if line_stripped != prev_line:
            final_lines.append(line)
            prev_line = line_stripped
    
    text = '\n'.join(final_lines)
    
    # 앞뒤 공백 제거
    text = text.strip()
    
    return text


def extract_json_from_text(text: str) -> str:
    """
    텍스트에서 JSON 블록을 추출하고 포맷팅합니다.
    JSON을 찾지 못하면 원본 텍스트를 반환합니다.
    """
    # 1. JSON 코드 블록 찾기 (```json ... ``` 또는 ``` ... ```)
    json_block_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
    match = re.search(json_block_pattern, text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
    else:
        # 2. ``` 없이 첫 번째 { 부터 마지막 } 까지 찾기 (더 견고한 방법)
        start_idx = text.find('{')
        if start_idx == -1:
            # JSON 객체 시작 기호가 없음
            return text
        
        # { 부터 시작해서 중괄호 매칭하여 JSON 객체 찾기
        brace_count = 0
        end_idx = start_idx
        for i in range(start_idx, len(text)):
            if text[i] == '{':
                brace_count += 1
            elif text[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i + 1
                    break
        
        if brace_count != 0:
            # 중괄호가 매칭되지 않음
            return text
        
        json_str = text[start_idx:end_idx].strip()
    
    try:
        # JSON 파싱 시도
        json_obj = json.loads(json_str)
        # JSON을 포맷팅된 문자열로 변환 (들여쓰기 포함)
        formatted_json = json.dumps(json_obj, ensure_ascii=False, indent=2)
        return formatted_json
    except json.JSONDecodeError as e:
        # JSON 파싱 실패 - 원본 텍스트 반환
        print(f"JSON parsing failed: {e}")
        return text


@app.post("/ocr")
async def ocr_image(
    file: UploadFile = File(...),
    filename: str = Form(None),
    page_number: int = Form(None),
    custom_prompt: str = Form(None),
    db: Session = Depends(get_db)
):
    """
    크롭된 이미지 파일을 받아서 OCR을 수행합니다.
    """
    try:
        # 파일 읽기
        file_bytes = await file.read()
        
        # 파일명과 페이지 번호 추출 (FormData에서)
        # filename이 없으면 업로드된 파일명 사용
        if not filename:
            filename = file.filename
        # 페이지 번호가 없으면 None 유지
        
        # 이미지 검증 및 디버깅
        try:
            # 파일이 비어있지 않은지 확인
            if len(file_bytes) == 0:
                raise HTTPException(status_code=400, detail="Empty file received")
            
            img = Image.open(io.BytesIO(file_bytes))
            # 이미지가 제대로 로드되었는지 확인
            img.verify()
            img = Image.open(io.BytesIO(file_bytes))  # verify 후 다시 열기
            print(f"Received image: {img.size[0]}x{img.size[1]} pixels, format: {img.format}")
        except Exception as img_error:
            print(f"Image validation error: {img_error}")
            # 이미지 검증 실패 시 더 명확한 오류 메시지 제공
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(img_error)}")
        
        # 이미지를 base64로 인코딩
        image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # Ollama를 사용하여 OCR 수행
        # 여러 번 시도하여 완전한 응답을 받도록 함
        max_attempts = 3
        raw_text = ""
        
        # 기본 프롬프트 설정
        default_system_prompt = "You are a precise OCR engine. Extract ONLY the text that is ACTUALLY VISIBLE in the image. Do NOT generate patterns, sequences, or repeated numbers. Do NOT extrapolate or guess what might be there. Extract EXACTLY what you see, character by character, from left to right, top to bottom. Each character, word, and line should appear only once. Do NOT repeat any text. Do NOT create number sequences. Do NOT duplicate content. Read the image carefully and output only the actual visible text, including Korean (한글), English, numbers, and symbols. Stop when you reach the end of visible text."
        
        default_user_prompt = "Extract ONLY the text that is ACTUALLY VISIBLE in this cropped image. Read from left to right, top to bottom, line by line. Extract each line exactly once. Do NOT generate patterns. Do NOT create number sequences like '10, 11, 12...'. Do NOT repeat any text. Do NOT extrapolate beyond what is visible. Output only the actual text you can see in the image:"
        
        # 사용자 지정 프롬프트가 있으면 사용, 없으면 기본값 사용
        user_prompt = custom_prompt.strip() if custom_prompt and custom_prompt.strip() else default_user_prompt
        
        for attempt in range(max_attempts):
            full_response = ""
            stream = ollama.chat(
                model="qwen2.5vl:7b",
                messages=[
                    {
                        "role": "system",
                        "content": default_system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                        "images": [image_base64]
                    }
                ],
                stream=True,
                options={
                    "num_predict": 16384,  # 토큰 수 대폭 증가 (최대한)
                    "temperature": 0.0,    # 완전히 결정론적으로 (0.0 = 완전히 결정론적)
                    "top_p": 0.9,          # 핵 샘플링 (더 정확한 추출)
                    "top_k": 40,           # 상위 k개 토큰만 고려
                    "stop": [],            # 중간에 멈추지 않도록
                    "num_ctx": 32768,      # 컨텍스트 윈도우 최대 증가
                    "repeat_penalty": 1.2,  # 반복 패널티 (반복 방지)
                }
            )
            
            # 스트리밍 응답 수집
            for chunk in stream:
                if chunk.get("message") and chunk["message"].get("content"):
                    full_response += chunk["message"]["content"]
            
            current_text = full_response.strip()
            
            # 응답이 이전보다 길면 업데이트
            if len(current_text) > len(raw_text):
                raw_text = current_text
                print(f"Attempt {attempt + 1}: Extracted {len(raw_text)} characters")
            
            # 응답이 충분히 길면 중단 (최소 100자 이상)
            if len(raw_text) > 100 and not raw_text.endswith(('...', '…', '.')):
                break
        
        print(f"Final extracted text length: {len(raw_text)} characters")
        
        # "..." 같은 잘림 표시 제거 (더 강력한 패턴 매칭)
        raw_text = re.sub(r'\s*by\s+c\.\.\.\s*$', '', raw_text, flags=re.IGNORECASE)
        raw_text = re.sub(r'\.\.\.\s*$', '', raw_text)
        raw_text = re.sub(r'…\s*$', '', raw_text)
        raw_text = raw_text.rstrip('…').rstrip('...').rstrip('..').rstrip('.')
        
        # JSON 형식인지 확인하고 포맷팅
        # 사용자 지정 프롬프트가 있으면 JSON 추출 시도
        if custom_prompt and custom_prompt.strip():
            # JSON 추출 시도
            json_formatted = extract_json_from_text(raw_text)
            if json_formatted != raw_text:
                # JSON이 성공적으로 추출됨
                extracted_text = json_formatted
            else:
                # JSON이 아니면 기본 정리 로직 사용
                extracted_text = clean_ocr_response(raw_text)
        else:
            # 기본 프롬프트 사용 시 기본 정리 로직
            extracted_text = clean_ocr_response(raw_text)
        
        # 크롭된 이미지를 base64로 인코딩하여 저장
        cropped_image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # OCR 결과만 반환 (자동 저장하지 않음)
        # '저장' 버튼을 눌렀을 때만 /history/save 엔드포인트를 통해 저장됨
        return {
            "extracted_text": extracted_text,
            "cropped_image": cropped_image_base64,
            "filename": filename,
            "page_number": page_number
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.get("/history")
async def get_history(
    grouped: bool = False,
    include_records: bool = False,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    OCR 히스토리를 반환합니다.
    grouped=True이면 파일별로 그룹화하여 반환합니다.
    include_records=True이면 각 그룹에 records 배열을 포함합니다 (기본값: False, 성능 최적화).
    """
    try:
        email = require_auth_email(authorization)

        if grouped:
            # 통계만 필요하므로 필요한 컬럼만 선택하여 성능 최적화
            from sqlalchemy import select
            from datetime import datetime, timedelta
            
            # 최근 30일 데이터만 가져와서 성능 개선 (필요시 조정 가능)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            records = db.query(OCRRecord).filter(
                OCRRecord.email == email,
                OCRRecord.timestamp >= thirty_days_ago
            ).order_by(OCRRecord.timestamp.desc()).all()
        else:
            records = db.query(OCRRecord).filter(OCRRecord.email == email).order_by(OCRRecord.timestamp.desc()).all()
        
        if grouped:
            # 파일명별로 먼저 분류
            from collections import defaultdict
            from datetime import timedelta, date
            
            # 파일명별로 레코드 그룹화
            filename_groups = defaultdict(list)
            for record in records:
                filename = record.filename or "Unknown"
                filename_groups[filename].append(record)
            
            # 각 파일명 그룹 내에서 날짜(일) 기반으로 세부 그룹 생성
            files_dict = {}
            MINIMUM_WAGE_PER_HOUR = 10320  # 최저시급
            
            for filename, file_records in filename_groups.items():
                # 같은 파일명의 레코드들을 시간순으로 정렬 (최신순)
                file_records.sort(key=lambda x: x.timestamp, reverse=True)
                
                # 날짜별로 그룹화 (일단위)
                daily_groups = defaultdict(list)
                for record in file_records:
                    record_date = record.timestamp.date()
                    daily_groups[record_date].append(record)
                
                # 각 날짜별 그룹 생성
                for record_date, daily_records in daily_groups.items():
                    # 날짜별 그룹 키 생성
                    group_date_str = record_date.strftime("%Y%m%d")
                    current_group_key = f"{filename}_{group_date_str}"
                    
                    # 고유한 페이지 번호 집합 계산 (실제 처리된 페이지 수)
                    pages_set = set()
                    images_count = 0
                    for record in daily_records:
                        if record.page_number is not None:
                            pages_set.add(record.page_number)
                        else:
                            images_count += 1  # 이미지 개수 카운트
                    
                    # 페이지 수 계산: 고유한 페이지 번호 개수 + 이미지가 있으면 1페이지 추가
                    unique_pages_count = len(pages_set)
                    if images_count > 0:
                        unique_pages_count = max(unique_pages_count, 1)  # 이미지가 있으면 최소 1페이지
                    
                    # 절약 시간/금액 계산
                    # - 일반 모드: (영역 × 페이지) 1건당 1분
                    # - 고급 모드: key:value 1개당 10초 × 페이지수
                    #   (히스토리에는 모드가 따로 저장되지 않으므로, extracted_text가 JSON(dict)로 파싱되면 "고급"으로 추정)
                    total_records = len(daily_records)

                    # area 추정: (총 레코드 = 영역×페이지) 라는 전제에서 영역 수를 역산
                    areas_est = 0
                    if unique_pages_count and unique_pages_count > 0:
                        areas_est = max(1, int(round(total_records / unique_pages_count))) if total_records > 0 else 0
                    else:
                        areas_est = total_records

                    # JSON key:value 개수 추정
                    kv_counts = []
                    for r in daily_records:
                        txt = (r.extracted_text or "").strip()
                        if not txt:
                            continue
                        try:
                            obj = json.loads(txt)
                            if isinstance(obj, dict):
                                kv_counts.append(len(obj.keys()))
                        except Exception:
                            continue

                    # 일반 모드(문서 전사) 기준: 180 CPM (분당 180글자)
                    TYPING_CPM = 180
                    total_chars = 0
                    for r in daily_records:
                        total_chars += len((r.extracted_text or ""))

                    is_advanced_est = len(kv_counts) > 0
                    if is_advanced_est:
                        # 대표 key:value 개수(중앙값)
                        kv_counts_sorted = sorted(kv_counts)
                        kv_est = kv_counts_sorted[len(kv_counts_sorted) // 2]
                        time_saved_minutes = (kv_est * unique_pages_count * 10) / 60.0
                        time_basis = "advanced"
                    else:
                        # 글자 수 기반 타이핑 시간(공백 포함)으로 산정
                        time_saved_minutes = (float(total_chars) / float(TYPING_CPM)) if TYPING_CPM > 0 else 0.0
                        time_basis = "standard_chars"

                    money_saved = (time_saved_minutes / 60) * MINIMUM_WAGE_PER_HOUR
                    
                    current_group = {
                        "filename": filename,
                        "total_records": total_records,
                        "pages_count": unique_pages_count,
                        "areas_count": areas_est,
                        "time_saved_minutes": round(time_saved_minutes, 2),
                        "time_basis": time_basis,
                        "total_chars": int(total_chars),
                        "money_saved": round(money_saved, 2),
                        "latest_timestamp": max(r.timestamp for r in daily_records),
                        "first_timestamp": min(r.timestamp for r in daily_records),
                        "date": record_date.isoformat()
                    }
                    
                    # 레코드 목록 생성 (include_records=True일 때만, 성능 최적화)
                    # cropped_image는 크기가 크므로 제외 (필요시 GET /history/{id}로 조회)
                    # 응답 크기 최적화: 92MB 이미지 데이터를 제외하여 서버 부하 감소
                    if include_records:
                        records_list = []
                        for record in daily_records:
                            records_list.append({
                                "id": record.id,
                                "extracted_text": record.extracted_text,
                                # cropped_image 제외: 응답 크기 최적화 (필요시 GET /history/{id}로 조회)
                                "timestamp": record.timestamp.isoformat(),
                                "page_number": record.page_number
                            })
                        current_group["records"] = records_list
                    files_dict[current_group_key] = current_group
            
            # 파일 목록을 최신 순으로 정렬하고 타임스탬프를 문자열로 변환
            files_list = []
            for file_data in sorted(
                files_dict.values(),
                key=lambda x: x["latest_timestamp"],
                reverse=True
            ):
                file_data["latest_timestamp"] = file_data["latest_timestamp"].isoformat()
                file_data["first_timestamp"] = file_data["first_timestamp"].isoformat()
                files_list.append(file_data)
            
            return files_list
        else:
            # 기존 방식: 모든 기록 반환
            return [
                {
                    "id": record.id,
                    "extracted_text": record.extracted_text,
                    "cropped_image": record.cropped_image,
                    "timestamp": record.timestamp.isoformat(),
                    "filename": record.filename,
                    "page_number": record.page_number
                }
                for record in records
            ]
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Failed to fetch history: {str(e)}\n{traceback.format_exc()}"
        print(f"History API Error: {error_detail}")  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.get("/history/{record_id}")
async def get_record(record_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    단일 OCR 기록을 조회합니다. 이미지 포함.
    """
    try:
        email = require_auth_email(authorization)
        record = db.query(OCRRecord).filter(OCRRecord.id == record_id, OCRRecord.email == email).first()
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        return {
            "id": record.id,
            "extracted_text": record.extracted_text,
            "cropped_image": record.cropped_image,
            "timestamp": record.timestamp.isoformat(),
            "filename": record.filename,
            "page_number": record.page_number
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch record: {str(e)}")


@app.put("/history/{record_id}")
async def update_record(
    record_id: int,
    extracted_text: str = Form(...),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    OCR 기록의 텍스트를 수정합니다.
    """
    try:
        email = require_auth_email(authorization)
        record = db.query(OCRRecord).filter(OCRRecord.id == record_id, OCRRecord.email == email).first()
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        record.extracted_text = extracted_text
        db.commit()
        db.refresh(record)
        
        return {
            "id": record.id,
            "extracted_text": record.extracted_text,
            "cropped_image": record.cropped_image,
            "timestamp": record.timestamp.isoformat(),
            "filename": record.filename,
            "page_number": record.page_number
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")


@app.delete("/history/{record_id}")
async def delete_record(record_id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    OCR 기록을 삭제합니다.
    """
    try:
        email = require_auth_email(authorization)
        record = db.query(OCRRecord).filter(OCRRecord.id == record_id, OCRRecord.email == email).first()
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        
        db.delete(record)
        db.commit()
        
        return {"message": "Record deleted successfully", "id": record_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")


@app.post("/history/delete-multiple")
async def delete_multiple_records(
    record_ids: List[int] = Body(..., description="삭제할 레코드 ID 목록"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    여러 OCR 기록을 한 번에 삭제합니다.
    """
    try:
        if not record_ids or len(record_ids) == 0:
            raise HTTPException(status_code=400, detail="No record IDs provided")
        
        email = require_auth_email(authorization)
        # 존재하는 레코드만 조회 (본인 소유만)
        records = db.query(OCRRecord).filter(OCRRecord.id.in_(record_ids), OCRRecord.email == email).all()
        
        if not records:
            raise HTTPException(status_code=404, detail="No records found")
        
        # 삭제될 ID 수집
        deleted_ids = [record.id for record in records]
        not_found_ids = [rid for rid in record_ids if rid not in deleted_ids]
        
        # 모든 레코드 삭제
        for record in records:
            db.delete(record)
        
        db.commit()
        
        return {
            "message": f"{len(deleted_ids)} records deleted successfully",
            "deleted_ids": deleted_ids,
            "deleted_count": len(deleted_ids),
            "not_found_ids": not_found_ids if not_found_ids else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete records: {str(e)}")
@app.post("/history/save")
async def save_ocr_result(
    extracted_text: str = Form(...),
    cropped_image: str = Form(...),
    filename: str = Form(...),
    page_number: int = Form(None),
    save_session_id: str = Form(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    OCR 결과를 history에 저장합니다.
    '저장' 버튼을 눌렀을 때만 호출됩니다.
    """
    try:
        # 로그인 사용자 기준 저장
        email = require_auth_email(authorization)

        # 사용자 계정 upsert
        user = db.query(UserAccount).filter(UserAccount.email == email).first()
        if not user:
            user = UserAccount(email=email, plan_key=None, credits_balance=0)
            db.add(user)
            db.flush()

        # 저장(1회 클릭) 내에서 '페이지당 1회'만 차감
        # page_key: PDF면 page_number, 이미지 등 page_number None이면 -1로 취급(=1페이지)
        page_key = page_number if page_number is not None else -1
        session_id = (save_session_id or "").strip() or f"legacy-{filename}"
        reason = "ocr_save_page_charge"

        # 동일 (email, session_id, page_key) 중복 차감 방지
        existing_charge = (
            db.query(CreditLedger)
            .filter(
                CreditLedger.email == email,
                CreditLedger.reason == reason,
                CreditLedger.save_session_id == session_id,
                CreditLedger.page_key == page_key,
            )
            .first()
        )

        if not existing_charge:
            cost_per_page = 10
            if (user.credits_balance or 0) < cost_per_page:
                raise HTTPException(
                    status_code=402,
                    detail=f"크레딧이 부족합니다. 필요: {cost_per_page}, 보유: {user.credits_balance or 0}",
                )

            user.credits_balance = (user.credits_balance or 0) - cost_per_page
            db.add(
                CreditLedger(
                    email=email,
                    delta=-cost_per_page,
                    reason=reason,
                    filename=filename,
                    page_key=page_key,
                    save_session_id=session_id,
                    meta=json.dumps(
                        {"cost_per_page": cost_per_page, "page_number": page_number},
                        ensure_ascii=False,
                    ),
                )
            )

        ocr_record = OCRRecord(
            email=email,
            save_session_id=session_id,
            extracted_text=extracted_text,
            cropped_image=cropped_image,
            timestamp=datetime.utcnow(),
            filename=filename,
            page_number=page_number
        )
        db.add(ocr_record)
        db.commit()
        db.refresh(ocr_record)
        
        return {
            "id": ocr_record.id,
            "extracted_text": ocr_record.extracted_text,
            "cropped_image": ocr_record.cropped_image,
            "timestamp": ocr_record.timestamp.isoformat(),
            "filename": ocr_record.filename,
            "page_number": ocr_record.page_number,
            "user_email": email,
            "credits_balance": user.credits_balance,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save OCR result: {str(e)}")


@app.get("/billing/user")
async def get_billing_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    email = require_auth_email(authorization)
    user = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": user.email, "plan_key": user.plan_key, "credits_balance": user.credits_balance}


@app.get("/billing/usage")
async def get_billing_usage(
    authorization: Optional[str] = Header(None),
    limit: int = 100,
    mode: str = "raw",
    db: Session = Depends(get_db),
):
    email = require_auth_email(authorization)

    mode = (mode or "raw").strip().lower()
    if mode not in ("raw", "file"):
        raise HTTPException(status_code=400, detail="invalid mode")

    if mode == "file":
        # 파일(업로드/저장 세션) 단위 집계
        # - OCR 차감: (filename, save_session_id) 단위로 pages_count/areas_per_page/delta를 한 줄로 반환
        # - 구매 등 기타: 기존 ledger row 형태로 반환 (filename 없을 수 있음)
        from sqlalchemy import func, case

        max_limit = max(1, min(limit, 200))

        # 최근 OCR 차감 세션들부터 가져오기
        ocr_groups = (
            db.query(
                CreditLedger.filename.label("filename"),
                CreditLedger.save_session_id.label("save_session_id"),
                func.sum(CreditLedger.delta).label("delta_sum"),
                func.max(CreditLedger.created_at).label("created_at"),
            )
            .filter(
                CreditLedger.email == email,
                CreditLedger.reason == "ocr_save_page_charge",
                CreditLedger.filename.isnot(None),
                CreditLedger.save_session_id.isnot(None),
            )
            .group_by(CreditLedger.filename, CreditLedger.save_session_id)
            .order_by(func.max(CreditLedger.created_at).desc())
            .limit(max_limit)
            .all()
        )

        results = []
        for g in ocr_groups:
            # 이 세션에서 저장된 OCRRecord로 pages/areas 계산
            rec_stats = (
                db.query(
                    func.count(OCRRecord.id).label("total_records"),
                    func.count(func.distinct(OCRRecord.page_number)).label("distinct_pages"),
                    func.sum(case((OCRRecord.page_number.is_(None), 1), else_=0)).label("null_pages"),
                )
                .filter(
                    OCRRecord.email == email,
                    OCRRecord.filename == g.filename,
                    OCRRecord.save_session_id == g.save_session_id,
                )
                .one()
            )

            distinct_pages = int(rec_stats.distinct_pages or 0)
            has_null_page = (rec_stats.null_pages or 0) > 0
            pages_count = distinct_pages + (1 if has_null_page else 0)
            if pages_count <= 0:
                pages_count = 1

            total_records = int(rec_stats.total_records or 0)
            # “몇개 영역”은 페이지당 영역 개수로 표기(=총 레코드 / 페이지수)
            areas_per_page = (total_records / pages_count) if pages_count else 0

            results.append(
                {
                    "kind": "ocr",
                    "filename": g.filename,
                    "pages_count": pages_count,
                    "areas_per_page": round(areas_per_page, 2),
                    "delta": int(g.delta_sum or 0),
                    "created_at": g.created_at.isoformat() if g.created_at else None,
                    "save_session_id": g.save_session_id,
                }
            )

        # 최근 구매/지급(ocr 이외)도 함께 보여주기 (limit의 1/2 정도)
        other_rows = (
            db.query(CreditLedger)
            .filter(CreditLedger.email == email, CreditLedger.reason != "ocr_save_page_charge")
            .order_by(CreditLedger.created_at.desc())
            .limit(max(1, max_limit // 2))
            .all()
        )
        for r in other_rows:
            results.append(
                {
                    "kind": "ledger",
                    "delta": r.delta,
                    "reason": r.reason,
                    "filename": r.filename,
                    "page_key": r.page_key,
                    "save_session_id": r.save_session_id,
                    "meta": r.meta,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
            )

        # 전체를 created_at 기준으로 섞어 정렬
        def _ts(x):
            return x.get("created_at") or ""

        results.sort(key=_ts, reverse=True)
        return results[:max_limit]

    rows = (
        db.query(CreditLedger)
        .filter(CreditLedger.email == email)
        .order_by(CreditLedger.created_at.desc())
        .limit(max(1, min(limit, 500)))
        .all()
    )
    return [
        {
            "id": r.id,
            "email": r.email,
            "delta": r.delta,
            "reason": r.reason,
            "filename": r.filename,
            "page_key": r.page_key,
            "save_session_id": r.save_session_id,
            "meta": r.meta,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


class BillingPurchaseRequest(BaseModel):
    plan_key: str


@app.post("/billing/purchase")
async def billing_purchase(payload: BillingPurchaseRequest, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    임시 구매 API (결제 없이 성공 처리)
    - 로그인 사용자 기준으로 plan 설정 + credits 지급 + ledger 기록
    """
    email = require_auth_email(authorization)
    plan_key = (payload.plan_key or "").strip()
    if not plan_key:
        raise HTTPException(status_code=400, detail="plan_key is required")

    # 임시 요금제 매핑 (필요 시 조정)
    plan_catalog = {
        "free": {"credits": 0, "amount_krw": 0},
        "pro": {"credits": 1000, "amount_krw": 100000},
        "expert": {"credits": 5000, "amount_krw": 300000},
        "businessFlex": {"credits": 10000, "amount_krw": 300000},
        "enterprise": {"credits": 999999999, "amount_krw": None},
    }
    if plan_key not in plan_catalog:
        raise HTTPException(status_code=400, detail="invalid plan_key")

    plan = plan_catalog[plan_key]
    credits_granted = int(plan["credits"])
    amount_krw = plan["amount_krw"]

    user = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user:
        user = UserAccount(email=email, plan_key=None, credits_balance=0)
        db.add(user)
        db.flush()

    # 구매/지급 기록
    db.add(
        Purchase(
            email=email,
            plan_key=plan_key,
            amount_krw=amount_krw,
            credits_granted=credits_granted,
        )
    )
    user.plan_key = plan_key
    user.credits_balance = (user.credits_balance or 0) + credits_granted

    db.add(
        CreditLedger(
            email=email,
            delta=credits_granted,
            reason="purchase_mock",
            filename=None,
            page_key=-1,
            save_session_id=f"mock-{plan_key}-{int(datetime.utcnow().timestamp())}",
            meta=json.dumps(
                {"plan_key": plan_key, "amount_krw": amount_krw, "credits_granted": credits_granted},
                ensure_ascii=False,
            ),
        )
    )

    db.commit()
    return {"email": user.email, "plan_key": user.plan_key, "credits_balance": user.credits_balance, "credits_granted": credits_granted}


@app.delete("/history/file/{filename}")
async def delete_file_records(
    filename: str, 
    first_timestamp: str = Query(None, description="그룹의 첫 타임스탬프 (ISO 형식)"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    특정 파일의 모든 OCR 기록을 삭제합니다.
    first_timestamp가 제공되면 해당 타임스탬프를 가진 그룹만 삭제합니다.
    """
    try:
        from datetime import datetime
        
        email = require_auth_email(authorization)
        # 파일명 + 소유자 이메일로 필터링
        query = db.query(OCRRecord).filter(OCRRecord.email == email, OCRRecord.filename == filename)
        
        # first_timestamp가 제공되면 해당 그룹만 삭제
        if first_timestamp:
            try:
                # ISO 형식의 타임스탬프를 datetime 객체로 변환
                group_datetime = datetime.fromisoformat(first_timestamp.replace('Z', '+00:00'))
                # UTC로 변환 (필요한 경우)
                if group_datetime.tzinfo:
                    group_datetime = group_datetime.astimezone(datetime.utcnow().tzinfo).replace(tzinfo=None)
                
                # 10분 범위 내의 레코드 찾기 (그룹 임계값과 동일)
                from datetime import timedelta
                threshold = timedelta(minutes=10)
                query = query.filter(
                    OCRRecord.timestamp >= group_datetime - threshold,
                    OCRRecord.timestamp <= group_datetime + threshold
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {str(e)}")
        
        records = query.all()
        
        if not records:
            raise HTTPException(status_code=404, detail="No records found for this file")
        
        # 레코드 ID 수집
        deleted_ids = [record.id for record in records]
        deleted_count = len(deleted_ids)
        
        # 모든 레코드 삭제
        for record in records:
            db.delete(record)
        
        db.commit()
        
        return {
            "message": f"File records deleted successfully",
            "filename": filename,
            "deleted_count": deleted_count,
            "deleted_ids": deleted_ids
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete file records: {str(e)}")


@app.post("/convert/ppt-to-pdf")
async def convert_ppt_to_pdf(file: UploadFile = File(...)):
    """
    PPT 파일을 PDF로 변환합니다.
    LibreOffice를 사용하여 변환합니다.
    """
    try:
        # 파일 확장자 확인
        filename = file.filename or "unknown"
        file_ext = Path(filename).suffix.lower()
        
        if file_ext not in ['.ppt', '.pptx']:
            raise HTTPException(status_code=400, detail="Only PPT or PPTX files are supported")
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            # 안전한 임시 파일명 생성 (한글 파일명 문제 해결)
            import uuid
            from urllib.parse import quote
            safe_input_name = f"input_{uuid.uuid4().hex}{file_ext}"
            input_path = os.path.join(temp_dir, safe_input_name)
            
            # 업로드된 파일 저장
            with open(input_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # PDF 출력 파일명 (임시 파일명 기반)
            safe_output_name = f"input_{uuid.uuid4().hex}.pdf"
            output_path = os.path.join(temp_dir, safe_output_name)
            
            # LibreOffice를 사용하여 PPT를 PDF로 변환
            # libreoffice --headless --convert-to pdf --outdir <output_dir> <input_file>
            try:
                # 인코딩 문제를 피하기 위해 text=False로 설정하고 bytes로 처리
                result = subprocess.run(
                    [
                        "libreoffice",
                        "--headless",
                        "--convert-to", "pdf",
                        "--outdir", temp_dir,
                        input_path
                    ],
                    capture_output=True,
                    timeout=60  # 60초 타임아웃
                )
                
                if result.returncode != 0:
                    # stderr를 안전하게 디코딩 (ASCII로만 구성된 메시지 사용)
                    error_msg = result.stderr.decode('utf-8', errors='replace') if result.stderr else "Unknown error"
                    # 한글을 제거하고 ASCII만 사용하여 인코딩 오류 방지
                    safe_error_msg = ''.join(c if ord(c) < 128 else '?' for c in error_msg)
                    raise HTTPException(
                        status_code=500,
                        detail=f"PPT conversion failed: {safe_error_msg[:200]}"  # ASCII만 사용
                    )
                
                # LibreOffice는 입력 파일명 기반으로 출력 파일명을 생성
                # 입력 파일명에서 확장자만 .pdf로 변경한 파일명 찾기
                expected_output_name = safe_input_name.rsplit('.', 1)[0] + '.pdf'
                expected_output_path = os.path.join(temp_dir, expected_output_name)
                
                # 변환된 PDF 파일 찾기
                if os.path.exists(expected_output_path):
                    actual_output_path = expected_output_path
                else:
                    # 파일명을 찾지 못하면 temp_dir에서 .pdf 파일 찾기
                    pdf_files = [f for f in os.listdir(temp_dir) if f.endswith('.pdf')]
                    if not pdf_files:
                        raise HTTPException(
                            status_code=500,
                            detail="PDF conversion file not found"
                        )
                    actual_output_path = os.path.join(temp_dir, pdf_files[0])
                
                # PDF 파일 읽기
                with open(actual_output_path, "rb") as pdf_file:
                    pdf_content = pdf_file.read()
                
                # 원본 파일명에서 확장자만 변경 (한글 파일명 지원)
                try:
                    # 파일명을 안전하게 처리 (ASCII로 변환)
                    original_stem = Path(filename).stem
                    # 한글을 ASCII로 변환하거나 제거
                    safe_stem = ''.join(c if ord(c) < 128 else '_' for c in original_stem)
                    # 빈 파일명 방지
                    if not safe_stem or safe_stem.strip() == '':
                        safe_stem = "converted"
                    pdf_filename = f"{safe_stem}.pdf"
                except Exception:
                    # 인코딩 실패 시 기본 파일명 사용
                    pdf_filename = "converted.pdf"
                
                return Response(
                    content=pdf_content,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'attachment; filename="{pdf_filename}"'
                    }
                )
                
            except subprocess.TimeoutExpired:
                raise HTTPException(
                    status_code=500,
                    detail="PPT conversion timeout"
                )
            except FileNotFoundError:
                raise HTTPException(
                    status_code=500,
                    detail="LibreOffice is not installed. Please install LibreOffice on the system."
                )
                
    except HTTPException:
        raise
    except Exception as e:
        # 에러 메시지를 안전하게 처리 (ASCII만 사용)
        error_str = str(e)
        safe_error = ''.join(c if ord(c) < 128 else '?' for c in error_str)
        raise HTTPException(
            status_code=500,
            detail=f"PPT conversion error: {safe_error[:200]}"
        )


# 프롬프트 관련 Pydantic 모델
class PromptCreate(BaseModel):
    name: str
    prompt: str


class PromptUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None


class PromptResponse(BaseModel):
    id: int
    name: str
    prompt: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 프롬프트 CRUD API
@app.post("/prompts", response_model=PromptResponse)
async def create_prompt(prompt_data: PromptCreate, db: Session = Depends(get_db)):
    """프롬프트 생성"""
    db_prompt = Prompt(
        name=prompt_data.name,
        prompt=prompt_data.prompt
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt


@app.get("/prompts", response_model=List[PromptResponse])
async def get_prompts(db: Session = Depends(get_db)):
    """모든 프롬프트 조회 (최신순)"""
    prompts = db.query(Prompt).order_by(Prompt.created_at.desc()).all()
    return prompts


@app.get("/prompts/{prompt_id}", response_model=PromptResponse)
async def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """특정 프롬프트 조회"""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@app.put("/prompts/{prompt_id}", response_model=PromptResponse)
async def update_prompt(prompt_id: int, prompt_data: PromptUpdate, db: Session = Depends(get_db)):
    """프롬프트 수정"""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if prompt_data.name is not None:
        prompt.name = prompt_data.name
    if prompt_data.prompt is not None:
        prompt.prompt = prompt_data.prompt
    prompt.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(prompt)
    return prompt


@app.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    """프롬프트 삭제"""
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    db.delete(prompt)
    db.commit()
    return {"message": "Prompt deleted successfully"}


# 추출 항목(Keys) 관련 Pydantic 모델
class ExtractKeysCreate(BaseModel):
    name: str
    keys: List[str]


class ExtractKeysUpdate(BaseModel):
    name: Optional[str] = None
    keys: Optional[List[str]] = None


class ExtractKeysResponse(BaseModel):
    id: int
    name: str
    keys: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 추출 항목(Keys) CRUD API
@app.post("/extract-keys", response_model=ExtractKeysResponse)
async def create_extract_keys(keys_data: ExtractKeysCreate, db: Session = Depends(get_db)):
    """추출 항목(Keys) 생성"""
    db_keys = ExtractKeys(
        name=keys_data.name,
        keys=json.dumps(keys_data.keys, ensure_ascii=False)
    )
    db.add(db_keys)
    db.commit()
    db.refresh(db_keys)
    return {
        "id": db_keys.id,
        "name": db_keys.name,
        "keys": json.loads(db_keys.keys),
        "created_at": db_keys.created_at,
        "updated_at": db_keys.updated_at
    }


@app.get("/extract-keys", response_model=List[ExtractKeysResponse])
async def get_extract_keys(db: Session = Depends(get_db)):
    """모든 추출 항목(Keys) 조회 (최신순)"""
    keys_list = db.query(ExtractKeys).order_by(ExtractKeys.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "keys": json.loads(k.keys),
            "created_at": k.created_at,
            "updated_at": k.updated_at
        }
        for k in keys_list
    ]


@app.get("/extract-keys/{keys_id}", response_model=ExtractKeysResponse)
async def get_extract_key(keys_id: int, db: Session = Depends(get_db)):
    """특정 추출 항목(Keys) 조회"""
    keys = db.query(ExtractKeys).filter(ExtractKeys.id == keys_id).first()
    if not keys:
        raise HTTPException(status_code=404, detail="ExtractKeys not found")
    return {
        "id": keys.id,
        "name": keys.name,
        "keys": json.loads(keys.keys),
        "created_at": keys.created_at,
        "updated_at": keys.updated_at
    }


@app.put("/extract-keys/{keys_id}", response_model=ExtractKeysResponse)
async def update_extract_keys(keys_id: int, keys_data: ExtractKeysUpdate, db: Session = Depends(get_db)):
    """추출 항목(Keys) 수정"""
    keys = db.query(ExtractKeys).filter(ExtractKeys.id == keys_id).first()
    if not keys:
        raise HTTPException(status_code=404, detail="ExtractKeys not found")
    
    if keys_data.name is not None:
        keys.name = keys_data.name
    if keys_data.keys is not None:
        keys.keys = json.dumps(keys_data.keys, ensure_ascii=False)
    keys.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(keys)
    return {
        "id": keys.id,
        "name": keys.name,
        "keys": json.loads(keys.keys),
        "created_at": keys.created_at,
        "updated_at": keys.updated_at
    }


@app.delete("/extract-keys/{keys_id}")
async def delete_extract_keys(keys_id: int, db: Session = Depends(get_db)):
    """추출 항목(Keys) 삭제"""
    keys = db.query(ExtractKeys).filter(ExtractKeys.id == keys_id).first()
    if not keys:
        raise HTTPException(status_code=404, detail="ExtractKeys not found")
    
    db.delete(keys)
    db.commit()
    return {"message": "ExtractKeys deleted successfully"}


class ChatMessage(BaseModel):
    role: str
    content: str


class OCRFileChatRequest(BaseModel):
    filename: str
    first_timestamp: Optional[str] = None
    question: str
    messages: List[ChatMessage] = []


@app.post("/chat/ocr-file")
async def chat_with_ocr_file(
    payload: OCRFileChatRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """
    OCR History의 '파일(그룹)' 단위로 OCR 텍스트를 DB에서 모아서,
    Qwen2.5-VL 7B 모델과 질의응답합니다.
    - filename: 파일명
    - first_timestamp: 그룹 구분용(일 단위) 타임스탬프 (ISO 형식, optional)
    - question: 유저 질문
    - messages: 이전 대화 히스토리 (user/assistant)
    """
    try:
        if not payload.filename or not payload.filename.strip():
            raise HTTPException(status_code=400, detail="filename is required")
        if not payload.question or not payload.question.strip():
            raise HTTPException(status_code=400, detail="question is required")

        email = require_auth_email(authorization)
        query = db.query(OCRRecord).filter(OCRRecord.email == email, OCRRecord.filename == payload.filename)

        # first_timestamp가 있으면 해당 날짜(일 단위) 그룹만 대상으로 제한
        if payload.first_timestamp:
            try:
                ts = payload.first_timestamp.replace("Z", "+00:00")
                group_dt = datetime.fromisoformat(ts)
                if group_dt.tzinfo:
                    group_dt = group_dt.astimezone(timezone.utc).replace(tzinfo=None)
                day_start = datetime(group_dt.year, group_dt.month, group_dt.day, 0, 0, 0)
                day_end = day_start + timedelta(days=1)
                query = query.filter(
                    OCRRecord.timestamp >= day_start,
                    OCRRecord.timestamp < day_end
                )
            except Exception:
                raise HTTPException(status_code=400, detail="invalid first_timestamp format")

        # 페이지/ID 순으로 정렬 (페이지 없는 이미지는 뒤로) - SQLite 호환 정렬
        from sqlalchemy import case
        records = query.order_by(
            case((OCRRecord.page_number.is_(None), 1), else_=0),
            OCRRecord.page_number.asc(),
            OCRRecord.id.asc()
        ).all()

        if not records:
            raise HTTPException(status_code=404, detail="No OCR records found for this file group")

        parts = []
        for r in records:
            label = []
            if r.page_number is not None:
                label.append(f"페이지 {r.page_number}")
            label.append(f"ID {r.id}")
            header = f"[{', '.join(label)}]"
            text = (r.extracted_text or "").strip()
            if text:
                parts.append(f"{header}\n{text}")

        ocr_text = "\n\n---\n\n".join(parts).strip()
        if not ocr_text:
            raise HTTPException(status_code=404, detail="OCR text is empty for this file group")

        # 너무 길면 자르기 (컨텍스트 폭발 방지)
        MAX_OCR_CHARS = 60000
        if len(ocr_text) > MAX_OCR_CHARS:
            ocr_text = ocr_text[:MAX_OCR_CHARS] + "\n\n(이하 생략: OCR 텍스트가 길어서 일부만 포함했습니다.)"

        system_prompt = (
            "당신은 문서 Q&A 어시스턴트입니다.\n"
            "아래 OCR 텍스트만 근거로 답하세요. OCR 텍스트에서 확인할 수 없는 내용은 추측하지 말고 "
            "'OCR 텍스트에서 확인할 수 없습니다.'라고 답하세요.\n"
            "가능하면 근거가 되는 문장/값을 짧게 인용하거나, 페이지/ID 힌트를 덧붙이세요.\n\n"
            f"OCR 텍스트:\n{ocr_text}"
        )

        chat_messages = [{"role": "system", "content": system_prompt}]

        # 이전 히스토리 포함 (role은 user/assistant만 허용)
        for m in (payload.messages or []):
            if m.role not in ("user", "assistant"):
                continue
            content = (m.content or "").strip()
            if not content:
                continue
            # 메시지가 너무 길면 잘라서 전송
            chat_messages.append({"role": m.role, "content": content[:4000]})

        chat_messages.append({"role": "user", "content": payload.question.strip()})

        resp = ollama.chat(
            model="qwen2.5vl:7b",
            messages=chat_messages,
            options={
                "temperature": 0.2,
                "top_p": 0.9,
                "num_ctx": 32768,
                "num_predict": 2048,
            }
        )

        answer = (resp.get("message", {}) or {}).get("content", "")
        answer = (answer or "").strip()
        if not answer:
            answer = "응답이 비어있습니다. 다시 시도해주세요."

        return {"answer": answer}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)[:200]}")


@app.get("/")
async def root():
    return {"message": "Region-Specific OCR Service API"}

