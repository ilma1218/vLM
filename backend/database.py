from sqlalchemy import create_engine, Column, Integer, String, DateTime, event, UniqueConstraint, text
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
    # 로그인 사용자 기준으로 히스토리를 분리하기 위한 소유자 이메일
    email = Column(String, nullable=True, index=True)
    # 저장 버튼 1회 클릭 단위(업로드 세션)로 이용내역을 집계하기 위한 키
    save_session_id = Column(String, nullable=True, index=True)
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


class UserAuth(Base):
    """
    아이디/비밀번호 인증용 테이블.
    - UserAccount(크레딧/플랜)과는 분리하여 관리
    - 식별자는 email(=아이디)로 통일
    """
    __tablename__ = "user_auth"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    password_hash = Column(String, nullable=False)
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
    _ensure_schema_migrations()


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return any(r[1] == column_name for r in rows)  # r[1] = column name


def _ensure_schema_migrations():
    """
    SQLite는 Alembic 없이도 간단한 ALTER로 스키마를 보강할 수 있어,
    개발 환경에서만 필요한 최소 마이그레이션을 적용합니다.
    """
    with engine.begin() as conn:
        # ocr_records.email 컬럼 추가 (로그인 사용자 히스토리 분리)
        if not _column_exists(conn, "ocr_records", "email"):
            conn.execute(text("ALTER TABLE ocr_records ADD COLUMN email VARCHAR"))
        # ocr_records.save_session_id 컬럼 추가 (파일/세션 단위 이용내역 집계)
        if not _column_exists(conn, "ocr_records", "save_session_id"):
            conn.execute(text("ALTER TABLE ocr_records ADD COLUMN save_session_id VARCHAR"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

