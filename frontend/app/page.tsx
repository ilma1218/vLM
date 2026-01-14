'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import ReactCrop, { Crop, PixelCrop, PercentCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { renderPdfFirstPageToCanvas, renderPdfAllPagesToCanvases, getPdfPageCount } from '@/utils/pdfUtils';
import { cropImageToBlob, CropArea } from '@/utils/cropUtils';
import { Upload, X, Loader2, ChevronLeft, ChevronRight, Plus, Save, FolderOpen, Trash2, Edit2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import LandingState from '@/components/LandingState';
import LoginModal from '@/components/LoginModal';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const OCR_RESULT_STORAGE_KEY = 'ocr_result';
const PROMPT_STORAGE_KEY = 'custom_prompt';
const PROMPT_LIST_STORAGE_KEY = 'saved_prompts';
const DEFAULT_PROMPT = 'Extract ONLY the text that is ACTUALLY VISIBLE in this cropped image. Read from left to right, top to bottom, line by line. Extract each line exactly once. Do NOT generate patterns. Do NOT create number sequences like \'10, 11, 12...\'. Do NOT repeat any text. Do NOT extrapolate beyond what is visible. Output only the actual text you can see in the image:';

// 프리셋 정의
const PRESETS = {
  receipt: {
    name: '영수증',
    keys: ['가게명', '주소', '전화번호', '판매일시', '총액', '결제수단'],
  },
  businessCard: {
    name: '명함',
    keys: ['이름', '직책', '회사명', '이메일', '전화번호', '주소'],
  },
  invoice: {
    name: '세금계산서',
    keys: ['공급자', '공급받는자', '사업자등록번호', '공급가액', '부가세', '합계금액'],
  },
};

// 파일명 유틸리티 함수
const getFileNameWithoutExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(0, lastDot) : filename;
};

// 숫자를 원형 숫자로 변환 (①, ②, ③, ...)
const getCircledNumber = (num: number): string => {
  if (num <= 0) return '';
  if (num <= 20) {
    // ①~⑳ (U+2460~U+2473)
    return String.fromCharCode(0x2460 + num - 1);
  } else {
    // 20을 초과하면 일반 숫자 표시
    return num.toString();
  }
};

