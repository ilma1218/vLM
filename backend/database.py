from sqlalchemy import create_engine, Column, Integer, String, DateTime, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import sqlite3

SQLALCHEMY_DATABASE_URL = "sqlite:///./ocr_history.db"

# SQLite 연결 설정 개선
connect_args = {
    "check_same_thread": False,
    "timeout": 20.0,  # 타임아웃 설정 (20초)
}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    pool_pre_ping=True,  # 연결 상태 확인
    pool_recycle=3600,  # 1시간마다 연결 재사용
)

# SQLite WAL 모드 활성화 (동시성 개선)
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=20000")  # 20초 대기
    cursor.close()

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

