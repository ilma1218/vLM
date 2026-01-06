#!/usr/bin/env python3
"""
SQLite 데이터베이스 콘솔 접속 스크립트
사용법: python db_console.py
"""

import sqlite3
import os
from pathlib import Path

# 데이터베이스 파일 경로
DB_PATH = Path(__file__).parent / "ocr_history.db"

def main():
    if not DB_PATH.exists():
        print(f"데이터베이스 파일이 없습니다: {DB_PATH}")
        return
    
    print(f"데이터베이스 연결: {DB_PATH}")
    print("=" * 50)
    
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # 딕셔너리 형태로 결과 반환
    
    cursor = conn.cursor()
    
    # 테이블 목록 확인
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print("\n테이블 목록:")
    for table in tables:
        print(f"  - {table[0]}")
    
    # ocr_records 테이블 구조 확인
    print("\nocr_records 테이블 구조:")
    cursor.execute("PRAGMA table_info(ocr_records)")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]}) - nullable: {not col[3]}, default: {col[4]}")
    
    # 레코드 수 확인
    cursor.execute("SELECT COUNT(*) FROM ocr_records")
    count = cursor.fetchone()[0]
    print(f"\n총 레코드 수: {count}")
    
    # 샘플 데이터 확인
    if count > 0:
        print("\n샘플 데이터 (최신 5개):")
        cursor.execute("""
            SELECT id, filename, page_number, timestamp, 
                   LENGTH(extracted_text) as text_length
            FROM ocr_records 
            ORDER BY timestamp DESC 
            LIMIT 5
        """)
        rows = cursor.fetchall()
        for row in rows:
            print(f"  ID: {row[0]}, 파일: {row[1]}, 페이지: {row[2]}, "
                  f"시간: {row[3]}, 텍스트 길이: {row[4]}")
    
    print("\n" + "=" * 50)
    print("대화형 모드로 전환합니다. SQL 쿼리를 입력하세요.")
    print("종료하려면 '.quit' 또는 'exit'를 입력하세요.")
    print("도움말: '.help'")
    print("=" * 50)
    
    # 대화형 모드
    while True:
        try:
            query = input("\nsqlite> ").strip()
            
            if not query:
                continue
            
            if query.lower() in ['.quit', '.exit', 'exit', 'quit']:
                break
            
            if query.lower() == '.help':
                print("""
사용 가능한 명령어:
  .tables          - 테이블 목록 보기
  .schema [table]   - 테이블 구조 보기
  .quit / .exit    - 종료
  
SQL 쿼리 예시:
  SELECT * FROM ocr_records LIMIT 10;
  SELECT filename, COUNT(*) FROM ocr_records GROUP BY filename;
  SELECT * FROM ocr_records WHERE filename = 'example.pdf';
                """)
                continue
            
            if query.lower() == '.tables':
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                for table in cursor.fetchall():
                    print(f"  {table[0]}")
                continue
            
            if query.lower().startswith('.schema'):
                parts = query.split()
                table_name = parts[1] if len(parts) > 1 else 'ocr_records'
                cursor.execute(f"PRAGMA table_info({table_name})")
                for col in cursor.fetchall():
                    print(f"  {col[1]} ({col[2]})")
                continue
            
            # SQL 쿼리 실행
            if query.lower().startswith('select'):
                cursor.execute(query)
                rows = cursor.fetchall()
                
                if rows:
                    # 컬럼명 출력
                    col_names = [description[0] for description in cursor.description]
                    print(" | ".join(col_names))
                    print("-" * 80)
                    
                    # 데이터 출력 (최대 100개)
                    for i, row in enumerate(rows[:100]):
                        print(" | ".join(str(val) if val is not None else "NULL" for val in row))
                    
                    if len(rows) > 100:
                        print(f"\n... (총 {len(rows)}개 중 100개만 표시)")
                else:
                    print("결과가 없습니다.")
            else:
                # SELECT가 아닌 쿼리 (INSERT, UPDATE, DELETE 등)
                cursor.execute(query)
                conn.commit()
                print(f"쿼리 실행 완료. 영향받은 행: {cursor.rowcount}")
        
        except sqlite3.Error as e:
            print(f"오류: {e}")
        except KeyboardInterrupt:
            print("\n종료합니다.")
            break
        except Exception as e:
            print(f"오류: {e}")
    
    conn.close()
    print("\n데이터베이스 연결을 종료했습니다.")

if __name__ == "__main__":
    main()

