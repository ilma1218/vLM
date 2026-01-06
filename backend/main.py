from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import ollama
import base64
import re
import io
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


@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    크롭된 이미지 파일을 받아서 OCR을 수행합니다.
    """
    try:
        # 파일 읽기
        file_bytes = await file.read()
        
        # 이미지 검증 및 디버깅
        try:
            img = Image.open(io.BytesIO(file_bytes))
            # 이미지가 제대로 로드되었는지 확인
            img.verify()
            img = Image.open(io.BytesIO(file_bytes))  # verify 후 다시 열기
            print(f"Received image: {img.size[0]}x{img.size[1]} pixels, format: {img.format}")
        except Exception as img_error:
            print(f"Image validation error: {img_error}")
            # 이미지 검증 실패해도 계속 진행 (Ollama가 처리할 수 있음)
        
        # 이미지를 base64로 인코딩
        image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # Ollama를 사용하여 OCR 수행
        # 여러 번 시도하여 완전한 응답을 받도록 함
        max_attempts = 3
        raw_text = ""
        
        for attempt in range(max_attempts):
            full_response = ""
            stream = ollama.chat(
                model="qwen2.5vl:7b",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise OCR engine. Extract and output EVERY SINGLE CHARACTER of text visible in this cropped image region, including Korean (한글), English, numbers, symbols, and all other characters. Read from left to right, top to bottom, line by line. Each line should be read only once. Do NOT repeat the same line. Do NOT duplicate text. Do NOT skip any text. Extract both Korean and English text equally. Continue reading until you reach the very end. Do NOT stop early. Do NOT truncate. Do NOT abbreviate. Do NOT add explanations. Output the complete text in full, with each line appearing only once."
                    },
                    {
                        "role": "user",
                        "content": f"Extract ALL text from this cropped image region, including Korean characters, English letters, numbers, and all symbols. Read every line from left to right, top to bottom, exactly once. Extract both Korean and English text. Do not skip any language. Do not repeat any line. Continue until you reach the end of the image. Output the complete text with no duplicates:",
                        "images": [image_base64]
                    }
                ],
                stream=True,
                options={
                    "num_predict": 16384,  # 토큰 수 대폭 증가 (최대한)
                    "temperature": 0.0,    # 완전히 결정론적으로
                    "stop": [],            # 중간에 멈추지 않도록
                    "num_ctx": 32768,      # 컨텍스트 윈도우 최대 증가
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
        
        extracted_text = clean_ocr_response(raw_text)
        
        # 크롭된 이미지를 base64로 인코딩하여 저장
        cropped_image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # 데이터베이스에 저장
        ocr_record = OCRRecord(
            extracted_text=extracted_text,
            cropped_image=cropped_image_base64,
            timestamp=datetime.utcnow()
        )
        db.add(ocr_record)
        db.commit()
        db.refresh(ocr_record)
        
        return {
            "id": ocr_record.id,
            "extracted_text": extracted_text,
            "cropped_image": cropped_image_base64,
            "timestamp": ocr_record.timestamp.isoformat()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@app.get("/history")
async def get_history(db: Session = Depends(get_db)):
    """
    OCR 히스토리를 반환합니다.
    """
    try:
        records = db.query(OCRRecord).order_by(OCRRecord.timestamp.desc()).all()
        return [
            {
                "id": record.id,
                "extracted_text": record.extracted_text,
                "cropped_image": record.cropped_image,
                "timestamp": record.timestamp.isoformat()
            }
            for record in records
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Region-Specific OCR Service API"}