interface SavedPrompt {
  id: number;
  name: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

interface SavedExtractKeys {
  id: number;
  name: string;
  keys: string[];
  created_at: string;
  updated_at: string;
}

interface CropAreaData {
  id: string;
  crop: Crop;
  completedCrop: PixelCrop;
  cropPercent?: {x: number, y: number, width: number, height: number};
  pageNumber?: number; // PDF 페이지 번호 (이미지는 undefined)
}

export default function Home() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]); // 다중 파일 업로드용
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0); // 현재 표시 중인 파일 인덱스
  // 각 파일별 상태 저장 (PDF 캔버스, 이미지 등)
  const [filesData, setFilesData] = useState<Map<number, {
    isPdf: boolean;
    pdfFile: File | null;
    pdfCanvases: HTMLCanvasElement[];
    totalPages: number;
    imageSrc: string | null;
  }>>(new Map());
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [currentCrop, setCurrentCrop] = useState<Crop>();
  const [currentCompletedCrop, setCurrentCompletedCrop] = useState<PixelCrop>();
  // 페이지별 크롭 영역 관리: Map<pageNumber, CropAreaData[]>
  // 이미지의 경우 pageNumber는 undefined
  const [cropAreasByPage, setCropAreasByPage] = useState<Map<number | undefined, CropAreaData[]>>(new Map());
  const [nextCropId, setNextCropId] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processedAreasCount, setProcessedAreasCount] = useState<number>(0);
  const [processedPagesSet, setProcessedPagesSet] = useState<Set<number>>(new Set());
  const [croppedPreviews, setCroppedPreviews] = useState<Map<string, string>>(new Map());
  // OCR 결과를 임시로 저장 (저장 버튼을 위해)
  const [ocrResultsData, setOcrResultsData] = useState<Array<{
    extracted_text: string;
    cropped_image: string;
    filename: string;
    page_number: number | null;
  }>>([]);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfCanvases, setPdfCanvases] = useState<HTMLCanvasElement[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [draggingAreaId, setDraggingAreaId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editingPromptValue, setEditingPromptValue] = useState<string>('');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);
  const [promptName, setPromptName] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedExtractKeys, setSavedExtractKeys] = useState<SavedExtractKeys[]>([]);
  const [showSavedExtractKeys, setShowSavedExtractKeys] = useState(false);
  const [extractKeysName, setExtractKeysName] = useState<string>('');
  const [showSaveKeysDialog, setShowSaveKeysDialog] = useState(false);
  const [ocrMode, setOcrMode] = useState<'standard' | 'advanced'>('standard'); // 'standard' | 'advanced'
  const [selectedLanguage, setSelectedLanguage] = useState<'ko' | 'en'>('ko');
  const [extractKeys, setExtractKeys] = useState<string[]>([]);
  const [keyInputValue, setKeyInputValue] = useState<string>('');
  const [isComposing, setIsComposing] = useState(false);
  const [autoCollectFullPage, setAutoCollectFullPage] = useState(false); // 페이지 전체 자동수집
  const [showApplyToAllModal, setShowApplyToAllModal] = useState(false);
  const [pendingCropData, setPendingCropData] = useState<{
    cropPercent: {x: number, y: number, width: number, height: number};
    finalCrop: PixelCrop;
  } | null>(null);

  // 모드 변경 시 자동수집 옵션 초기화
  useEffect(() => {
    if (ocrMode === 'standard') {
      setAutoCollectFullPage(false);
    }
  }, [ocrMode]);

  // 태그 추가 함수
  const addKeyTag = useCallback((key: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey && !extractKeys.includes(trimmedKey)) {
      setExtractKeys([...extractKeys, trimmedKey]);
      setKeyInputValue('');
    }
  }, [extractKeys]);

  // 태그 삭제 함수
  const removeKeyTag = useCallback((key: string) => {
    setExtractKeys(extractKeys.filter(k => k !== key));
  }, [extractKeys]);

  // 프리셋 로드 함수
  const loadPreset = useCallback((presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    setExtractKeys(preset.keys);
  }, []);

  // 키 입력 처리 (Enter 키) - 한글 입력 중에는 처리하지 않음
  const handleKeyInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // 한글 입력 중(isComposing)이면 Enter 키를 무시
    if (e.isComposing || isComposing) {
      return;
    }
    
    if (e.key === 'Enter' && keyInputValue.trim()) {
      e.preventDefault();
      addKeyTag(keyInputValue);
    }
  }, [keyInputValue, addKeyTag, isComposing]);

  // 한글 입력 시작
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  // 한글 입력 종료
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
    setIsComposing(false);
    // 한글 입력이 완료된 후 Enter 키가 눌렸다면 태그 추가
    // 하지만 여기서는 직접 처리하지 않고, 다음 Enter 키 입력 시 처리되도록 함
  }, []);

  // 모드에 따른 프롬프트 생성
  const generatePrompt = useCallback(() => {
    if (ocrMode === 'standard') {
      // 일반 모드: 언어 선택에 따른 기본 프롬프트
      if (selectedLanguage === 'ko') {
        return '이 이미지의 모든 텍스트를 줄바꿈을 유지하여 추출해줘. 실제로 보이는 텍스트만 추출하고, 추측하거나 반복하지 마.';
      } else {
        return DEFAULT_PROMPT;
      }
    } else {
      // 고급 모드: 키워드 기반 프롬프트 생성
      if (extractKeys.length === 0) {
        return DEFAULT_PROMPT;
      }
      const keysList = extractKeys.join(', ');
      return `이미지에서 다음 항목(${keysList})의 값을 찾아 JSON 포맷 {'key': 'value'}로 추출해줘. 각 항목의 값을 정확히 찾아서 추출하고, 없으면 null로 표시해줘.`;
    }
  }, [ocrMode, selectedLanguage, extractKeys]);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 서버에서 프롬프트 목록 불러오기
  const fetchPrompts = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/prompts`);
      if (response.ok) {
        const prompts = await response.json();
        setSavedPrompts(prompts);
      }
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    }
  }, []);

  // 서버에서 추출 항목(Keys) 목록 불러오기
  const fetchExtractKeys = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/extract-keys`);
      if (response.ok) {
        const keys = await response.json();
        setSavedExtractKeys(keys);
      }
    } catch (error) {
      console.error('Failed to fetch extract keys:', error);
    }
  }, []);

  // localStorage에서 OCR 결과 복원 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOcrResult = localStorage.getItem(OCR_RESULT_STORAGE_KEY);
      if (savedOcrResult && savedOcrResult.trim()) {
        // OCR 결과가 있고 비어있지 않으면 복원
        setOcrResult(savedOcrResult);
      }
      
      // 서버에서 프롬프트 목록 불러오기
      fetchPrompts();
      // 서버에서 추출 항목(Keys) 목록 불러오기
      fetchExtractKeys();
    }
  }, [fetchPrompts, fetchExtractKeys]); // fetchPrompts, fetchExtractKeys 의존성 추가

  // OCR 결과가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (ocrResult && ocrResult.trim()) {
        localStorage.setItem(OCR_RESULT_STORAGE_KEY, ocrResult);
      } else {
        // OCR 결과가 없거나 빈 문자열이면 localStorage에서 제거
        localStorage.removeItem(OCR_RESULT_STORAGE_KEY);
      }
    }
  }, [ocrResult]);

  // 저장된 프롬프트 목록 저장
  const savePromptToList = useCallback(async (name: string, prompt: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || `프롬프트 ${savedPrompts.length + 1}`,
          prompt: prompt,
        }),
      });
      
      if (response.ok) {
        const newPrompt = await response.json();
        setSavedPrompts(prev => [newPrompt, ...prev]);
        setShowSaveDialog(false);
        setPromptName('');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setError(`프롬프트 저장 실패: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
      setError('프롬프트 저장 중 오류가 발생했습니다.');
    }
  }, [savedPrompts]);

  // 저장된 프롬프트 불러오기
  const loadSavedPrompt = useCallback((prompt: string) => {
    setCustomPrompt(prompt);
    setEditingPromptValue(prompt);
    setIsEditingPrompt(true);
    setShowSavedPrompts(false);
  }, []);

  // 저장된 프롬프트 삭제
  const deleteSavedPrompt = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/prompts/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSavedPrompts(prev => prev.filter(p => p.id !== id));
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setError(`프롬프트 삭제 실패: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      setError('프롬프트 삭제 중 오류가 발생했습니다.');
    }
  }, []);

  // 추출 항목(Keys) 저장
  const saveExtractKeysToList = useCallback(async (name: string, keys: string[]) => {
    try {
      const response = await fetch(`${BACKEND_URL}/extract-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || `추출 항목 ${savedExtractKeys.length + 1}`,
          keys: keys,
        }),
      });
      
      if (response.ok) {
        const newKeys = await response.json();
        setSavedExtractKeys(prev => [newKeys, ...prev]);
        setShowSaveKeysDialog(false);
        setExtractKeysName('');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setError(`추출 항목 저장 실패: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to save extract keys:', error);
      setError('추출 항목 저장 중 오류가 발생했습니다.');
    }
  }, [savedExtractKeys]);

  // 저장된 추출 항목(Keys) 불러오기
  const loadSavedExtractKeys = useCallback((keys: string[]) => {
    setExtractKeys(keys);
    setShowSavedExtractKeys(false);
  }, []);

  // 저장된 추출 항목(Keys) 삭제
  const deleteSavedExtractKeys = useCallback(async (id: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/extract-keys/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setSavedExtractKeys(prev => prev.filter(k => k.id !== id));
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        setError(`추출 항목 삭제 실패: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete extract keys:', error);
      setError('추출 항목 삭제 중 오류가 발생했습니다.');
    }
  }, []);

  // 현재 페이지의 크롭 영역 가져오기
  const getCurrentPageCropAreas = useCallback(() => {
    const pageKey = isPdf ? currentPage : undefined;
    return cropAreasByPage.get(pageKey) || [];
  }, [cropAreasByPage, isPdf, currentPage]);
  
  // 현재 페이지의 크롭 영역 (렌더링용 - useMemo로 최적화)
  const currentPageCropAreas = useMemo(() => {
    const pageKey = isPdf ? currentPage : undefined;
    return cropAreasByPage.get(pageKey) || [];
  }, [cropAreasByPage, isPdf, currentPage]);

  // 이미지 로드 핸들러
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    
    // 현재 화면에 보이는 이미지 크기 (반응형 대응)
    const displayedWidth = imgRef.current.clientWidth || imgRef.current.getBoundingClientRect().width;
    const displayedHeight = imgRef.current.clientHeight || imgRef.current.getBoundingClientRect().height;
    
    // 현재 페이지의 크롭 영역 복원
    const pageKey = isPdf ? currentPage : undefined;
    const currentAreas = cropAreasByPage.get(pageKey) || [];
    
    // 현재 페이지에 크롭 영역이 있으면 복원
    if (currentAreas.length > 0) {
      const restoredAreas = currentAreas.map(area => {
        if (area.cropPercent) {
          // cropPercent (0~100%)를 비율(0.0~1.0)로 변환 후 현재 이미지 크기 곱하기
          const ratioX = area.cropPercent.x / 100;
          const ratioY = area.cropPercent.y / 100;
          const ratioWidth = area.cropPercent.width / 100;
          const ratioHeight = area.cropPercent.height / 100;
          
      const newCrop: PixelCrop = {
            x: ratioX * displayedWidth,
            y: ratioY * displayedHeight,
            width: ratioWidth * displayedWidth,
            height: ratioHeight * displayedHeight,
        unit: 'px',
      };
          return {
            ...area,
            crop: {
        unit: 'px',
        x: newCrop.x,
        y: newCrop.y,
        width: newCrop.width,
        height: newCrop.height,
            },
            completedCrop: newCrop,
          };
        }
        return area;
      });
      
      setCropAreasByPage(prev => {
        const newMap = new Map(prev);
        newMap.set(pageKey, restoredAreas);
        return newMap;
      });
      
      // 첫 번째 영역을 현재 크롭으로 설정
      const firstArea = restoredAreas[0];
      if (firstArea.cropPercent) {
        const ratioX = firstArea.cropPercent.x / 100;
        const ratioY = firstArea.cropPercent.y / 100;
        const ratioWidth = firstArea.cropPercent.width / 100;
        const ratioHeight = firstArea.cropPercent.height / 100;
        
        const restoredCrop: PixelCrop = {
          x: ratioX * displayedWidth,
          y: ratioY * displayedHeight,
          width: ratioWidth * displayedWidth,
          height: ratioHeight * displayedHeight,
          unit: 'px',
        };
        
        setCurrentCrop({
          unit: 'px',
          x: restoredCrop.x,
          y: restoredCrop.y,
          width: restoredCrop.width,
          height: restoredCrop.height,
        });
        setCurrentCompletedCrop(restoredCrop);
      }
    } else if (isPdf && currentPage > 1) {
      // 현재 페이지에 크롭 영역이 없고, 첫 페이지가 아니면 첫 페이지의 모든 크롭 영역을 복사
      const firstPageAreas = cropAreasByPage.get(1) || [];
      if (firstPageAreas.length > 0) {
        // 첫 페이지의 모든 크롭 영역을 현재 페이지에 복사
        const copiedAreas = firstPageAreas.map(area => {
          if (area.cropPercent) {
            const ratioX = area.cropPercent.x / 100;
            const ratioY = area.cropPercent.y / 100;
            const ratioWidth = area.cropPercent.width / 100;
            const ratioHeight = area.cropPercent.height / 100;
            
            const newCrop: PixelCrop = {
              x: ratioX * displayedWidth,
              y: ratioY * displayedHeight,
              width: ratioWidth * displayedWidth,
              height: ratioHeight * displayedHeight,
              unit: 'px',
            };
            return {
              ...area,
              id: `crop-${nextCropId}-page-${currentPage}-${area.id.split('-').slice(-1)[0]}`,
              crop: {
                unit: 'px',
                x: newCrop.x,
                y: newCrop.y,
                width: newCrop.width,
                height: newCrop.height,
              },
              completedCrop: newCrop,
              pageNumber: currentPage,
            };
          }
          return {
            ...area,
            id: `crop-${nextCropId}-page-${currentPage}-${area.id.split('-').slice(-1)[0]}`,
            pageNumber: currentPage,
          };
        });
        
        setCropAreasByPage(prev => {
          const newMap = new Map(prev);
          newMap.set(pageKey, copiedAreas);
          return newMap;
        });
        
        // 첫 번째 영역을 현재 크롭으로 설정
        const firstPageArea = firstPageAreas[0];
        if (firstPageArea.cropPercent) {
          const ratioX = firstPageArea.cropPercent.x / 100;
          const ratioY = firstPageArea.cropPercent.y / 100;
          const ratioWidth = firstPageArea.cropPercent.width / 100;
          const ratioHeight = firstPageArea.cropPercent.height / 100;
          
          const defaultCrop: PixelCrop = {
            x: ratioX * displayedWidth,
            y: ratioY * displayedHeight,
            width: ratioWidth * displayedWidth,
            height: ratioHeight * displayedHeight,
            unit: 'px',
          };
          
          setCurrentCrop({
            unit: 'px',
            x: defaultCrop.x,
            y: defaultCrop.y,
            width: defaultCrop.width,
            height: defaultCrop.height,
          });
          setCurrentCompletedCrop(defaultCrop);
        }
      }
    }
  }, [cropAreasByPage, isPdf, currentPage, nextCropId]);
  
  // 현재 크롭 완료 핸들러
  // ESC 키로 현재 크롭 영역 초기화
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 저장하지 않은 현재 크롭 영역 초기화
        setCurrentCrop(undefined);
        setCurrentCompletedCrop(undefined);
        setEditingAreaId(null);
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const onCropComplete = useCallback((crop: PixelCrop, percentageCrop: PercentCrop) => {
    // 크롭이 변경되면 에러 메시지 초기화
    setError(null);
    
    // 크롭이 완료되면 즉시 currentCompletedCrop 설정
    // ReactCrop의 onComplete는 (pixelCrop, percentageCrop) 두 값을 제공
    // percentageCrop은 이미 % 단위 (0~100)로 계산되어 있으므로 이를 직접 사용
    if (crop && crop.width > 0 && crop.height > 0) {
    if (imgRef.current) {
        // percentageCrop을 0.0~1.0 범위의 비율로 변환
        const cropRatio = {
          x: percentageCrop.x / 100,
          y: percentageCrop.y / 100,
          width: percentageCrop.width / 100,
          height: percentageCrop.height / 100,
        };
        
        // 현재 화면에 보이는 이미지 크기 (getBoundingClientRect 사용)
        // 중요: naturalWidth가 아닌 현재 보이는 크기를 사용
        const rect = imgRef.current.getBoundingClientRect();
        const displayedWidth = rect.width;
        const displayedHeight = rect.height;
        
        // 비율을 포함한 확장된 crop 객체 저장
        setCurrentCompletedCrop({
          ...crop,
          // @ts-ignore - cropRatio를 임시로 저장 (0.0~1.0 범위)
          _cropRatio: cropRatio,
          _displayedWidth: displayedWidth,
          _displayedHeight: displayedHeight,
        });
      } else {
        setCurrentCompletedCrop(crop);
      }
    }
  }, []);

  // 크롭 영역 드래그 시작
  const handleCropAreaMouseDown = useCallback((e: React.MouseEvent, areaId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return; // 왼쪽 버튼만
    
    const pageKey = isPdf ? currentPage : undefined;
    const currentAreas = cropAreasByPage.get(pageKey) || [];
    const area = currentAreas.find(a => a.id === areaId);
    
    if (area && imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      
      setDraggingAreaId(areaId);
      setDragStart({ x: startX, y: startY });
      setHasDragged(false);
      setDragOffset({
        x: startX - area.crop.x,
        y: startY - area.crop.y,
      });
    }
  }, [cropAreasByPage, isPdf, currentPage]);

  // 마우스 이동 핸들러 (드래그 중)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingAreaId || !dragStart || !dragOffset || !imgRef.current) return;
      
      const rect = imgRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      // 드래그 거리 계산 (5px 이상 이동하면 드래그로 간주)
      const dragDistance = Math.sqrt(
        Math.pow(currentX - dragStart.x, 2) + Math.pow(currentY - dragStart.y, 2)
      );
      
      if (dragDistance > 5) {
        setHasDragged(true);
      }
      
      const newX = currentX - dragOffset.x;
      const newY = currentY - dragOffset.y;
      
      const pageKey = isPdf ? currentPage : undefined;
      const currentAreas = cropAreasByPage.get(pageKey) || [];
      const area = currentAreas.find(a => a.id === draggingAreaId);
      
      if (area && imgRef.current) {
      const imgWidth = imgRef.current.width;
      const imgHeight = imgRef.current.height;
        
        // 이미지 경계 내로 제한
        const clampedX = Math.max(0, Math.min(newX, imgWidth - area.crop.width));
        const clampedY = Math.max(0, Math.min(newY, imgHeight - area.crop.height));
        
        // 영역 위치 업데이트
        setCropAreasByPage(prev => {
          const newMap = new Map(prev);
          const updatedAreas = currentAreas.map(a => {
            if (a.id === draggingAreaId) {
              const newCrop: PixelCrop = {
                x: clampedX,
                y: clampedY,
                width: a.completedCrop.width,
                height: a.completedCrop.height,
                unit: 'px',
              };
              
              const cropPercent = {
                x: (clampedX / imgWidth) * 100,
                y: (clampedY / imgHeight) * 100,
                width: (a.completedCrop.width / imgWidth) * 100,
                height: (a.completedCrop.height / imgHeight) * 100,
              };
              
              return {
                ...a,
                crop: {
                  unit: 'px',
                  x: clampedX,
                  y: clampedY,
                  width: a.crop.width,
                  height: a.crop.height,
                },
                completedCrop: newCrop,
                cropPercent,
              };
            }
            return a;
          });
          newMap.set(pageKey, updatedAreas);
          return newMap;
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingAreaId(null);
      setDragStart(null);
      setDragOffset(null);
      // 드래그가 끝난 후 잠시 후 hasDragged 리셋 (클릭 이벤트와 구분하기 위해)
      setTimeout(() => setHasDragged(false), 100);
    };

    if (draggingAreaId) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingAreaId, dragStart, dragOffset, cropAreasByPage, isPdf, currentPage, hasDragged]);

  // 크롭 영역 클릭 핸들러 (드래그가 아닌 경우)
  const handleCropAreaClick = useCallback((areaId: string) => {
    // 드래그 중이면 클릭 이벤트 무시
    if (draggingAreaId) return;
    
    const pageKey = isPdf ? currentPage : undefined;
    const currentAreas = cropAreasByPage.get(pageKey) || [];
    const area = currentAreas.find(a => a.id === areaId);
    
    if (area && imgRef.current) {
      // 클릭한 영역을 현재 크롭으로 로드
      setCurrentCrop({
        unit: 'px',
        x: area.crop.x,
        y: area.crop.y,
        width: area.crop.width,
        height: area.crop.height,
      });
      setCurrentCompletedCrop(area.completedCrop);
      setEditingAreaId(areaId);
    }
  }, [cropAreasByPage, isPdf, currentPage, draggingAreaId]);

  // 크롭 영역 추가/업데이트
  // 실제 crop 영역 추가 로직 (모달에서 호출)
  const applyCropArea = useCallback((applyToAllPages: boolean) => {
    if (!pendingCropData) return;
    
    const { cropPercent, finalCrop } = pendingCropData;
    const pageKey = isPdf ? currentPage : undefined;
    
    setCropAreasByPage(prev => {
      const newMap = new Map(prev);
      
      if (editingAreaId) {
        // 기존 영역 업데이트
        const currentAreas = newMap.get(pageKey) || [];
        const updatedAreas = currentAreas.map(area => 
          area.id === editingAreaId
            ? {
                ...area,
                crop: {
                  unit: 'px',
                  x: finalCrop.x,
                  y: finalCrop.y,
                  width: finalCrop.width,
                  height: finalCrop.height,
                },
                completedCrop: finalCrop,
                cropPercent,
              }
            : area
        );
        newMap.set(pageKey, updatedAreas);
      } else {
        // 새 영역 추가
        const newArea: CropAreaData = {
          id: `crop-${nextCropId}`,
          crop: {
            unit: 'px',
            x: finalCrop.x,
            y: finalCrop.y,
            width: finalCrop.width,
            height: finalCrop.height,
          },
          completedCrop: finalCrop,
          cropPercent,
          pageNumber: pageKey,
        };
        
        if (applyToAllPages && isPdf && totalPages > 1) {
          // 모든 페이지에 동일한 영역 적용
          let newId = nextCropId;
          for (let page = 1; page <= totalPages; page++) {
            const pageAreas = newMap.get(page) || [];
            newMap.set(page, [...pageAreas, {
              ...newArea,
              id: `crop-${newId}-page-${page}`,
              pageNumber: page,
            }]);
          }
          setNextCropId(prev => prev + 1);
        } else {
          // 현재 페이지에만 추가
          const currentAreas = newMap.get(pageKey) || [];
          newMap.set(pageKey, [...currentAreas, newArea]);
          setNextCropId(prev => prev + 1);
        }
      }
      
      return newMap;
    });
    
    setCurrentCrop(undefined);
    setCurrentCompletedCrop(undefined);
    setEditingAreaId(null);
    setPendingCropData(null);
    setShowApplyToAllModal(false);
  }, [pendingCropData, nextCropId, isPdf, currentPage, editingAreaId, totalPages]);

  const addCropArea = useCallback(() => {
    const image = imgRef.current;
    if (!image || !currentCompletedCrop) return;
    
    // 현재 화면에 보이는 이미지의 크기 가져오기 (getBoundingClientRect 사용)
    // 중요: naturalWidth(원본 크기)가 아닌 현재 화면에 보이는 크기를 사용해야 함
    const rect = image.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    
    // 일반 모드에서 전체 페이지 크롭 방지 (크롭 영역이 전체 이미지의 40% 이상이면 차단)
    if (ocrMode === 'standard') {
      const cropAreaRatio = (currentCompletedCrop.width * currentCompletedCrop.height) / (displayedWidth * displayedHeight);
      if (cropAreaRatio > 0.40) {
        setError('일반 모드에서는 전체 페이지를 지정할 수 없습니다. 특정 영역만 선택해주세요. (전체의 40% 이상은 선택할 수 없습니다)');
        return;
      }
    }
    
    // currentCompletedCrop에 저장된 cropRatio 사용 (onCropComplete에서 계산됨, 0.0~1.0 범위)
    // @ts-ignore
    let cropRatio = currentCompletedCrop._cropRatio;
    
    if (!cropRatio) {
      // cropRatio가 없으면 현재 화면 크기 기준으로 계산 (이전 호환성)
      // 픽셀(px) 단위의 crop 정보를 퍼센트(%)로 변환
      cropRatio = {
        x: currentCompletedCrop.x / displayedWidth,
        y: currentCompletedCrop.y / displayedHeight,
        width: currentCompletedCrop.width / displayedWidth,
        height: currentCompletedCrop.height / displayedHeight,
      };
    }
    
    // 비율을 퍼센트로 변환하여 저장 (0.0~1.0 -> 0~100%)
    const cropPercent = {
      x: cropRatio.x * 100,
      y: cropRatio.y * 100,
      width: cropRatio.width * 100,
      height: cropRatio.height * 100,
    };
    
    // 현재 이미지 크기에 맞는 픽셀 좌표 계산 (표시용)
    const finalCrop: PixelCrop = {
      x: cropRatio.x * displayedWidth,
      y: cropRatio.y * displayedHeight,
      width: cropRatio.width * displayedWidth,
      height: cropRatio.height * displayedHeight,
      unit: 'px',
    };
    
    // PDF이고 여러 페이지가 있을 때만 모달 표시
    if (isPdf && totalPages > 1 && !editingAreaId) {
      setPendingCropData({ cropPercent, finalCrop });
      setShowApplyToAllModal(true);
    } else {
      // 이미지이거나 단일 페이지이거나 편집 중이면 바로 적용
      setPendingCropData({ cropPercent, finalCrop });
      applyCropArea(false);
    }
  }, [currentCompletedCrop, isPdf, currentPage, editingAreaId, ocrMode, totalPages, applyCropArea]);

  // 크롭 영역 삭제
  const removeCropArea = useCallback((id: string) => {
    console.log('=== removeCropArea START ===');
    console.log('Target ID to delete:', id);
    console.log('ID type:', typeof id);
    console.log('ID length:', id.length);
    
    // 편집 중인 영역이 삭제되면 편집 상태도 먼저 초기화
    if (editingAreaId === id) {
      console.log('Clearing editing state for:', id);
      setEditingAreaId(null);
      setCurrentCrop(undefined);
      setCurrentCompletedCrop(undefined);
    }
    
    setCropAreasByPage(prev => {
      console.log('=== Inside setCropAreasByPage ===');
      console.log('Previous state size:', prev.size);
      console.log('Previous state entries:', Array.from(prev.entries()).map(([k, v]) => [
        `Page ${k === undefined ? 'undefined' : k}`,
        v.map(a => ({ id: a.id, idType: typeof a.id, idLength: a.id.length }))
      ]));
      
      // 완전히 새로운 Map 생성 (React가 변경을 확실히 감지하도록)
      const newMap = new Map<number | undefined, CropAreaData[]>();
      let deleted = false;
      let deletedFromPage: number | undefined = undefined;
      
      // 모든 페이지에서 해당 ID의 영역 찾아서 삭제
      for (const [pageKey, areas] of prev.entries()) {
        const beforeLength = areas.length;
        console.log(`Checking page ${pageKey === undefined ? 'undefined' : pageKey}: ${beforeLength} areas`);
        
        // ID가 정확히 일치하는 영역만 제외
        const filtered = areas.filter(area => {
          const matches = area.id === id;
          if (matches) {
            console.log(`✓ MATCH FOUND! Removing area: "${area.id}" from page ${pageKey}`);
            console.log(`  Area ID: "${area.id}" (type: ${typeof area.id}, length: ${area.id.length})`);
            console.log(`  Target ID: "${id}" (type: ${typeof id}, length: ${id.length})`);
            console.log(`  IDs are equal: ${area.id === id}`);
            console.log(`  IDs are ===: ${area.id === id}`);
            deleted = true;
            deletedFromPage = pageKey;
          }
          return !matches;
        });
        
        // 필터링된 배열을 새 Map에 추가 (변경이 있든 없든)
        if (filtered.length !== beforeLength) {
          console.log(`✓ Deleted area from page ${pageKey}: ${beforeLength} -> ${filtered.length}`);
        } else if (beforeLength > 0) {
          console.log(`  No match on page ${pageKey}, keeping all ${beforeLength} areas`);
        }
        // 필터링된 배열을 항상 새 Map에 추가 (빈 배열이어도)
        newMap.set(pageKey, filtered);
      }
      
      if (!deleted) {
        console.error(`✗ ERROR: Area with id "${id}" not found in any page!`);
        console.error('Searching for similar IDs...');
        // 디버깅: 현재 모든 영역 ID 출력 및 유사한 ID 찾기
        for (const [pageKey, areas] of prev.entries()) {
          console.log(`Page ${pageKey === undefined ? 'undefined' : pageKey} areas:`, areas.map(a => a.id));
          // 유사한 ID 찾기
          const similarIds = areas.filter(a => a.id.includes(id) || id.includes(a.id));
          if (similarIds.length > 0) {
            console.warn(`  Found similar IDs:`, similarIds.map(a => a.id));
          }
        }
        // 삭제할 영역이 없어도 새 Map 반환 (React가 변경을 감지하도록)
        console.log('Returning new map even though no area was deleted');
        return newMap;
      } else {
        console.log(`✓ Successfully deleted area "${id}" from page ${deletedFromPage}`);
      }
      
      console.log('New state entries:', Array.from(newMap.entries()).map(([k, v]) => [
        `Page ${k === undefined ? 'undefined' : k}`,
        v.map(a => a.id)
      ]));
      console.log('=== Inside setCropAreasByPage END ===');
      return newMap;
    });
    
    // 미리보기 이미지도 삭제
    setCroppedPreviews(prev => {
      const preview = prev.get(id);
      if (preview) {
        URL.revokeObjectURL(preview);
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      }
      return prev;
    });
    
    console.log('=== removeCropArea END ===');
  }, [editingAreaId]);
  
  // 첫 페이지의 모든 크롭 영역 가져오기
  const getFirstPageCropAreas = useCallback(() => {
    if (!isPdf) return [];
    return cropAreasByPage.get(1) || [];
  }, [cropAreasByPage, isPdf]);

  // PDF 페이지 이동 (OCR 진행 중에도 가능)
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    // OCR 진행 중에도 페이지 이동 허용
    
    setCurrentPage(newPage);
    // OCR 진행 중이 아닐 때만 크롭 상태 초기화
    if (!isProcessing) {
      setCurrentCrop(undefined);
      setCurrentCompletedCrop(undefined);
    }
    
    if (pdfCanvases[newPage - 1]) {
      const dataUrl = pdfCanvases[newPage - 1].toDataURL('image/png');
      setImageSrc(dataUrl);
      
      // 새 페이지로 이동 시, 해당 페이지에 크롭 영역이 없으면 첫 페이지의 모든 크롭 영역을 복사
      setTimeout(() => {
        const newPageKey = newPage;
        const newPageAreas = cropAreasByPage.get(newPageKey) || [];
        
        // OCR 진행 중이 아닐 때만 크롭 영역 복원
        if (!isProcessing) {
          // 새 페이지에 크롭 영역이 없고, 첫 페이지에 크롭 영역이 있으면 모든 영역 복사
          if (newPageAreas.length === 0 && newPage > 1) {
            const firstPageAreas = getFirstPageCropAreas();
            if (firstPageAreas.length > 0 && imgRef.current) {
              const imgWidth = imgRef.current.width;
              const imgHeight = imgRef.current.height;
              
              // 첫 페이지의 모든 크롭 영역을 새 페이지에 복사 (페이지 번호만 변경)
              const copiedAreas = firstPageAreas.map(area => {
                if (area.cropPercent) {
                  const newCrop: PixelCrop = {
                    x: (area.cropPercent.x / 100) * imgWidth,
                    y: (area.cropPercent.y / 100) * imgHeight,
                    width: (area.cropPercent.width / 100) * imgWidth,
                    height: (area.cropPercent.height / 100) * imgHeight,
                    unit: 'px',
                  };
                  return {
                    ...area,
                    id: `crop-${nextCropId}-page-${newPage}-${area.id.split('-').slice(-1)[0]}`,
                    crop: {
                      unit: 'px',
                      x: newCrop.x,
                      y: newCrop.y,
                      width: newCrop.width,
                      height: newCrop.height,
                    },
                    completedCrop: newCrop,
                    pageNumber: newPage,
                  };
                }
                return {
                  ...area,
                  id: `crop-${nextCropId}-page-${newPage}-${area.id.split('-').slice(-1)[0]}`,
                  pageNumber: newPage,
                };
              });
              
              // 새 페이지에 복사된 영역 저장
              setCropAreasByPage(prev => {
                const newMap = new Map(prev);
                newMap.set(newPageKey, copiedAreas);
                return newMap;
              });
              
              // 첫 번째 영역을 현재 크롭으로 설정
              if (copiedAreas[0] && copiedAreas[0].cropPercent) {
                const firstArea = copiedAreas[0];
                const restoredCrop: PixelCrop = {
                  x: (firstArea.cropPercent.x / 100) * imgWidth,
                  y: (firstArea.cropPercent.y / 100) * imgHeight,
                  width: (firstArea.cropPercent.width / 100) * imgWidth,
                  height: (firstArea.cropPercent.height / 100) * imgHeight,
                  unit: 'px',
                };
                
                setCurrentCrop({
                  unit: 'px',
                  x: restoredCrop.x,
                  y: restoredCrop.y,
                  width: restoredCrop.width,
                  height: restoredCrop.height,
                });
                setCurrentCompletedCrop(restoredCrop);
              }
            }
          } else if (newPageAreas.length > 0 && imgRef.current) {
            // 새 페이지에 이미 크롭 영역이 있으면 첫 번째 영역을 현재 크롭으로 설정
            const firstArea = newPageAreas[0];
            if (firstArea.cropPercent) {
              const imgWidth = imgRef.current.width;
              const imgHeight = imgRef.current.height;
              const restoredCrop: PixelCrop = {
                x: (firstArea.cropPercent.x / 100) * imgWidth,
                y: (firstArea.cropPercent.y / 100) * imgHeight,
                width: (firstArea.cropPercent.width / 100) * imgWidth,
                height: (firstArea.cropPercent.height / 100) * imgHeight,
                unit: 'px',
              };
              
              setCurrentCrop({
                unit: 'px',
                x: restoredCrop.x,
                y: restoredCrop.y,
                width: restoredCrop.width,
                height: restoredCrop.height,
              });
              setCurrentCompletedCrop(restoredCrop);
            }
          }
        }
      }, 100); // 이미지 로드 후 실행
    }
  }, [totalPages, pdfCanvases, isPdf, cropAreasByPage, getFirstPageCropAreas, nextCropId, isProcessing]);

  // 단일 파일 처리 함수
  const processFile = async (selectedFile: File, fileIndex: number = 0, totalFiles: number = 1) => {
    console.log('processFile 시작:', selectedFile.name, selectedFile.type);

    // 자동 로그인으로 인증 체크 제거

    // 파일 상태를 먼저 설정하여 LandingState로 돌아가지 않도록 함
    setFile(selectedFile);
    setIsUploading(true);
    setUploadProgress(0);

    // 이전 파일 완전히 정리 (파일 상태 설정 후 정리)
    setImageSrc(null);
    setCurrentCrop(undefined);
    setCurrentCompletedCrop(undefined);
    setCropAreasByPage(new Map());
    setNextCropId(1);
    setOcrResult(null);
    setError(null);
    setCurrentPage(1);
    setTotalPages(1);
    setPdfCanvases([]);
    
    // 모든 미리보기 URL 정리
    croppedPreviews.forEach(url => URL.revokeObjectURL(url));
    setCroppedPreviews(new Map());

    const fileType = selectedFile.type;
    const fileName = selectedFile.name.toLowerCase();
    
    console.log('파일 정보:', { fileType, fileName, size: selectedFile.size });

    try {
      // PPT 파일인 경우 PDF로 변환
      if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx') || 
          fileType === 'application/vnd.ms-powerpoint' || 
          fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        // 파일 상태를 먼저 설정하여 LandingState로 돌아가지 않도록 함
        setFile(selectedFile);
        setUploadProgress(10);
        setIsUploading(true);
        
        try {
          // PPT를 PDF로 변환
          const formData = new FormData();
          formData.append('file', selectedFile);
          
          const convertResponse = await fetch(`${BACKEND_URL}/convert/ppt-to-pdf`, {
            method: 'POST',
            body: formData,
          });
          
          if (!convertResponse.ok) {
            const errorData = await convertResponse.json().catch(() => ({ detail: 'PPT 변환 실패' }));
            throw new Error(errorData.detail || 'PPT를 PDF로 변환하는데 실패했습니다.');
          }
          
          setUploadProgress(50);
          
          // 변환된 PDF를 Blob으로 받기
          const pdfBlob = await convertResponse.blob();
          const pdfFile = new File([pdfBlob], `${getFileNameWithoutExtension(selectedFile.name)}.pdf`, { type: 'application/pdf' });
          
          // PDF 파일로 처리
          setIsPdf(true);
          setPdfFile(pdfFile);
          setCurrentPage(1);
          setUploadProgress(60);
          
          // 모든 페이지를 미리 렌더링
          setUploadProgress(70);
          const totalPages = await getPdfPageCount(pdfFile);
          setTotalPages(totalPages);
          
          setUploadProgress(80);
          const canvases = await renderPdfAllPagesToCanvases(pdfFile);
          setPdfCanvases(canvases);
          setUploadProgress(90);
          
          // 첫 페이지 표시
          const dataUrl = canvases[0].toDataURL('image/png');
          setImageSrc(null);
          setTimeout(() => {
            setImageSrc(dataUrl);
            setUploadProgress(100);
            setIsUploading(false);
          }, 50);
          
          // 파일 데이터 저장 (다중 파일 업로드용)
          if (totalFiles > 1) {
            setFilesData(prev => {
              const newMap = new Map(prev);
              newMap.set(fileIndex, {
                isPdf: true,
                pdfFile: pdfFile,
                pdfCanvases: canvases,
                totalPages: totalPages,
                imageSrc: dataUrl,
              });
              return newMap;
            });
          }
        } catch (convertError) {
          // PPT 변환 에러는 별도로 처리 (file 상태는 유지하여 에러 메시지 표시)
          setError(`PPT 변환 중 오류가 발생했습니다: ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
          setIsUploading(false);
          setUploadProgress(0);
          // file은 유지하여 에러 메시지를 볼 수 있도록 함
        }
        
        return;
      }
      
      if (fileType.startsWith('image/')) {
        // 이미지 파일인 경우
        setIsPdf(false);
        setPdfFile(null);
        setUploadProgress(30);
        
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('이미지 파일 읽기 완료');
          const imageDataUrl = e.target?.result as string;
          setUploadProgress(100);
          setImageSrc(imageDataUrl);
          setIsUploading(false);
          console.log('이미지 src 설정 완료, isUploading: false');
          
          // 파일 데이터 저장 (다중 파일 업로드용)
          if (totalFiles > 1) {
            setFilesData(prev => {
              const newMap = new Map(prev);
              newMap.set(fileIndex, {
                isPdf: false,
                pdfFile: null,
                pdfCanvases: [],
                totalPages: 1,
                imageSrc: imageDataUrl,
              });
              return newMap;
            });
          }
        };
        reader.onerror = () => {
          setError('파일 읽기 중 오류가 발생했습니다.');
          setIsUploading(false);
          // file은 유지하여 에러 메시지를 볼 수 있도록 함
        };
        reader.readAsDataURL(selectedFile);
      } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // PDF 파일인 경우
        setIsPdf(true);
        setPdfFile(selectedFile);
        setCurrentPage(1);
        setUploadProgress(20);
        
        // 모든 페이지를 미리 렌더링
        setUploadProgress(40);
        const totalPages = await getPdfPageCount(selectedFile);
        setTotalPages(totalPages);
        
        setUploadProgress(50);
        const canvases = await renderPdfAllPagesToCanvases(selectedFile);
        setPdfCanvases(canvases);
        setUploadProgress(80);
        
        // 첫 페이지 표시
        const dataUrl = canvases[0].toDataURL('image/png');
        console.log('PDF 렌더링 완료, 페이지 수:', totalPages);
        // 이전 이미지 완전히 제거 후 새 이미지 설정
        setImageSrc(null);
        setTimeout(() => {
          setImageSrc(dataUrl);
          setUploadProgress(100);
          setIsUploading(false);
          console.log('PDF 이미지 src 설정 완료, isUploading: false');
        }, 50);
        
        // 파일 데이터 저장 (다중 파일 업로드용)
        if (totalFiles > 1) {
          setFilesData(prev => {
            const newMap = new Map(prev);
            newMap.set(fileIndex, {
              isPdf: true,
              pdfFile: selectedFile,
              pdfCanvases: canvases,
              totalPages: totalPages,
              imageSrc: dataUrl,
            });
            return newMap;
          });
        }
      } else {
        console.warn('지원하지 않는 파일 형식:', fileType, fileName);
        setError('지원하지 않는 파일 형식입니다. 이미지(jpg, png) 또는 PDF 파일을 업로드해주세요.');
        // 파일 상태는 유지하여 에러 메시지를 볼 수 있도록 함
        // setFile(null); // 주석 처리: 에러 메시지를 표시하기 위해 파일 상태 유지
        setIsUploading(false);
      }
    } catch (err) {
      console.error('파일 처리 에러:', err);
      setError(`파일 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // 에러 발생 시에도 파일 상태는 유지하여 에러 메시지를 볼 수 있도록 함
      // setFile(null); // 주석 처리: 에러 메시지를 표시하기 위해 파일 상태 유지
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // 고급 모드에서만 다중 파일 업로드 지원
    if (ocrMode === 'advanced') {
      const fileArray = Array.from(selectedFiles);
      
      // 기존 파일 목록에 추가
      if (files.length > 0) {
        setFiles([...files, ...fileArray]);
        // 새로 추가된 첫 번째 파일 처리
        const newIndex = files.length;
        setCurrentFileIndex(newIndex);
        await processFile(fileArray[0], newIndex, files.length + fileArray.length);
      } else {
        // 첫 파일 업로드
        setFiles(fileArray);
        setCurrentFileIndex(0);
        await processFile(fileArray[0], 0, fileArray.length);
      }
    } else {
      // 일반 모드: 단일 파일만 처리
      // 기존 파일이 있으면 파일 추가 불가 (왼쪽 사이드바의 '파일 추가' 버튼에서만 차단)
      // '홈'에서의 초기 업로드는 허용
      if (file || files.length > 0) {
        // 일반 모드에서는 파일 추가 불가
        return;
      }
      // 첫 파일 업로드 (홈에서)
      const selectedFile = selectedFiles[0];
      // 일반 모드에서는 files 배열에 저장하지 않고 file 상태만 사용
      // files 배열은 비워둠
      setFiles([]);
      await processFile(selectedFile, 0, 1);
    }
    
    // input 값 초기화 (같은 파일을 다시 선택할 수 있도록)
    if (e.target) {
      e.target.value = '';
    }
  };

  // OCR 중지
  const handleStopOCR = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setProcessingProgress('');
    // OCR 실행된 결과 삭제
    setOcrResult(null);
    setOcrResultsData([]);
    setProcessedAreasCount(0);
    setProcessedPagesSet(new Set());
    setCroppedPreviews(new Map());
    setError('OCR 실행이 중지되었습니다.');
  };

  // OCR 실행
  const handleRunOCR = async () => {
    if (!imageSrc) {
      setError('이미지를 선택해주세요.');
      return;
    }

    // AbortController 생성
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // 고급 모드에서 다중 파일이 업로드된 경우
    if (ocrMode === 'advanced' && files.length > 1) {
    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setProcessingProgress('');
      setOcrResultsData([]);

      try {
        const allResults: string[] = [];
        
        // 모든 파일에 대해 OCR 실행
        for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
          // 중지 신호 확인
          if (signal.aborted) {
            throw new Error('OCR 실행이 중지되었습니다.');
          }
          
          const currentFile = files[fileIndex];
          setProcessingProgress(`파일 ${fileIndex + 1}/${files.length} 처리 중: ${currentFile.name}`);
          
          // 각 파일에 대해 전체 페이지 자동수집 실행
          const fileType = currentFile.type;
          const fileName = currentFile.name.toLowerCase();
          let isPdfFile = false;
          let totalPages = 1;
          let pdfCanvases: HTMLCanvasElement[] = [];
          
          // PDF 파일인지 확인
          if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            isPdfFile = true;
            totalPages = await getPdfPageCount(currentFile);
            pdfCanvases = await renderPdfAllPagesToCanvases(currentFile);
          }
          
          const pagesToProcess = isPdfFile ? totalPages : 1;
          
          for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
            // 중지 신호 확인
            if (signal.aborted) {
              throw new Error('OCR 실행이 중지되었습니다.');
            }
            
            setProcessingProgress(`파일 ${fileIndex + 1}/${files.length} - 페이지 ${pageNum}/${pagesToProcess} 처리 중...`);
            
            let imageBlob: Blob;
            
            if (isPdfFile && pdfCanvases.length > 0) {
              const canvas = pdfCanvases[pageNum - 1];
              if (!canvas) continue;
              
              imageBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error('Failed to convert canvas to blob'));
                }, 'image/png');
              });
            } else {
              // 이미지 파일 처리
              const img = new Image();
              const imgUrl = URL.createObjectURL(currentFile);
              imageBlob = await new Promise<Blob>((resolve, reject) => {
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.naturalWidth;
                  canvas.height = img.naturalHeight;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) {
                    URL.revokeObjectURL(imgUrl);
                    reject(new Error('Failed to get canvas context'));
                    return;
                  }
                  ctx.drawImage(img, 0, 0);
                  canvas.toBlob((blob) => {
                    URL.revokeObjectURL(imgUrl);
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to convert canvas to blob'));
                  }, 'image/png');
                };
                img.onerror = () => {
                  URL.revokeObjectURL(imgUrl);
                  reject(new Error('Failed to load image'));
                };
                img.src = imgUrl;
              });
            }
            
            const formData = new FormData();
            formData.append('file', imageBlob, isPdfFile ? `page_${pageNum}.png` : 'image.png');
            formData.append('filename', currentFile.name);
            formData.append('page_number', String(isPdfFile ? pageNum : 0));
            
            // 고급 모드 프롬프트 생성
            const promptToUse = extractKeys.length > 0
              ? generatePrompt()
              : (customPrompt && customPrompt.trim() ? customPrompt.trim() : generatePrompt());
            
            if (promptToUse) {
              formData.append('custom_prompt', promptToUse);
            }
            
            // 중지 신호 확인
            if (signal.aborted) {
              throw new Error('OCR 실행이 중지되었습니다.');
            }

            const response = await fetch(`${BACKEND_URL}/ocr`, {
              method: 'POST',
              body: formData,
              signal: signal,
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
              throw new Error(`파일 ${fileIndex + 1}, 페이지 ${pageNum} 처리 실패: ${errorData.detail || 'Unknown error'}`);
            }
            
            const data = await response.json();
            if (data.extracted_text && data.extracted_text.trim()) {
              const resultText = isPdfFile
                ? `[파일 ${fileIndex + 1}: ${currentFile.name} - 페이지 ${pageNum}]\n${data.extracted_text}`
                : `[파일 ${fileIndex + 1}: ${currentFile.name}]\n${data.extracted_text}`;
              allResults.push(resultText);
              
              // OCR 결과 데이터 임시 저장
              setOcrResultsData(prev => [...prev, {
                extracted_text: data.extracted_text,
                cropped_image: data.cropped_image,
                filename: currentFile.name,
                page_number: isPdfFile ? pageNum : null,
              }]);
              
              // 즉시 결과 업데이트
              setOcrResult(allResults.join('\n\n---\n\n'));
            }
          }
        }
        
        setProcessingProgress(`완료: ${files.length}개 파일 처리됨`);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // 중지된 경우 결과는 이미 handleStopOCR에서 삭제됨
          setError('OCR 실행이 중지되었습니다.');
        } else {
          setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.');
        }
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
        setTimeout(() => setProcessingProgress(''), 2000);
      }
      return;
    }

    // 단일 파일 처리 (기존 로직)
    // 고급 모드에서 페이지 전체 자동수집이 체크되어 있으면 영역 지정 없이도 실행 가능
    const allCropAreas: CropAreaData[] = [];
    if (!autoCollectFullPage || ocrMode === 'standard') {
      // 일반 모드이거나 자동수집이 체크되지 않은 경우: 기존 로직
      for (const areas of cropAreasByPage.values()) {
        allCropAreas.push(...areas);
      }

      if (allCropAreas.length === 0) {
        setError('최소 하나의 크롭 영역을 추가해주세요.');
        return;
      }
    } else {
      // 고급 모드에서 페이지 전체 자동수집이 체크된 경우: 전체 페이지를 하나의 영역으로 처리
      // 실제로는 전체 페이지를 처리하므로 빈 배열로 두고, 아래에서 전체 페이지 처리 로직 실행
    }

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setProcessingProgress('');
    setOcrResultsData([]); // 새로운 OCR 실행 시 이전 결과 데이터 초기화

    try {
      // 중지 신호 확인
      if (signal.aborted) {
        throw new Error('OCR 실행이 중지되었습니다.');
      }
      const allResults: string[] = [];
      const newPreviews = new Map<string, string>();
      const processedPages = new Set<number>(); // 실제 처리된 페이지 번호 추적

      // 고급 모드에서 페이지 전체 자동수집이 체크된 경우: 전체 페이지 처리
      if (ocrMode === 'advanced' && autoCollectFullPage) {
        const pagesToProcess = isPdf ? totalPages : 1;
        
        for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
          // 중지 신호 확인
          if (signal.aborted) {
            throw new Error('OCR 실행이 중지되었습니다.');
          }
          
          setProcessingProgress(`페이지 전체 자동수집 중... (${pageNum}/${pagesToProcess})`);
          
          let imageBlob: Blob;
          let filename: string;

      if (isPdf && pdfFile) {
            // PDF 페이지 처리
            const canvas = pdfCanvases[pageNum - 1];
            if (!canvas) continue;
            
            // 전체 페이지를 Blob으로 변환
            imageBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
              }, 'image/png');
            });
            filename = pdfFile.name || 'unknown.pdf';
          } else {
            // 이미지 파일 처리
            if (!imgRef.current) continue;
            
            // 전체 이미지를 Blob으로 변환
            const canvas = document.createElement('canvas');
            canvas.width = imgRef.current.naturalWidth;
            canvas.height = imgRef.current.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;
            
            ctx.drawImage(imgRef.current, 0, 0);
            imageBlob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
              }, 'image/png');
            });
            filename = file?.name || 'unknown.png';
          }
          
          const formData = new FormData();
          formData.append('file', imageBlob, isPdf ? `page_${pageNum}.png` : 'image.png');
          formData.append('filename', filename);
          formData.append('page_number', String(isPdf ? pageNum : 0));
          
          // 고급 모드 프롬프트 생성
          const promptToUse = extractKeys.length > 0
            ? generatePrompt()
            : (customPrompt && customPrompt.trim() ? customPrompt.trim() : generatePrompt());
          
          if (promptToUse) {
            formData.append('custom_prompt', promptToUse);
          }
          
          const response = await fetch(`${BACKEND_URL}/ocr`, {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`페이지 ${pageNum} 처리 실패: ${errorData.detail || 'Unknown error'}`);
          }
          
          const data = await response.json();
          if (data.extracted_text && data.extracted_text.trim()) {
            const resultText = isPdf 
              ? `[페이지 ${pageNum} - 전체 자동수집]\n${data.extracted_text}`
              : `[전체 자동수집]\n${data.extracted_text}`;
            allResults.push(resultText);
            processedPages.add(isPdf ? pageNum : 1);
            
            // OCR 결과 데이터 임시 저장 (저장 버튼을 위해)
            setOcrResultsData(prev => [...prev, {
              extracted_text: data.extracted_text,
              cropped_image: data.cropped_image,
              filename: data.filename || filename,
              page_number: isPdf ? pageNum : null,
            }]);
            
            // 즉시 결과 업데이트
            setOcrResult(allResults.join('\n\n---\n\n'));
            setProcessedAreasCount(allResults.length);
            setProcessedPagesSet(new Set(processedPages));
          }
        }
      } else {
        // 각 크롭 영역에 대해 OCR 실행
        for (let areaIndex = 0; areaIndex < allCropAreas.length; areaIndex++) {
          // 중지 신호 확인
          if (signal.aborted) {
            throw new Error('OCR 실행이 중지되었습니다.');
          }
          
          const area = allCropAreas[areaIndex];
          
          // 크롭 영역의 퍼센트 값을 사용하여 실제 픽셀 좌표 계산
          let cropArea: CropArea;
          
          if (isPdf && pdfFile && area.pageNumber !== undefined) {
            // PDF의 특정 페이지 처리 (해당 페이지의 크롭 영역 사용)
            setProcessingProgress(`영역 ${areaIndex + 1}/${allCropAreas.length} - 페이지 ${area.pageNumber} 처리 중...`);
            
            // PDF Canvas는 이미 렌더링되어 있으므로 재렌더링 불필요
            const canvas = pdfCanvases[area.pageNumber - 1];
            
            if (!canvas) {
              continue;
            }

            // 크롭 영역의 퍼센트 값을 사용하여 Canvas 크기에 맞게 변환
            if (area.cropPercent) {
              const naturalWidth = canvas.width;
              const naturalHeight = canvas.height;
              
              cropArea = {
                x: (area.cropPercent.x / 100) * naturalWidth,
                y: (area.cropPercent.y / 100) * naturalHeight,
                width: (area.cropPercent.width / 100) * naturalWidth,
                height: (area.cropPercent.height / 100) * naturalHeight,
              };
            } else {
              // cropPercent가 없으면 completedCrop 사용 (이전 호환성)
              cropArea = {
                x: area.completedCrop.x,
                y: area.completedCrop.y,
                width: area.completedCrop.width,
                height: area.completedCrop.height,
              };
            }

            const blob = await cropImageToBlob(canvas, cropArea);

            // 크롭된 이미지 미리보기 생성
            const previewUrl = URL.createObjectURL(blob);
            newPreviews.set(area.id, previewUrl);

          const formData = new FormData();
            formData.append('file', blob, `cropped_page_${area.pageNumber}.png`);
            formData.append('filename', pdfFile?.name || 'unknown.pdf');
            formData.append('page_number', String(area.pageNumber));
            // 모드에 따라 프롬프트 생성
            const promptToUse = ocrMode === 'advanced' && extractKeys.length > 0
              ? generatePrompt()
              : (customPrompt && customPrompt.trim() ? customPrompt.trim() : generatePrompt());
            
            if (promptToUse) {
              formData.append('custom_prompt', promptToUse);
            }

          const response = await fetch(`${BACKEND_URL}/ocr`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
              throw new Error(`영역 ${areaIndex + 1}, 페이지 ${area.pageNumber} 처리 실패: ${errorData.detail || 'Unknown error'}`);
          }

          const data = await response.json();
          if (data.extracted_text && data.extracted_text.trim()) {
              const resultText = `[페이지 ${area.pageNumber} - 영역 ${areaIndex + 1}]\n${data.extracted_text}`;
              allResults.push(resultText);
              processedPages.add(area.pageNumber); // 실제 처리된 페이지 번호 추가
              
              // OCR 결과 데이터 임시 저장 (저장 버튼을 위해)
              setOcrResultsData(prev => [...prev, {
                extracted_text: data.extracted_text,
                cropped_image: data.cropped_image,
                filename: data.filename || pdfFile?.name || 'unknown.pdf',
                page_number: area.pageNumber,
              }]);
              
              // 즉시 결과 업데이트 - 페이지별로 바로바로 표시
              setOcrResult(allResults.join('\n\n---\n\n'));
              setCroppedPreviews(new Map(newPreviews));
              setProcessedAreasCount(allResults.length);
              setProcessedPagesSet(new Set(processedPages));
            }
          } else {
            // 이미지 파일 처리
            if (!imgRef.current) {
              continue;
            }
            
            setProcessingProgress(`영역 ${areaIndex + 1}/${allCropAreas.length} 처리 중...`);
            
            // 원본 이미지 크기 (naturalWidth/naturalHeight) - 백엔드 전송 시 사용
            const naturalWidth = imgRef.current.naturalWidth;
            const naturalHeight = imgRef.current.naturalHeight;
            
            // 현재 화면에 보이는 이미지 크기 (clientWidth/clientHeight)
            const displayedWidth = imgRef.current.clientWidth || imgRef.current.getBoundingClientRect().width;
            const displayedHeight = imgRef.current.clientHeight || imgRef.current.getBoundingClientRect().height;
            
            // 크롭 영역의 비율을 사용하여 원본 이미지 크기 기준 픽셀 좌표 계산
            if (area.cropPercent) {
              // cropPercent (0~100%)를 비율(0.0~1.0)로 변환
              const ratioX = area.cropPercent.x / 100;
              const ratioY = area.cropPercent.y / 100;
              const ratioWidth = area.cropPercent.width / 100;
              const ratioHeight = area.cropPercent.height / 100;
              
              // 비율 * 원본 크기 = 실제 원본 이미지 좌표 (제미나이 제안 반영)
              cropArea = {
                x: ratioX * naturalWidth,
                y: ratioY * naturalHeight,
                width: ratioWidth * naturalWidth,
                height: ratioHeight * naturalHeight,
              };
      } else {
              // cropPercent가 없으면 completedCrop 사용 (이전 호환성)
              // completedCrop은 표시 크기 기준이므로 원본 크기로 변환 필요
              const scaleX = naturalWidth / displayedWidth;
              const scaleY = naturalHeight / displayedHeight;
              
              cropArea = {
                x: area.completedCrop.x * scaleX,
                y: area.completedCrop.y * scaleY,
                width: area.completedCrop.width * scaleX,
                height: area.completedCrop.height * scaleY,
              };
            }
            
            const blob = await cropImageToBlob(imgRef.current, cropArea, { width: displayedWidth, height: displayedHeight });

        // 크롭된 이미지 미리보기 생성
        const previewUrl = URL.createObjectURL(blob);
            newPreviews.set(area.id, previewUrl);

        const formData = new FormData();
        formData.append('file', blob, 'cropped.png');
            formData.append('filename', file?.name || 'unknown');
            formData.append('page_number', String(0)); // 이미지 파일의 경우 page_number를 0으로 명시적으로 전송
            // 모드에 따라 프롬프트 생성
            const promptToUseImage = ocrMode === 'advanced' && extractKeys.length > 0
              ? generatePrompt()
              : (customPrompt && customPrompt.trim() ? customPrompt.trim() : generatePrompt());
            
            if (promptToUseImage) {
              formData.append('custom_prompt', promptToUseImage);
            }

        const response = await fetch(`${BACKEND_URL}/ocr`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
              throw new Error(`영역 ${areaIndex + 1} 처리 실패: ${errorData.detail || 'OCR 처리에 실패했습니다.'}`);
        }

        const data = await response.json();
            if (data.extracted_text && data.extracted_text.trim()) {
              const resultText = `[영역 ${areaIndex + 1}]\n${data.extracted_text}`;
              allResults.push(resultText);
              // 이미지 파일인 경우 페이지 1로 간주
              processedPages.add(1);
              
              // OCR 결과 데이터 임시 저장 (저장 버튼을 위해)
              setOcrResultsData(prev => [...prev, {
                extracted_text: data.extracted_text,
                cropped_image: data.cropped_image,
                filename: data.filename || file?.name || 'unknown',
                page_number: null, // 이미지 파일은 page_number가 null
              }]);
              
              // 즉시 결과 업데이트 - 영역별로 바로바로 표시
              setOcrResult(allResults.join('\n\n---\n\n'));
              setCroppedPreviews(new Map(newPreviews));
              setProcessedAreasCount(allResults.length);
              setProcessedPagesSet(new Set(processedPages));
            }
          }
        }
      }

      // 최종 결과 업데이트 (모든 영역 처리 완료 후)
      setCroppedPreviews(newPreviews);
      setProcessedAreasCount(allResults.length); // 실제 처리된 영역 수 저장
      setProcessedPagesSet(processedPages); // 실제 처리된 페이지 Set 저장
      setProcessingProgress(`완료: ${allResults.length}개 영역 처리됨`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // 중지된 경우 결과는 이미 handleStopOCR에서 삭제됨
        setError('OCR 실행이 중지되었습니다.');
      } else {
      setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.');
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
      setTimeout(() => setProcessingProgress(''), 2000);
    }
  };

  // 파일 초기화
  const handleReset = () => {
    // 이전 파일 완전히 정리
    setFile(null);
    setImageSrc(null);
    setCurrentCrop(undefined);
    setCurrentCompletedCrop(undefined);
    setCropAreasByPage(new Map());
    setNextCropId(1);
    setOcrResult(null);
    setError(null);
    setIsPdf(false);
    setPdfFile(null);
    setProcessingProgress('');
    setProcessedAreasCount(0);
    setProcessedPagesSet(new Set());
    setCurrentPage(1);
    setTotalPages(1);
    setPdfCanvases([]);
    setUploadProgress(0);
    setIsUploading(false);
    // 프롬프트는 초기화하지 않음 (사용자가 계속 사용할 수 있도록)
    
    // 모든 미리보기 URL 정리
    croppedPreviews.forEach(url => URL.revokeObjectURL(url));
    setCroppedPreviews(new Map());
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // localStorage에서도 OCR 결과 제거
    if (typeof window !== 'undefined') {
      localStorage.removeItem(OCR_RESULT_STORAGE_KEY);
    }
  };

  // Landing State: 파일이 없을 때만 표시
  // file이 있으면 무조건 WorkspaceState 표시 (업로드 중이거나 이미지가 로드되지 않아도)
  if (!file && (ocrMode !== 'advanced' || files.length === 0)) {
  return (
      <>
        <LandingState onFileSelect={handleFileSelect} fileInputRef={fileInputRef} ocrMode={ocrMode} />
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            // 로그인 성공 후 파일 업로드 재시도는 사용자가 다시 선택하도록
            setShowLoginModal(false);
          }}
        />
        {/* 모든 페이지에 적용 확인 모달 */}
        {showApplyToAllModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                모든 페이지에 동일하게 적용하시겠습니까?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                현재 선택한 영역을 모든 페이지({totalPages}페이지)에 동일하게 적용합니다.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowApplyToAllModal(false);
                    setPendingCropData(null);
                    setCurrentCrop(undefined);
                    setCurrentCompletedCrop(undefined);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  아니오
                </button>
                <button
                  onClick={() => applyCropArea(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  현재 페이지만
                </button>
                <button
                  onClick={() => applyCropArea(true)}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  예, 모두 적용
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Workspace State: 파일이 있을 때 (3-Column IDE Layout)
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">
          {file?.name || 'Workspace'}
        </h1>
                <button
                  onClick={handleReset}
          className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                >
          <X className="w-4 h-4 mr-2" />
          {t('common.reset')}
                </button>
              </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: 업로드된 파일 목록 (항상 표시) */}
        {(file || files.length > 0) ? (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            {/* 업로드된 파일 섹션 */}
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                업로드된 파일
              </h2>
              {/* 파일 추가 버튼 (고급 모드에서만 표시) */}
              {ocrMode === 'advanced' && (
                <>
            <input
              ref={fileInputRef}
              type="file"
                    accept="image/*,.pdf,.ppt,.pptx"
              onChange={handleFileSelect}
              className="hidden"
                    id="multi-file-upload-left"
                    multiple
            />
            <label
                    htmlFor="multi-file-upload-left"
                    className="inline-flex items-center justify-center w-full px-3 py-2 border border-blue-300 rounded-md text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 cursor-pointer transition-colors mb-3"
            >
                    <FolderOpen className="w-3 h-3 mr-2" />
                    파일 추가
            </label>
                </>
              )}
              <div className="space-y-1">
                {/* 단일 파일 모드 */}
                {file && files.length === 0 && (
                  <div className="p-2 bg-blue-50 border border-blue-300 rounded-md">
                    <div className="text-xs font-medium truncate text-gray-900 text-blue-700">
                      {file.name}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">현재 파일</div>
                  </div>
                )}
                {/* 다중 파일 모드 */}
                {files.map((f, idx) => {
                  const isActive = idx === currentFileIndex;
                  return (
                <button
                      key={idx}
                      onClick={async () => {
                        // 파일 상태를 먼저 설정하여 LandingState로 돌아가지 않도록 함
                        setFile(f);
                        setCurrentFileIndex(idx);
                        
                        const fileData = filesData.get(idx);
                        if (fileData) {
                          // 저장된 파일 데이터로 복원
                          setIsPdf(fileData.isPdf);
                          setPdfFile(fileData.pdfFile);
                          setPdfCanvases(fileData.pdfCanvases);
                          setTotalPages(fileData.totalPages);
                          setCurrentPage(1);
                          
                          if (fileData.isPdf && fileData.pdfCanvases.length > 0) {
                            const dataUrl = fileData.pdfCanvases[0].toDataURL('image/png');
                            setImageSrc(dataUrl);
                          } else if (fileData.imageSrc) {
                            setImageSrc(fileData.imageSrc);
                          }
                        } else {
                          // 파일 데이터가 없으면 처리
                          await processFile(f, idx, files.length);
                        }
                      }}
                      className={`w-full p-2 text-left rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-50 border border-blue-300'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`text-xs font-medium truncate text-gray-900 ${
                        isActive ? 'text-blue-700' : ''
                      }`}>
                        {f.name}
              </div>
                      {isActive && (
                        <div className="text-xs text-blue-600 mt-1">현재 파일</div>
            )}
                    </button>
                  );
                })}
          </div>
            </div>
          </div>
        ) : null}

        {/* Center Canvas: Main Viewer - 2개로 분할 */}
        <div className="flex-1 flex bg-gray-50 overflow-hidden">
          {/* 왼쪽: 페이지 이미지 영역 (2배 확대) */}
          <div className="flex-[2] flex flex-col bg-gray-50 overflow-hidden border-r border-gray-200">
            {/* Upload Progress */}
          {isUploading && (
              <div className="px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-700">{t('upload.processing')}</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                  />
              </div>
            </div>
          )}

            {/* Error Message - 상단 고정 */}
            {error && (
              <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
                <p className="text-sm text-red-800">{error}</p>
        </div>
              )}
            
            {/* Scrollable Canvas Area - 이미지가 한 화면에 다 보이도록 */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto min-h-0">
              {imageSrc ? (
              <div className="relative w-fit h-fit mx-auto">
                <ReactCrop
                  crop={currentCrop}
                  onChange={(_, percentCrop) => {
                    setCurrentCrop(percentCrop);
                    // 크롭이 변경되면 에러 메시지 초기화
                    setError(null);
                  }}
                  onComplete={onCropComplete}
                  aspect={undefined}
                  minWidth={50}
                  minHeight={50}
                >
                  <img
                    key={file?.name || imageSrc}
                    ref={imgRef}
                    src={imageSrc}
                    alt="Uploaded"
                    className="rounded-lg shadow-lg block max-w-full"
                    width={isPdf && pdfCanvases[currentPage - 1] ? pdfCanvases[currentPage - 1].width : undefined}
                    height={isPdf && pdfCanvases[currentPage - 1] ? pdfCanvases[currentPage - 1].height : undefined}
                    style={{ 
                      display: 'block',
                      ...(isPdf ? {
                        // PDF의 경우 원본 크기 그대로 사용 (확대/축소 없음)
                        width: pdfCanvases[currentPage - 1]?.width,
                        height: pdfCanvases[currentPage - 1]?.height,
                      } : {
                        // 이미지의 경우 자동 크기
                        width: 'auto',
                        height: 'auto',
                      }),
                      maxWidth: '100%',
                      maxHeight: '100%'
                    }}
                    onLoad={(e) => {
                      // 이미지 로드 후 실제 렌더링 크기 확인
                      const img = e.currentTarget;
                      const rect = img.getBoundingClientRect();
                      console.log('Image loaded - DOM size:', img.width, 'x', img.height);
                      console.log('Image loaded - getBoundingClientRect:', rect.width, 'x', rect.height);
                      console.log('Image loaded - natural size:', img.naturalWidth, 'x', img.naturalHeight);
                      onImageLoad(e);
                    }}
                  />
                </ReactCrop>
                {/* 저장된 크롭 영역들을 오버레이로 표시 - 다중 크롭 지원 */}
                {/* 이 div들은 위쪽의 relative 부모를 기준으로 좌표를 잡습니다 */}
                {imgRef.current && (() => {
                  const pageKey = isPdf ? currentPage : undefined;
                  const areas = cropAreasByPage.get(pageKey) || [];
                  console.log('Rendering crop areas for page', pageKey, ':', areas.map(a => a.id));
                  return areas.map((area, index) => {
                  const isEditing = editingAreaId === area.id;
                  
                  // 핵심: 저장된 cropPercent 값을 그대로 CSS % 단위로 사용 (픽셀 계산 없이)
                  // CSS는 %를 지원하므로 계산 불필요 - 화면 크기가 변해도 자동으로 맞춰짐
                  let leftPercent: number;
                  let topPercent: number;
                  let widthPercent: number;
                  let heightPercent: number;
                  
                  if (area.cropPercent) {
                    // cropPercent (0~100%)를 그대로 CSS %로 사용
                    leftPercent = area.cropPercent.x;
                    topPercent = area.cropPercent.y;
                    widthPercent = area.cropPercent.width;
                    heightPercent = area.cropPercent.height;
                  } else {
                    // cropPercent가 없으면 completedCrop 사용 (이전 호환성)
                    // 현재 화면에 보이는 크기 기준으로 % 계산 (getBoundingClientRect 사용)
                    const rect = imgRef.current!.getBoundingClientRect();
                    const displayedWidth = rect.width;
                    const displayedHeight = rect.height;
                    leftPercent = (area.completedCrop.x / displayedWidth) * 100;
                    topPercent = (area.completedCrop.y / displayedHeight) * 100;
                    widthPercent = (area.completedCrop.width / displayedWidth) * 100;
                    heightPercent = (area.completedCrop.height / displayedHeight) * 100;
                  }
                  
                  return (
                    <div
                      key={area.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleCropAreaMouseDown(e, area.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 드래그가 아닌 경우에만 편집 모드로 전환
                        if (!hasDragged && !draggingAreaId) {
                          handleCropAreaClick(area.id);
                        }
                      }}
                      className={`absolute border-2 bg-opacity-20 cursor-move transition-all select-none ${
                        isEditing 
                          ? 'border-yellow-500 bg-yellow-500 z-10' 
                          : draggingAreaId === area.id
                          ? 'border-purple-500 bg-purple-500 z-10'
                          : 'border-blue-500 bg-blue-500 hover:border-blue-600 hover:bg-blue-600'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                        userSelect: 'none',
                      }}
                      title={isEditing 
                        ? `${t('crop.update')} - ${t('workspace.centerCanvas.selectArea')}` 
                        : draggingAreaId === area.id 
                        ? `${t('crop.selectedAreas')} ${index + 1} - 드래그하여 이동 중...` 
                        : `${t('crop.selectedAreas')} ${index + 1} - 드래그하여 이동 또는 클릭하여 편집`}
                    >
                      {/* 영역 번호 표시 */}
                      <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-0.5 rounded shadow-md whitespace-nowrap">
                        {t('ocr.region')} {index + 1}
                      </div>
                      {/* 삭제 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('Delete button clicked for area:', area.id);
                          removeCropArea(area.id);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 pointer-events-auto shadow-md z-20 transition-transform hover:scale-110"
                        title={t('crop.delete')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                });
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {isUploading ? t('upload.processing') : t('errors.noImage')}
                </div>
              )}
            </div>

            {/* Page Navigation (for PDF) */}
              {isPdf && totalPages > 1 && (
              <div className="px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-center space-x-4 flex-shrink-0">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isProcessing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  {t('workspace.pageNavigation.previous')}
                  </button>
                  <span className="text-sm text-gray-700">
                  {t('workspace.pageNavigation.current')} {currentPage} {t('workspace.pageNavigation.of')} {totalPages}
                  {isProcessing && (
                    <span className="ml-2 text-xs text-blue-600">
                      {t('workspace.pageNavigation.ocrInProgress')}
                    </span>
                  )}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isProcessing}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                  {t('workspace.pageNavigation.next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          {/* 오른쪽: 선택 영역 관리 섹션 (너비 축소) */}
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('crop.selectedAreas')}
              </h3>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {/* Crop Area Add/Update Controls */}
              {(currentCompletedCrop || currentCrop) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="space-y-2">
                    {currentCompletedCrop ? (
                      <>
                        <p className="text-xs font-semibold text-blue-900">
                          {editingAreaId ? t('crop.updateQuestion') : t('crop.addQuestion')}
                        </p>
                        <p className="text-xs text-blue-700">
                          {t('crop.areaSize')}: {Math.round(currentCompletedCrop.width)} × {Math.round(currentCompletedCrop.height)}px
                        </p>
                        <div className="flex gap-2 mt-2">
                          {editingAreaId && (
                            <button
                              onClick={() => {
                                setEditingAreaId(null);
                                setCurrentCrop(undefined);
                                setCurrentCompletedCrop(undefined);
                              }}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <X className="w-3 h-3 mr-1" />
                              {t('common.cancel')}
                            </button>
                          )}
                          <button
                            onClick={addCropArea}
                            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border rounded-md shadow-sm text-xs font-medium text-white transition-colors ${
                              editingAreaId
                                ? 'border-yellow-500 bg-yellow-600 hover:bg-yellow-700'
                                : 'border-green-500 bg-green-600 hover:bg-green-700'
                            }`}
                          >
                            {editingAreaId ? (
                              <>
                                <Save className="w-3 h-3 mr-1" />
                                {t('crop.update')}
                  </>
                ) : (
                              <>
                                <Plus className="w-3 h-3 mr-1" />
                                {t('crop.add')}
                              </>
                )}
              </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-blue-700">
                        {t('workspace.centerCanvas.selectArea')}
                      </p>
                    )}
            </div>
          </div>
        )}

              {/* Selected Areas List */}
              {(() => {
                const currentAreas = getCurrentPageCropAreas();
                const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                return (
                  <div className="space-y-2">
                    {currentAreas.length > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          {isPdf ? `${t('crop.currentPageAreas')} ${currentPage}: ${currentAreas.length}${t('crop.areas')}` : `${currentAreas.length}${t('crop.areas')}`}
                        </span>
                        {isPdf && allAreasCount > currentAreas.length && (
                          <span className="text-xs text-gray-500">
                            ({t('crop.totalAreas')}: {allAreasCount})
                          </span>
                        )}
                        {currentAreas.length > 0 && (
                          <button
                            onClick={() => {
                              setCropAreasByPage(new Map());
                              setNextCropId(1);
                              setCurrentCrop(undefined);
                              setCurrentCompletedCrop(undefined);
                              setEditingAreaId(null);
                              croppedPreviews.forEach(url => URL.revokeObjectURL(url));
                              setCroppedPreviews(new Map());
                            }}
                            className="inline-flex items-center px-2 py-1 border border-red-300 rounded text-xs font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                            title={t('crop.deleteAll')}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            {t('crop.deleteAll')}
                          </button>
                        )}
          </div>
        )}
                    <div className="space-y-1.5">
                      {currentAreas.map((area, index) => (
                        <div
                          key={area.id}
                          className={`flex items-center justify-between p-2 rounded-md text-xs ${
                            editingAreaId === area.id
                              ? 'bg-yellow-50 border border-yellow-300'
                              : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span className="font-medium text-gray-700">
                            {t('ocr.region')} {index + 1}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCropAreaClick(area.id)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title={t('crop.edit')}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeCropArea(area.id)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title={t('crop.delete')}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {currentAreas.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">
                          {t('crop.noAreas')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              {/* 페이지별 썸네일 (영역선택 영역 하단) */}
              {(() => {
                // 현재 파일의 썸네일 데이터 가져오기
                let thumbnails: Array<{ pageNum: number; src: string }> = [];
                
                if (files.length > 0) {
                  // 다중 파일 업로드 모드: 현재 선택된 파일의 썸네일
                  const currentFileData = filesData.get(currentFileIndex);
                  if (currentFileData) {
                    if (currentFileData.isPdf && currentFileData.pdfCanvases.length > 0) {
                      thumbnails = currentFileData.pdfCanvases.map((canvas, index) => ({
                        pageNum: index + 1,
                        src: canvas.toDataURL('image/png'),
                      }));
                    } else if (currentFileData.imageSrc) {
                      thumbnails = [{ pageNum: 1, src: currentFileData.imageSrc }];
                    }
                  }
                } else if (isPdf && pdfCanvases.length > 0) {
                  // 단일 PDF 파일 모드
                  thumbnails = pdfCanvases.map((canvas, index) => ({
                    pageNum: index + 1,
                    src: canvas.toDataURL('image/png'),
                  }));
                } else if (imageSrc) {
                  // 단일 이미지 파일 모드
                  thumbnails = [{ pageNum: 1, src: imageSrc }];
                }
                
                if (thumbnails.length === 0) return null;
                
                return (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="mb-2">
                      <h4 className="text-xs font-semibold text-gray-700">페이지 미리보기</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[calc(4*140px+3*0.5rem+1rem)] overflow-y-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {thumbnails.map((thumbnail) => {
                        const isActive = isPdf ? currentPage === thumbnail.pageNum : thumbnail.pageNum === 1;
                        // 해당 페이지에 크롭 영역이 있는지 확인
                        const pageKey = isPdf ? thumbnail.pageNum : undefined;
                        const hasAreas = (cropAreasByPage.get(pageKey) || []).length > 0;
                        return (
                          <button
                            key={thumbnail.pageNum}
                            onClick={() => {
                              if (isPdf) {
                                handlePageChange(thumbnail.pageNum);
                              }
                            }}
                            disabled={isProcessing}
                            className={`w-full p-1.5 border-2 rounded-md transition-colors flex flex-col relative ${
                              isActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="text-xs font-medium text-gray-700 mb-1 flex items-center justify-between px-1">
                              <span>{thumbnail.pageNum}</span>
                              {hasAreas && (() => {
                                const areaCount = (cropAreasByPage.get(pageKey) || []).length;
                                return (
                                  <span 
                                    className="text-blue-600 font-semibold" 
                                    title={`${areaCount}개의 영역이 추가된 페이지`}
                                  >
                                    {getCircledNumber(areaCount)}
                                  </span>
                                );
                              })()}
                            </div>
                            <div className="flex-1 flex items-center justify-center min-h-[120px]">
                              <img
                                src={thumbnail.src}
                                alt={`Page ${thumbnail.pageNum} thumbnail`}
                                className="w-full h-auto max-h-[120px] object-contain rounded border border-gray-200"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right Inspector: Mode Selection & Prompt */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Step 1: Mode Selection (Segmented Control) */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOcrMode('standard')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  ocrMode === 'standard'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t('workspace.rightInspector.mode.standard')}
              </button>
              <button
                onClick={() => setOcrMode('advanced')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                  ocrMode === 'advanced'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {t('workspace.rightInspector.mode.advanced')}
                {ocrMode !== 'advanced' && (
                  <span className="ml-1 text-xs">💎</span>
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Mode-based Prompt UI */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {ocrMode === 'standard' ? (
              /* Standard Mode: Language Selection */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('workspace.rightInspector.mode.language')}
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as 'ko' | 'en')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('workspace.rightInspector.mode.standardDescription')}
                  </p>
                </div>
              </div>
            ) : (
              /* Advanced Mode: Key Extraction Tags & Presets */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('workspace.rightInspector.mode.extractKeys')}
                  </label>
                  <div className="mb-3">
                    {/* Tag Input */}
                    <div className="flex flex-wrap gap-2 p-2 min-h-[40px] border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                      {extractKeys.map((key) => (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium"
                        >
                          {key}
                          <button
                            onClick={() => removeKeyTag(key)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={keyInputValue}
                        onChange={(e) => setKeyInputValue(e.target.value)}
                        onKeyDown={handleKeyInputKeyDown}
                        onCompositionStart={handleCompositionStart}
                        onCompositionEnd={handleCompositionEnd}
                        placeholder={t('workspace.rightInspector.mode.keyPlaceholder')}
                        className="flex-1 min-w-[120px] border-none outline-none text-sm text-gray-900 bg-transparent"
                      />
                </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('workspace.rightInspector.mode.keyHint')}
                    </p>
                  </div>

                  {/* Preset Buttons */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-600">
                        {t('workspace.rightInspector.mode.presets')}
                      </label>
                      {extractKeys.length > 0 && (
                        <button
                          onClick={() => setShowSaveKeysDialog(true)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('workspace.rightInspector.mode.saveKeys')}
                        </button>
              )}
            </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.keys(PRESETS).map((presetKey) => (
              <button
                          key={presetKey}
                          onClick={() => loadPreset(presetKey as keyof typeof PRESETS)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {PRESETS[presetKey as keyof typeof PRESETS].name}
                        </button>
                      ))}
                    </div>
                    {/* 저장된 추출 항목(Keys) 불러오기 */}
                    <div>
                      <button
                        onClick={() => setShowSavedExtractKeys(!showSavedExtractKeys)}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {t('workspace.rightInspector.mode.savedKeys')}
                      </button>
                      {showSavedExtractKeys && (
                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                          {savedExtractKeys.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">{t('workspace.rightInspector.mode.noSavedKeys')}</p>
                          ) : (
                            <div className="space-y-2">
                              {savedExtractKeys.map((saved) => (
                                <div
                                  key={saved.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{saved.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{saved.keys.join(', ')}</p>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <button
                                      onClick={() => loadSavedExtractKeys(saved.keys)}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      title={t('workspace.rightInspector.prompt.load')}
                                    >
                                      {t('workspace.rightInspector.prompt.load')}
                                    </button>
                                    <button
                                      onClick={() => deleteSavedExtractKeys(saved.id)}
                                      className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title={t('workspace.rightInspector.prompt.delete')}
                                    >
                                      <Trash2 className="w-3 h-3" />
              </button>
            </div>
                                </div>
                              ))}
          </div>
        )}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {t('workspace.rightInspector.mode.advancedDescription')}
                  </p>
                  
                  {/* 페이지 전체 자동수집 체크박스 */}
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCollectFullPage}
                        onChange={(e) => setAutoCollectFullPage(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {t('workspace.rightInspector.mode.autoCollectFullPage')}
                      </span>
                    </label>
                    <p className="mt-2 text-xs text-gray-600">
                      {t('workspace.rightInspector.mode.autoCollectFullPageDescription')}
                    </p>
                  </div>
                </div>
          </div>
        )}

            {/* Advanced Mode: Legacy Prompt Editor (Optional, for power users) */}
            {ocrMode === 'advanced' && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors flex items-center justify-between"
                >
                  <span className="text-xs font-medium">
                    {t('workspace.rightInspector.prompt.advancedCustom')}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isEditingPrompt ? 'rotate-90' : ''}`} />
                </button>
                {isEditingPrompt && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                    {/* 저장된 프롬프트 불러오기 */}
                    <div>
                      <button
                        onClick={() => setShowSavedPrompts(!showSavedPrompts)}
                        className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {t('workspace.rightInspector.prompt.savedPrompts')}
                      </button>
                      {showSavedPrompts && (
                        <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                          {savedPrompts.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">{t('workspace.rightInspector.prompt.savedPrompts')}: {t('common.loading')}</p>
                          ) : (
                            <div className="space-y-2">
                              {savedPrompts.map((saved) => (
                                <div
                                  key={saved.id}
                                  className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate">{saved.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{saved.prompt.substring(0, 50)}...</p>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <button
                                      onClick={() => {
                                        loadSavedPrompt(saved.prompt);
                                        setShowSavedPrompts(false);
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                      title={t('workspace.rightInspector.prompt.load')}
                                    >
                                      {t('workspace.rightInspector.prompt.load')}
                                    </button>
                                    <button
                                      onClick={() => deleteSavedPrompt(saved.id)}
                                      className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                      title={t('workspace.rightInspector.prompt.delete')}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <textarea
                      value={editingPromptValue}
                      onChange={(e) => setEditingPromptValue(e.target.value)}
                      placeholder={t('workspace.rightInspector.prompt.placeholder')}
                      className="w-full h-24 p-2 border border-gray-300 rounded-md text-xs font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPromptValue(generatePrompt());
                          setIsEditingPrompt(false);
                          setCustomPrompt('');
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {t('workspace.rightInspector.prompt.cancel')}
                      </button>
                      <button
                        onClick={() => {
                          setCustomPrompt(editingPromptValue.trim());
                          setIsEditingPrompt(false);
                          if (editingPromptValue.trim()) {
                            setShowSaveDialog(true);
                            setPromptName('');
                          }
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {t('workspace.rightInspector.prompt.save')}
                      </button>
            </div>
                    {/* Save Dialog */}
                    {showSaveDialog && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-medium text-blue-900 mb-2">{t('workspace.rightInspector.prompt.saveDialog')}</p>
                        <input
                          type="text"
                          value={promptName}
                          onChange={(e) => setPromptName(e.target.value)}
                          placeholder={t('workspace.rightInspector.prompt.promptName')}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs mb-2 text-gray-900 bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              savePromptToList(promptName, customPrompt);
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => savePromptToList(promptName, customPrompt)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            {t('common.save')}
                          </button>
                          <button
                            onClick={() => {
                              setShowSaveDialog(false);
                              setPromptName('');
                            }}
                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
          </div>
        )}

            {/* Save Extract Keys Dialog */}
            {showSaveKeysDialog && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm font-medium text-blue-900 mb-2">{t('workspace.rightInspector.mode.saveKeysDialog')}</p>
                <input
                  type="text"
                  value={extractKeysName}
                  onChange={(e) => setExtractKeysName(e.target.value)}
                  placeholder={t('workspace.rightInspector.mode.keysName')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 text-gray-900 bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveExtractKeysToList(extractKeysName, extractKeys);
                    }
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveExtractKeysToList(extractKeysName, extractKeys)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveKeysDialog(false);
                      setExtractKeysName('');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    {t('common.cancel')}
                  </button>
            </div>
          </div>
        )}
          </div>

          {/* OCR Results Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('workspace.rightInspector.results.title')}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {ocrResult ? (
                <div className="space-y-4">
                  {/* Money Saved Calculator */}
                  {(() => {
                    // 실제 OCR 처리된 영역 수와 페이지 수 사용
                    const actualAreasCount = processedAreasCount > 0 ? processedAreasCount : 0;
                    const actualPagesCount = processedPagesSet.size > 0 ? processedPagesSet.size : (isPdf ? totalPages : 1);
                    const MINIMUM_WAGE_PER_HOUR = 10320; // 시간당 급여 기준 (원/시간)
                    const timeSavedMinutes = actualAreasCount * actualPagesCount * 1; // 분 단위 (영역 수 × 페이지 수 × 1분)
                    // 계산: 영역 수 × 페이지 수 × 1분 × 시급 10,320원
                    const moneySaved = actualAreasCount * actualPagesCount * 1 * (MINIMUM_WAGE_PER_HOUR / 60); // 원
                    return (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
                        {/* 절약된 시간 */}
                        <div>
                          <div className="text-sm text-blue-800 mb-1">
                            {t('workspace.rightInspector.results.timeSaved')}
                          </div>
                          <div className="text-xl font-bold text-blue-600">
                            {timeSavedMinutes} {t('workspace.rightInspector.results.minutes')}
                          </div>
                        </div>
                        {/* 절약된 금액 */}
                        <div>
                          <div className="text-sm text-blue-800 mb-1">
                            {t('workspace.rightInspector.results.moneySaved')}
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round(moneySaved).toLocaleString('ko-KR')} {t('workspace.rightInspector.results.won')}
                          </div>
                          <div className="text-xs text-blue-600 mt-2">
                            (영역 {actualAreasCount}개 × 페이지 {actualPagesCount}개 × 1분, 시급 {MINIMUM_WAGE_PER_HOUR.toLocaleString('ko-KR')}원)
                          </div>
      </div>
    </div>
  );
                  })()}
                  <div className="bg-gray-50 rounded-md p-4 border border-gray-200">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {ocrResult}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-8">
                  {t('workspace.rightInspector.results.noResults')}
          </div>
        )}
            </div>
          </div>

          {/* Actions Bar (Sticky Bottom) */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-2">
            {isProcessing ? (
              <button
                onClick={handleStopOCR}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="flex-1 text-left">{processingProgress || 'OCR 처리 중...'}</span>
                <X className="w-4 h-4 ml-2" />
                <span className="ml-2">중지</span>
              </button>
            ) : (
              <button
                onClick={handleRunOCR}
                disabled={(() => {
                  // 고급 모드에서 페이지 전체 자동수집이 체크되어 있으면 영역 지정 없이도 실행 가능
                  if (ocrMode === 'advanced' && autoCollectFullPage) {
                    return false;
                  }
                  const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                  return allAreasCount === 0;
                })()}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('workspace.rightInspector.actions.runOCR')}
                {(() => {
                  if (ocrMode === 'advanced' && autoCollectFullPage) {
                    return ` (${isPdf ? totalPages : 1}페이지 전체)`;
                  }
                  const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                  return allAreasCount > 0 ? ` (${allAreasCount})` : '';
                })()}
              </button>
            )}
            
            {/* 저장 및 결과 초기화 버튼 */}
            {ocrResult && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // OCR 결과를 history에 저장
                    if (ocrResultsData.length === 0) {
                      setError('저장할 결과가 없습니다.');
                      return;
                    }
                    
                    try {
                      setError(null);
                      // 각 OCR 결과를 순차적으로 저장
                      for (const resultData of ocrResultsData) {
                        const formData = new FormData();
                        formData.append('extracted_text', resultData.extracted_text);
                        formData.append('cropped_image', resultData.cropped_image);
                        formData.append('filename', resultData.filename);
                        if (resultData.page_number !== null) {
                          formData.append('page_number', String(resultData.page_number));
                        }
                        
                        const response = await fetch(`${BACKEND_URL}/history/save`, {
                          method: 'POST',
                          body: formData,
                        });
                        
                        if (!response.ok) {
                          throw new Error('저장에 실패했습니다.');
                        }
                      }
                      
                      // 성공 메시지 표시
                      const successMsg = t('workspace.rightInspector.actions.saveSuccess');
                      setError(successMsg);
                      setTimeout(() => setError(null), 2000);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t('workspace.rightInspector.actions.saveResult')}
                </button>
                <button
                  onClick={() => {
                    // OCR 결과 초기화 (history에 저장하지 않음)
                    setOcrResult(null);
                    setProcessedAreasCount(0);
                    setProcessedPagesSet(new Set());
                    setCroppedPreviews(new Map());
                    setOcrResultsData([]); // 결과 데이터 초기화
                    setError(null);
                    // localStorage에서도 제거
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem(OCR_RESULT_STORAGE_KEY);
                    }
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t('workspace.rightInspector.actions.clearResult')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 모든 페이지에 적용 확인 모달 */}
      {showApplyToAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              모든 페이지에 동일하게 적용하시겠습니까?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              현재 선택한 영역을 모든 페이지({totalPages}페이지)에 동일하게 적용합니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApplyToAllModal(false);
                  setPendingCropData(null);
                  setCurrentCrop(undefined);
                  setCurrentCompletedCrop(undefined);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                아니오
              </button>
              <button
                onClick={() => applyCropArea(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                현재 페이지만
              </button>
              <button
                onClick={() => applyCropArea(true)}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                예, 모두 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


