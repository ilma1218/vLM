from sqlalchemy import create_engine, Column, Integer, String, DateTime, event, UniqueConstraint
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


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    prompt = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExtractKeys(Base):
    __tablename__ = "extract_keys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    keys = Column(String, nullable=False)  # JSON string array: ["key1", "key2", ...]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserAccount(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    plan_key = Column(String, nullable=True)  # e.g. "expert"
    credits_balance = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    plan_key = Column(String, nullable=False)  # e.g. "expert"
    amount_krw = Column(Integer, nullable=True)
    credits_granted = Column(Integer, nullable=False, default=0)
    purchased_at = Column(DateTime, default=datetime.utcnow)


class CreditLedger(Base):
    """
    Credits 증감 이력(이용 내역 포함)
    - delta: +면 지급, -면 차감
    - save_session_id + page_key(unique): 저장 버튼 1회 클릭 내에서 '페이지당 1회'만 차감하기 위한 키
    """
    __tablename__ = "credit_ledger"
    __table_args__ = (
        UniqueConstraint("email", "reason", "save_session_id", "page_key", name="uq_credit_once_per_page_per_session"),
    )

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    delta = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)  # e.g. "purchase", "ocr_save_page_charge"
    filename = Column(String, nullable=True)
    page_key = Column(Integer, nullable=False, default=-1)  # page_number or -1 for non-pdf/image
    save_session_id = Column(String, nullable=True)
    meta = Column(String, nullable=True)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

