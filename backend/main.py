from fastapi import FastAPI, File, UploadFile, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import ollama
import base64
from database import init_db, get_db, OCRRecord
from datetime import datetime

app = FastAPI(title="Region-Specific OCR Service")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 초기화
init_db()


@app.post("/ocr")
async def ocr_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    크롭된 이미지 파일을 받아서 OCR을 수행합니다.
    """
    try:
        # 파일 읽기
        file_bytes = await file.read()
        
        # 이미지를 base64로 인코딩
        image_base64 = base64.b64encode(file_bytes).decode('utf-8')
        
        # Ollama를 사용하여 OCR 수행
        response = ollama.chat(
            model="llama3.2-vision",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise OCR engine. Output ONLY the text visible in the image. Do not add conversational filler."
                },
                {
                    "role": "user",
                    "content": "Extract all text from this image.",
                    "images": [image_base64]
                }
            ]
        )
        
        extracted_text = response["message"]["content"].strip()
        
        # 데이터베이스에 저장
        ocr_record = OCRRecord(
            extracted_text=extracted_text,
            timestamp=datetime.utcnow()
        )
        db.add(ocr_record)
        db.commit()
        db.refresh(ocr_record)
        
        return {
            "id": ocr_record.id,
            "extracted_text": extracted_text,
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
                "timestamp": record.timestamp.isoformat()
            }
            for record in records
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@app.get("/")
async def root():
    return {"message": "Region-Specific OCR Service API"}

