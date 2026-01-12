from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import ollama
import base64
import re
import io
import json
from PIL import Image
from database import init_db, get_db, OCRRecord
from datetime import datetime

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
        
        # 데이터베이스에 저장
        ocr_record = OCRRecord(
            extracted_text=extracted_text,
            cropped_image=cropped_image_base64,
            timestamp=datetime.utcnow(),
            filename=filename,
            page_number=page_number
        )
        db.add(ocr_record)
        db.commit()
        db.refresh(ocr_record)
        
        return {
            "id": ocr_record.id,
            "extracted_text": extracted_text,
            "cropped_image": cropped_image_base64,
            "timestamp": ocr_record.timestamp.isoformat(),
            "filename": ocr_record.filename,
            "page_number": ocr_record.page_number
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.get("/history")
async def get_history(grouped: bool = False, db: Session = Depends(get_db)):
    """
    OCR 히스토리를 반환합니다.
    grouped=True이면 파일별로 그룹화하여 반환합니다.
    """
    try:
        if grouped:
            # 통계만 필요하므로 필요한 컬럼만 선택하여 성능 최적화
            from sqlalchemy import select
            from datetime import datetime, timedelta
            
            # 최근 30일 데이터만 가져와서 성능 개선 (필요시 조정 가능)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            records = db.query(OCRRecord).filter(
                OCRRecord.timestamp >= thirty_days_ago
            ).order_by(OCRRecord.timestamp.desc()).all()
        else:
            records = db.query(OCRRecord).order_by(OCRRecord.timestamp.desc()).all()
        
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
                    
                    # 절약 금액 계산 (영역 수 × 페이지 수 × 1분) / 60 × 최저시급
                    total_records = len(daily_records)
                    time_saved_minutes = total_records * unique_pages_count * 1
                    money_saved = (time_saved_minutes / 60) * MINIMUM_WAGE_PER_HOUR
                    
                    current_group = {
                        "filename": filename,
                        "total_records": total_records,
                        "pages_count": unique_pages_count,
                        "money_saved": round(money_saved, 2),
                        "latest_timestamp": max(r.timestamp for r in daily_records),
                        "first_timestamp": min(r.timestamp for r in daily_records),
                        "date": record_date.isoformat()
                    }
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
    except Exception as e:
        import traceback
        error_detail = f"Failed to fetch history: {str(e)}\n{traceback.format_exc()}"
        print(f"History API Error: {error_detail}")  # 서버 로그에 출력
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.put("/history/{record_id}")
async def update_record(record_id: int, extracted_text: str = Form(...), db: Session = Depends(get_db)):
    """
    OCR 기록의 텍스트를 수정합니다.
    """
    try:
        record = db.query(OCRRecord).filter(OCRRecord.id == record_id).first()
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
async def delete_record(record_id: int, db: Session = Depends(get_db)):
    """
    OCR 기록을 삭제합니다.
    """
    try:
        record = db.query(OCRRecord).filter(OCRRecord.id == record_id).first()
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
    db: Session = Depends(get_db)
):
    """
    여러 OCR 기록을 한 번에 삭제합니다.
    """
    try:
        if not record_ids or len(record_ids) == 0:
            raise HTTPException(status_code=400, detail="No record IDs provided")
        
        # 존재하는 레코드만 조회
        records = db.query(OCRRecord).filter(OCRRecord.id.in_(record_ids)).all()
        
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


@app.delete("/history/file/{filename}")
async def delete_file_records(
    filename: str, 
    first_timestamp: str = Query(None, description="그룹의 첫 타임스탬프 (ISO 형식)"),
    db: Session = Depends(get_db)
):
    """
    특정 파일의 모든 OCR 기록을 삭제합니다.
    first_timestamp가 제공되면 해당 타임스탬프를 가진 그룹만 삭제합니다.
    """
    try:
        from datetime import datetime
        
        # 파일명으로 필터링
        query = db.query(OCRRecord).filter(OCRRecord.filename == filename)
        
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


@app.get("/")
async def root():
    return {"message": "Region-Specific OCR Service API"}

