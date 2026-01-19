'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, RefreshCw, ChevronRight, ChevronDown, ChevronLeft, FileText, Edit2, Trash2, Save, X, CheckSquare, Square, Download, MessageCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { OcrChatModal } from '@/components/OcrChatModal';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface OCRRecord {
  id: number;
  extracted_text: string;
  cropped_image?: string;  // base64 encoded image
  timestamp: string;
  page_number?: number;
}

interface FileGroup {
  filename: string;
  records?: OCRRecord[];  // optional: 백엔드에서 grouped=true일 때는 records가 없을 수 있음
  total_records: number;
  latest_timestamp: string;
  first_timestamp?: string;  // 첫 번째 OCR 타임스탬프 (업로드 세션 구분용)
}

export default function MonitorPage() {
  const { t } = useLanguage();
  const { isAuthenticated, token, isLoading: authLoading } = useAuth();
  const [files, setFiles] = useState<FileGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const didAutoExpandRef = useRef(false);
  const [selectedRecord, setSelectedRecord] = useState<OCRRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileGroup | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<number>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [selectedFileGroups, setSelectedFileGroups] = useState<Set<string>>(new Set());
  const [isDeletingMultipleFiles, setIsDeletingMultipleFiles] = useState(false);
  const [showAllDownloadMenu, setShowAllDownloadMenu] = useState(false);
  const [showFileDownloadMenu, setShowFileDownloadMenu] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatTargetFile, setChatTargetFile] = useState<FileGroup | null>(null);

  const fetchHistory = useCallback(async () => {
    // 토큰 초기 로딩 중에는 "로그인 필요"로 오판하지 않도록 대기
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!isAuthenticated || !token) {
      setFiles([]);
      setError('히스토리를 보려면 로그인이 필요합니다.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const url = `${BACKEND_URL}/history?grouped=true&include_records=true`;
      console.log('Fetching history from:', url);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', response.status, errorText);
        if (response.status === 401) {
          throw new Error('로그인이 필요합니다.');
        }
        throw new Error(`히스토리를 불러오는데 실패했습니다. (${response.status}: ${response.statusText})`);
      }

      // JSON 파싱 전에 응답 크기 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버가 유효하지 않은 응답 형식을 반환했습니다.');
      }

      const data = await response.json();
      console.log('History data received:', data?.length || 0, 'files');

      // 데이터 유효성 검사
      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        throw new Error('서버가 유효하지 않은 데이터 형식을 반환했습니다.');
      }

      setFiles(data);

      // 첫 번째 파일 자동 확장은 "최초 1회"만 수행 (사용자가 접어둔 상태를 되돌리지 않음)
      if (!didAutoExpandRef.current && data.length > 0) {
        const firstGroupKey = data[0].first_timestamp
          ? `${data[0].filename}_${data[0].first_timestamp}`
          : data[0].filename;
        setExpandedFiles(new Set([firstGroupKey]));
        didAutoExpandRef.current = true;
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('요청 시간이 초과되었습니다. 다시 시도해주세요.');
        } else if (err instanceof TypeError && err.message.includes('fetch')) {
          setError(`백엔드 서버에 연결할 수 없습니다. (${BACKEND_URL})`);
        } else {
          setError(err.message || '알 수 없는 오류가 발생했습니다.');
        }
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, token]);

  const getGroupKey = (fileGroup: FileGroup): string => {
    // 고유 그룹 키 생성 (파일명 + 첫 타임스탬프)
    return fileGroup.first_timestamp 
      ? `${fileGroup.filename}_${fileGroup.first_timestamp}` 
      : fileGroup.filename;
  };

  const toggleFile = (fileGroup: FileGroup) => {
    const groupKey = getGroupKey(fileGroup);
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedFiles(newExpanded);
  };

  const handleEdit = () => {
    if (selectedRecord) {
      setEditedText(selectedRecord.extracted_text);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText('');
  };

  const handleSave = async () => {
    if (!selectedRecord) return;
    
    setIsSaving(true);
    try {
      if (!token) throw new Error('로그인이 필요합니다.');
      const formData = new FormData();
      formData.append('extracted_text', editedText);

      const response = await fetch(`${BACKEND_URL}/history/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('텍스트 수정에 실패했습니다.');
      }

      const updatedRecord = await response.json();
      
      // 선택된 레코드 업데이트
      setSelectedRecord(updatedRecord);
      
      // 파일 목록도 업데이트
      setFiles(prevFiles => 
        prevFiles.map(fileGroup => {
          const records = fileGroup.records || [];
          return {
            ...fileGroup,
            records: records.map(record =>
              record.id === updatedRecord.id ? updatedRecord : record
            )
          };
        })
      );
      
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '텍스트 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/history/${selectedRecord.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error('레코드 삭제에 실패했습니다.');
      }

      // 파일 목록에서 삭제
      setFiles(prevFiles => 
        prevFiles.map(fileGroup => {
          const records = fileGroup.records || [];
          const filteredRecords = records.filter(record => record.id !== selectedRecord.id);
          return {
            ...fileGroup,
            records: filteredRecords,
            total_records: filteredRecords.length
          };
        }).filter(fileGroup => fileGroup.total_records > 0)
      );
      
      setSelectedRecord(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '레코드 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setIsDeletingFile(true);
    setError(null);
    try {
      // 파일 그룹 삭제 API 호출
      const url = fileToDelete.first_timestamp
        ? `${BACKEND_URL}/history/file/${encodeURIComponent(fileToDelete.filename)}?first_timestamp=${encodeURIComponent(fileToDelete.first_timestamp)}`
        : `${BACKEND_URL}/history/file/${encodeURIComponent(fileToDelete.filename)}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || '파일 삭제에 실패했습니다.');
      }

      // 파일 목록에서 삭제된 파일 그룹 제거
      setFiles(prevFiles => {
        const groupKey = getGroupKey(fileToDelete);
        return prevFiles.filter(fileGroup => getGroupKey(fileGroup) !== groupKey);
      });

      // 삭제된 파일의 레코드가 선택되어 있으면 선택 해제
      if (selectedRecord && (fileToDelete.records || []).some(r => r.id === selectedRecord.id)) {
        setSelectedRecord(null);
        setIsEditing(false);
      }
      
      setFileToDelete(null);
      
      // 히스토리 새로고침
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingFile(false);
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedRecordIds(new Set());
    }
  };

  const toggleRecordSelection = (recordId: number) => {
    const newSelected = new Set(selectedRecordIds);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecordIds(newSelected);
  };

  const selectAllRecords = () => {
    const allRecordIds = new Set<number>();
    files.forEach(fileGroup => {
      (fileGroup.records || []).forEach(record => {
        allRecordIds.add(record.id);
      });
    });
    setSelectedRecordIds(allRecordIds);
  };

  const clearSelection = () => {
    setSelectedRecordIds(new Set());
  };

  const toggleFileGroupSelection = (groupKey: string) => {
    const newSelected = new Set(selectedFileGroups);
    if (newSelected.has(groupKey)) {
      newSelected.delete(groupKey);
    } else {
      newSelected.add(groupKey);
    }
    setSelectedFileGroups(newSelected);
  };

  const selectAllFileGroups = () => {
    const allGroupKeys = new Set<string>();
    files.forEach(fileGroup => {
      allGroupKeys.add(getGroupKey(fileGroup));
    });
    setSelectedFileGroups(allGroupKeys);
  };

  const clearFileGroupSelection = () => {
    setSelectedFileGroups(new Set());
  };

  const handleDeleteMultipleFiles = async () => {
    if (selectedFileGroups.size === 0) return;
    
    setIsDeletingMultipleFiles(true);
    setError(null);
    try {
      const groupKeysToDelete = Array.from(selectedFileGroups);
      const filesToDelete = files.filter(fileGroup => 
        groupKeysToDelete.includes(getGroupKey(fileGroup))
      );
      
      // 각 파일 그룹을 순차적으로 삭제
      const deletedGroupKeys: string[] = [];
      const errors: string[] = [];
      
      for (const fileGroup of filesToDelete) {
        try {
          const url = fileGroup.first_timestamp
            ? `${BACKEND_URL}/history/file/${encodeURIComponent(fileGroup.filename)}?first_timestamp=${encodeURIComponent(fileGroup.first_timestamp)}`
            : `${BACKEND_URL}/history/file/${encodeURIComponent(fileGroup.filename)}`;
          
          const response = await fetch(url, {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(errorData.detail || `파일 "${fileGroup.filename}" 삭제 실패`);
          }
          
          deletedGroupKeys.push(getGroupKey(fileGroup));
        } catch (err) {
          errors.push(err instanceof Error ? err.message : `파일 "${fileGroup.filename}" 삭제 중 오류`);
        }
      }
      
      if (errors.length > 0) {
        setError(`일부 파일 삭제 실패: ${errors.join(', ')}`);
      }
      
      // 삭제된 파일 그룹이 선택된 레코드를 포함하는지 확인
      const deletedGroupKeysSet = new Set(deletedGroupKeys);
      const deletedFileGroups = filesToDelete.filter(fg => 
        deletedGroupKeysSet.has(getGroupKey(fg))
      );
      
      const deletedRecordIds = new Set<number>();
      deletedFileGroups.forEach(fileGroup => {
        (fileGroup.records || []).forEach(record => {
          deletedRecordIds.add(record.id);
        });
      });
      
      // 삭제된 파일의 레코드가 선택되어 있으면 선택 해제
      if (selectedRecord && deletedRecordIds.has(selectedRecord.id)) {
        setSelectedRecord(null);
        setIsEditing(false);
      }
      
      // 선택된 레코드 ID에서도 삭제된 레코드 제거
      const newSelectedRecordIds = new Set(selectedRecordIds);
      deletedRecordIds.forEach(id => newSelectedRecordIds.delete(id));
      setSelectedRecordIds(newSelectedRecordIds);
      
      // 선택 초기화
      setSelectedFileGroups(new Set());
      
      // 히스토리 새로고침
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택한 파일 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingMultipleFiles(false);
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedRecordIds.size === 0) return;
    
    setIsDeletingMultiple(true);
    setError(null);
    try {
      if (!token) throw new Error('로그인이 필요합니다.');
      const response = await fetch(`${BACKEND_URL}/history/delete-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(Array.from(selectedRecordIds)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || '선택한 레코드 삭제에 실패했습니다.');
      }

      const result = await response.json();
      
      // 선택된 레코드 중 삭제된 것 제외
      const deletedIds = new Set(result.deleted_ids || []);
      
      // 파일 목록에서 삭제된 레코드 제거
      setFiles(prevFiles => 
        prevFiles.map(fileGroup => {
          const records = fileGroup.records || [];
          const filteredRecords = records.filter(record => !deletedIds.has(record.id));
          return {
            ...fileGroup,
            records: filteredRecords,
            total_records: filteredRecords.length
          };
        }).filter(fileGroup => fileGroup.total_records > 0)
      );

      // 삭제된 레코드가 선택되어 있으면 선택 해제
      if (selectedRecord && deletedIds.has(selectedRecord.id)) {
        setSelectedRecord(null);
        setIsEditing(false);
      }

      // 선택 초기화 및 다중 선택 모드 해제
      setSelectedRecordIds(new Set());
      setIsMultiSelectMode(false);
      
      // 히스토리 새로고침
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택한 레코드 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  useEffect(() => {
    // 로그인 토큰 준비가 끝난 뒤(또는 변경 시) 히스토리 재조회
    fetchHistory();
  }, [fetchHistory]);

  // 모든 레코드를 시간순으로 정렬된 리스트로 변환
  const getAllRecordsSorted = useCallback((): OCRRecord[] => {
    const allRecords: OCRRecord[] = [];
    files.forEach(fileGroup => {
      allRecords.push(...(fileGroup.records || []));
    });
    // 시간순으로 정렬 (최신순)
    return allRecords.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [files]);

  // 레코드 상세 정보 가져오기 (이미지 포함)
  const fetchRecordDetails = useCallback(async (recordId: number) => {
    try {
      if (!token) return null;
      const response = await fetch(`${BACKEND_URL}/history/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const fullRecord = await response.json();
        return fullRecord;
      }
    } catch (err) {
      console.error('Failed to fetch record details:', err);
    }
    return null;
  }, [token]);

  // 이전 레코드로 이동
  const navigateToPrevious = useCallback(async () => {
    if (!selectedRecord) return;
    const allRecords = getAllRecordsSorted();
    const currentIndex = allRecords.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex > 0) {
      const prevRecord = allRecords[currentIndex - 1];
      // 이미지가 필요한 경우 별도로 조회
      const fullRecord = await fetchRecordDetails(prevRecord.id);
      setSelectedRecord(fullRecord || prevRecord);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedRecord, getAllRecordsSorted, fetchRecordDetails]);

  // 다음 레코드로 이동
  const navigateToNext = useCallback(async () => {
    if (!selectedRecord) return;
    const allRecords = getAllRecordsSorted();
    const currentIndex = allRecords.findIndex(r => r.id === selectedRecord.id);
    if (currentIndex < allRecords.length - 1) {
      const nextRecord = allRecords[currentIndex + 1];
      // 이미지가 필요한 경우 별도로 조회
      const fullRecord = await fetchRecordDetails(nextRecord.id);
      setSelectedRecord(fullRecord || nextRecord);
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedRecord, getAllRecordsSorted, fetchRecordDetails]);

  // 키보드 단축키 지원
  useEffect(() => {
    if (!selectedRecord) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 편집 중이거나 삭제 확인 중이면 키보드 단축키 비활성화
      if (isEditing || showDeleteConfirm) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedRecord, isEditing, showDeleteConfirm, navigateToPrevious, navigateToNext]);

  // 현재 레코드의 인덱스와 전체 개수 계산
  const recordNavigation = useMemo(() => {
    if (!selectedRecord) return { currentIndex: -1, total: 0 };
    const allRecords = getAllRecordsSorted();
    const currentIndex = allRecords.findIndex(r => r.id === selectedRecord.id);
    return { currentIndex, total: allRecords.length };
  }, [selectedRecord, getAllRecordsSorted]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // key:value 패턴 파싱 함수
  const parseKeyValue = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    // "key:value" 패턴 찾기 (줄바꿈 또는 끝까지)
    const pattern = /([^:\n\r]+):\s*([^\n\r]+)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (key && value) {
        result[key] = value;
      }
    }
    return result;
  };

  // 전체 텍스트 다운로드 (파일 그룹별)
  const downloadAllText = (fileGroup: FileGroup) => {
    const records = fileGroup.records || [];
    if (records.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    const data = records.map((record, index) => ({
      '번호': index + 1,
      'ID': record.id,
      '파일명': fileGroup.filename,
      '페이지': record.page_number || '',
      '타임스탬프': formatDate(record.timestamp),
      '추출된 텍스트': record.extracted_text || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OCR 결과');

    // 파일명 생성 (특수문자 제거)
    const safeFilename = fileGroup.filename.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const filename = `${safeFilename}_전체텍스트_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  // key:value 형태 다운로드 (파일 그룹별)
  const downloadKeyValue = (fileGroup: FileGroup) => {
    const records = fileGroup.records || [];
    if (records.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    // 모든 레코드를 파싱하여 모든 key 수집
    const allKeys = new Set<string>();
    const parsedRecords: Array<Record<string, any> & { _id: number; _page?: number; _timestamp: string }> = [];

    records.forEach((record) => {
      const parsed = parseKeyValue(record.extracted_text);
      Object.keys(parsed).forEach(key => allKeys.add(key));
      parsedRecords.push({
        _id: record.id,
        _page: record.page_number,
        _timestamp: formatDate(record.timestamp),
        ...parsed,
      });
    });

    // 기본 컬럼 + 모든 key 컬럼
    const columns = ['번호', 'ID', '파일명', '페이지', '타임스탬프', ...Array.from(allKeys).sort()];
    
    const data = parsedRecords.map((parsed, index) => {
      const row: Record<string, any> = {
        '번호': index + 1,
        'ID': parsed._id,
        '파일명': fileGroup.filename,
        '페이지': parsed._page || '',
        '타임스탬프': parsed._timestamp,
      };
      
      // 모든 key에 대해 value 추가 (없으면 빈 문자열)
      allKeys.forEach(key => {
        row[key] = parsed[key] || '';
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OCR 결과');

    // 파일명 생성
    const safeFilename = fileGroup.filename.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const filename = `${safeFilename}_KeyValue_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  // 전체 파일 그룹 다운로드 (전체 텍스트)
  const downloadAllFilesText = () => {
    if (files.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    const allData: any[] = [];
    files.forEach((fileGroup) => {
      const records = fileGroup.records || [];
      records.forEach((record) => {
        allData.push({
          '번호': allData.length + 1,
          'ID': record.id,
          '파일명': fileGroup.filename,
          '페이지': record.page_number || '',
          '타임스탬프': formatDate(record.timestamp),
          '추출된 텍스트': record.extracted_text || '',
        });
      });
    });

    if (allData.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '전체 OCR 결과');

    const filename = `전체_OCR_결과_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 전체 파일 그룹 다운로드 (key:value)
  const downloadAllFilesKeyValue = () => {
    if (files.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    // 모든 레코드를 파싱하여 모든 key 수집
    const allKeys = new Set<string>();
    const parsedRecords: Array<Record<string, any> & { _id: number; _filename: string; _page?: number; _timestamp: string }> = [];

    files.forEach((fileGroup) => {
      const records = fileGroup.records || [];
      records.forEach((record) => {
        const parsed = parseKeyValue(record.extracted_text);
        Object.keys(parsed).forEach(key => allKeys.add(key));
        parsedRecords.push({
          _id: record.id,
          _filename: fileGroup.filename,
          _page: record.page_number,
          _timestamp: formatDate(record.timestamp),
          ...parsed,
        });
      });
    });

    if (parsedRecords.length === 0) {
      alert(t('historyPage.alerts.noDownloadData'));
      return;
    }

    const columns = ['번호', 'ID', '파일명', '페이지', '타임스탬프', ...Array.from(allKeys).sort()];
    
    const data = parsedRecords.map((parsed, index) => {
      const row: Record<string, any> = {
        '번호': index + 1,
        'ID': parsed._id,
        '파일명': parsed._filename,
        '페이지': parsed._page || '',
        '타임스탬프': parsed._timestamp,
      };
      
      allKeys.forEach(key => {
        row[key] = parsed[key] || '';
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '전체 OCR 결과');

    const filename = `전체_OCR_결과_KeyValue_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.download-menu-container')) {
        setShowAllDownloadMenu(false);
        setShowFileDownloadMenu(new Set());
      }
    };

    if (showAllDownloadMenu || showFileDownloadMenu.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAllDownloadMenu, showFileDownloadMenu]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('historyPage.title')}</h1>
          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <div className="relative download-menu-container">
                <button
                  onClick={() => setShowAllDownloadMenu(!showAllDownloadMenu)}
                  className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-white hover:bg-green-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('historyPage.excelDownload')}
                </button>
                {showAllDownloadMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                        {t('historyPage.allDownload')}
                      </div>
                      <button
                        onClick={() => {
                          downloadAllFilesText();
                          setShowAllDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t('historyPage.allTextDownload')}
                      </button>
                      <button
                        onClick={() => {
                          downloadAllFilesKeyValue();
                          setShowAllDownloadMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {t('historyPage.allKeyValueDownload')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isMultiSelectMode && selectedRecordIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-gray-700">
                  {selectedRecordIds.size}{t('historyPage.selectedCount')}
                </span>
                <button
                  onClick={handleDeleteMultiple}
                  disabled={isDeletingMultiple}
                  className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeletingMultiple ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('historyPage.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('historyPage.deleteSelected')}
                    </>
                  )}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={isDeletingMultiple}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('historyPage.clearSelection')}
                </button>
              </div>
            )}
            <button
              onClick={toggleMultiSelectMode}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                isMultiSelectMode
                  ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              {isMultiSelectMode ? (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  {t('historyPage.multiSelectOff')}
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  {t('historyPage.multiSelect')}
                </>
              )}
            </button>
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('historyPage.refresh')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('historyPage.noRecords')}</p>
          </div>
        ) : selectedRecord ? (
          // 상세 보기 모드
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedRecord(null);
                    setIsEditing(false);
                    setShowDeleteConfirm(false);
                  }}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  {t('historyPage.backToList')}
                </button>
                {!isEditing && (
                  <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
                    <button
                      onClick={navigateToPrevious}
                      disabled={recordNavigation.currentIndex === 0}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('historyPage.prevRecord')}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-500 px-2">
                      {recordNavigation.currentIndex + 1} / {recordNavigation.total}
                    </span>
                    <button
                      onClick={navigateToNext}
                      disabled={recordNavigation.currentIndex === recordNavigation.total - 1}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t('historyPage.nextRecord')}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              {!isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('historyPage.edit')}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </button>
                </div>
              )}
            </div>

            {showDeleteConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-4">
                  정말로 이 OCR 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSaving ? '삭제 중...' : '삭제'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                {/* 왼쪽: 크롭된 이미지 */}
                <div className="lg:w-1/2 bg-gray-50 p-6 flex items-center justify-center min-h-[400px]">
                  {selectedRecord.cropped_image ? (
                    <img
                      src={`data:image/png;base64,${selectedRecord.cropped_image}`}
                      alt={`Cropped area ${selectedRecord.id}`}
                      className="max-w-full max-h-[600px] object-contain rounded border border-gray-300 shadow-sm"
                    />
                  ) : (
                    <div className="text-gray-400 text-sm">이미지 없음</div>
                  )}
                </div>
                
                {/* 오른쪽: 추출된 텍스트 */}
                <div className="lg:w-1/2 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs text-gray-500">ID: {selectedRecord.id}</span>
                      <span className="text-xs text-gray-500 ml-4">
                        {formatDate(selectedRecord.timestamp)}
                      </span>
                      {selectedRecord.page_number && (
                        <span className="text-xs text-gray-500 ml-4">
                          페이지: {selectedRecord.page_number}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {/* 원본 텍스트 */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2 font-semibold">원본 텍스트</div>
                          <div className="border border-gray-300 rounded-md bg-gray-50 p-4 h-[400px] overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                              {selectedRecord?.extracted_text || '(빈 텍스트)'}
                            </pre>
                          </div>
                        </div>
                        {/* 수정 중인 텍스트 */}
                        <div>
                          <div className="text-xs text-gray-500 mb-2 font-semibold">수정 중인 텍스트</div>
                          <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
                            <div className="h-[400px] overflow-y-auto p-4 font-mono text-sm">
                              {selectedRecord ? (
                                editedText.split('\n').map((line, idx) => {
                                  const originalLine = selectedRecord.extracted_text.split('\n')[idx] || '';
                                  const isModified = line !== originalLine;
                                  return (
                                    <div 
                                      key={idx} 
                                      className={isModified ? 'bg-red-50 border-l-4 border-red-500 pl-2 py-1 mb-1' : 'pl-2 py-1 mb-1'}
                                    >
                                      <span style={{ color: isModified ? '#dc2626' : '#111827' }}>
                                        {line || ' '}
                                      </span>
                                    </div>
                                  );
                                })
                              ) : (
                                <div style={{ color: '#111827' }}>
                                  {editedText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* 편집 가능한 textarea */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2 font-semibold">텍스트 편집</div>
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full h-[200px] p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          placeholder="텍스트를 입력하세요..."
                          style={{ 
                            color: '#111827',
                            caretColor: '#111827'
                          }}
                        />
                      </div>
                      {/* 수정 상태 표시 */}
                      {selectedRecord && editedText !== selectedRecord.extracted_text && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                          <span className="font-semibold">수정됨:</span> 위 비교 뷰에서 빨간색으로 표시된 줄이 원본과 다른 내용입니다.
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              저장 중...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              저장
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-md p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {selectedRecord.extracted_text || '(빈 텍스트)'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 파일 목록 모드
          <div className="space-y-4">
            {selectedFileGroups.size > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-green-800 font-medium">
                      파일 선택: {selectedFileGroups.size}개 파일 선택됨
                    </span>
                    <button
                      onClick={selectAllFileGroups}
                      className="text-sm text-green-600 hover:text-green-800 underline"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={clearFileGroupSelection}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      선택 해제
                    </button>
                  </div>
                  <button
                    onClick={handleDeleteMultipleFiles}
                    disabled={isDeletingMultipleFiles}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {isDeletingMultipleFiles ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        삭제 중...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        선택한 {selectedFileGroups.size}개 파일 삭제
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            {isMultiSelectMode && files.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-blue-800">
                      다중 선택 모드: {selectedRecordIds.size}개 선택됨
                    </span>
                    <button
                      onClick={selectAllRecords}
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-600 hover:text-gray-800 underline"
                    >
                      선택 해제
                    </button>
                  </div>
                  {selectedRecordIds.size > 0 && (
                    <button
                      onClick={handleDeleteMultiple}
                      disabled={isDeletingMultiple}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {isDeletingMultiple ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          선택한 {selectedRecordIds.size}개 삭제
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
            {fileToDelete && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-4 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">파일 삭제 확인</h3>
                    <p className="text-sm text-red-800 mb-2">
                      다음 파일의 모든 기록을 삭제하시겠습니까?
                    </p>
                    <div className="bg-white rounded-md p-3 mb-3 border border-red-200">
                      <div className="font-medium text-gray-900">{fileToDelete.filename}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        총 <strong className="text-red-600">{fileToDelete.total_records}개</strong>의 기록이 삭제됩니다
                      </div>
                    </div>
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setFileToDelete(null)}
                    disabled={isDeletingFile}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteFile}
                    disabled={isDeletingFile}
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isDeletingFile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        삭제 중...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            {files.map((fileGroup) => {
              const groupKey = getGroupKey(fileGroup);
              const isExpanded = expandedFiles.has(groupKey);
              const isFileSelected = selectedFileGroups.has(groupKey);
              // 같은 파일명이 여러 개인지 확인 (같은 파일명의 다른 그룹이 있는지)
              const sameFilenameCount = files.filter(f => f.filename === fileGroup.filename).length;
              const displayName = sameFilenameCount > 1 && fileGroup.first_timestamp
                ? `${fileGroup.filename} (${formatDate(fileGroup.first_timestamp)})`
                : fileGroup.filename;
              
              return (
              <div
                key={groupKey}
                className={`border rounded-lg ${
                  isFileSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
              >
                {/* 파일 헤더 */}
                <div className={`flex items-center transition-colors group relative overflow-visible ${
                  isFileSelected ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFileGroupSelection(groupKey);
                    }}
                    className="p-3 cursor-pointer"
                    title={isFileSelected ? '선택 해제' : '선택'}
                  >
                    {isFileSelected ? (
                      <CheckSquare className="w-5 h-5 text-green-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFile(fileGroup)}
                    className="flex-1 flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">{displayName}</div>
                        <div className="text-sm text-gray-500">
                          {fileGroup.total_records}개 기록 · {formatDate(fileGroup.latest_timestamp)}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 pr-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatTargetFile(fileGroup);
                        setIsChatOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                      title={`${displayName} OCR 텍스트로 대화하기`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">대화하기</span>
                    </button>
                    {fileGroup.records && fileGroup.records.length > 0 && (
                      <div className="relative download-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSet = new Set(showFileDownloadMenu);
                            if (newSet.has(groupKey)) {
                              newSet.delete(groupKey);
                            } else {
                              newSet.add(groupKey);
                            }
                            setShowFileDownloadMenu(newSet);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                          title={`${displayName} 엑셀 다운로드`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">엑셀 다운로드</span>
                        </button>
                        {showFileDownloadMenu.has(groupKey) && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadAllText(fileGroup);
                                  const newSet = new Set(showFileDownloadMenu);
                                  newSet.delete(groupKey);
                                  setShowFileDownloadMenu(newSet);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                전체 텍스트 다운로드
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadKeyValue(fileGroup);
                                  const newSet = new Set(showFileDownloadMenu);
                                  newSet.delete(groupKey);
                                  setShowFileDownloadMenu(newSet);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              >
                                Key:Value 다운로드
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileToDelete(fileGroup);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      title={`${displayName} 파일 삭제 (${fileGroup.total_records}개 기록)`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">파일 삭제</span>
                    </button>
                  </div>
                </div>
                
                {/* 파일 내 기록 목록 */}
                {isExpanded && (
                  <div className="p-4 bg-white overflow-hidden">
                    {isMultiSelectMode && fileGroup.records && fileGroup.records.length > 0 && (
                      <div className="mb-3 pb-3 border-b border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const records = fileGroup.records || [];
                            const allIdsInGroup = new Set(records.map(r => r.id));
                            const allSelected = records.length > 0 && 
                              Array.from(selectedRecordIds).filter(id => allIdsInGroup.has(id)).length === records.length;
                            
                            if (allSelected) {
                              // 모두 선택되어 있으면 이 그룹의 모든 항목 선택 해제
                              const newSelected = new Set(selectedRecordIds);
                              records.forEach(r => newSelected.delete(r.id));
                              setSelectedRecordIds(newSelected);
                            } else {
                              // 일부만 선택되어 있으면 모두 선택
                              const newSelected = new Set(selectedRecordIds);
                              records.forEach(r => newSelected.add(r.id));
                              setSelectedRecordIds(newSelected);
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                        >
                          {(() => {
                            const records = fileGroup.records || [];
                            const allIdsInGroup = new Set(records.map(r => r.id));
                            const allSelected = records.length > 0 && 
                              Array.from(selectedRecordIds).filter(id => allIdsInGroup.has(id)).length === records.length;
                            return allSelected ? (
                              <>
                                <CheckSquare className="w-4 h-4" />
                                전체 선택 해제
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4" />
                                전체 선택
                              </>
                            );
                          })()}
                        </button>
                      </div>
                    )}
                    <div className="space-y-3">
                      {(fileGroup.records || []).map((record) => {
                        const isSelected = selectedRecordIds.has(record.id);
                        return (
                          <div
                            key={record.id}
                            onClick={async () => {
                              if (isMultiSelectMode) {
                                toggleRecordSelection(record.id);
                              } else {
                                // 이미지가 필요한 경우 별도 API로 조회
                                if (!record.cropped_image) {
                                  try {
                                    const response = await fetch(`${BACKEND_URL}/history/${record.id}`);
                                    if (response.ok) {
                                      const fullRecord = await response.json();
                                      setSelectedRecord(fullRecord);
                                    } else {
                                      // 이미지 없이도 표시 가능하도록 기존 레코드 사용
                                      setSelectedRecord(record);
                                    }
                                  } catch (err) {
                                    console.error('Failed to fetch record details:', err);
                                    // 에러 발생 시에도 기존 레코드로 표시
                                    setSelectedRecord(record);
                                  }
                                } else {
                                  setSelectedRecord(record);
                                }
                              }
                            }}
                            className={`p-3 border rounded-md transition-colors ${
                              isMultiSelectMode
                                ? isSelected
                                  ? 'border-blue-500 bg-blue-100 hover:bg-blue-200 cursor-pointer'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {isMultiSelectMode && (
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleRecordSelection(record.id);
                                  }}
                                  className="pt-0.5 cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    {record.page_number && (
                                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        페이지 {record.page_number}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {formatDate(record.timestamp)}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-400">ID: {record.id}</span>
                                </div>
                                <div className="text-sm text-gray-700 line-clamp-2">
                                  {record.extracted_text.substring(0, 100)}
                                  {record.extracted_text.length > 100 ? '...' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <OcrChatModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setChatTargetFile(null);
        }}
        fileGroup={chatTargetFile}
        backendUrl={BACKEND_URL}
      />
    </div>
  );
}

