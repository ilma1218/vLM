from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

SQLALCHEMY_DATABASE_URL = "sqlite:///./ocr_history.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class OCRRecord(Base):
    __tablename__ = "ocr_records"

    id = Column(Integer, primary_key=True, index=True)
    extracted_text = Column(String, nullable=False)
    cropped_image = Column(String, nullable=True)  # base64 encoded image
    timestamp = Column(DateTime, default=datetime.utcnow)
    filename = Column(String, nullable=True)  # 원본 파일명
    page_number = Column(Integer, nullable=True)  # PDF 페이지 번호 (이미지인 경우 None)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

