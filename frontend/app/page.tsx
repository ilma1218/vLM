'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

// 파일명 유틸리티 함수
const getFileNameWithoutExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(0, lastDot) : filename;
};

interface SavedPrompt {
  id: number;
  name: string;
  prompt: string;
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
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
  }, [fetchPrompts]); // fetchPrompts 의존성 추가

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

  // 현재 페이지의 크롭 영역 가져오기
  const getCurrentPageCropAreas = useCallback(() => {
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
  const onCropComplete = useCallback((crop: PixelCrop, percentageCrop: PercentCrop) => {
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
  const addCropArea = useCallback(() => {
    const image = imgRef.current;
    if (!image || !currentCompletedCrop) return;
    
    // 현재 화면에 보이는 이미지의 크기 가져오기 (getBoundingClientRect 사용)
    // 중요: naturalWidth(원본 크기)가 아닌 현재 화면에 보이는 크기를 사용해야 함
    const rect = image.getBoundingClientRect();
    const displayedWidth = rect.width;
    const displayedHeight = rect.height;
    
    const pageKey = isPdf ? currentPage : undefined;
    
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
    
    setCropAreasByPage(prev => {
      const newMap = new Map(prev);
      const currentAreas = newMap.get(pageKey) || [];
      
      if (editingAreaId) {
        // 기존 영역 업데이트
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
        newMap.set(pageKey, [...currentAreas, newArea]);
        setNextCropId(prev => prev + 1);
      }
      
      return newMap;
    });
    
    setCurrentCrop(undefined);
    setCurrentCompletedCrop(undefined);
    setEditingAreaId(null);
  }, [currentCompletedCrop, nextCropId, isPdf, currentPage, editingAreaId]);

  // 크롭 영역 삭제
  const removeCropArea = useCallback((id: string) => {
    setCropAreasByPage(prev => {
      const newMap = new Map(prev);
      // 모든 페이지에서 해당 ID의 영역 찾아서 삭제
      for (const [pageKey, areas] of newMap.entries()) {
        const filtered = areas.filter(area => area.id !== id);
        if (filtered.length !== areas.length) {
          newMap.set(pageKey, filtered);
          break;
        }
      }
      return newMap;
    });
    
    const preview = croppedPreviews.get(id);
    if (preview) {
      URL.revokeObjectURL(preview);
      setCroppedPreviews(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
  }, [croppedPreviews]);
  
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

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 자동 로그인으로 인증 체크 제거

    // 이전 파일 완전히 정리 (먼저 정리)
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

    setIsUploading(true);
    setUploadProgress(0);
    setFile(selectedFile);

    const fileType = selectedFile.type;
    const fileName = selectedFile.name.toLowerCase();

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
          setUploadProgress(100);
          setImageSrc(e.target?.result as string);
          setIsUploading(false);
        };
        reader.onerror = () => {
          setError('파일 읽기 중 오류가 발생했습니다.');
          setIsUploading(false);
          setFile(null);
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
        // 이전 이미지 완전히 제거 후 새 이미지 설정
        setImageSrc(null);
        setTimeout(() => {
          setImageSrc(dataUrl);
          setUploadProgress(100);
          setIsUploading(false);
        }, 50);
      } else {
        setError('지원하지 않는 파일 형식입니다. 이미지(jpg, png) 또는 PDF 파일을 업로드해주세요.');
        setFile(null);
        setIsUploading(false);
      }
    } catch (err) {
      setError(`파일 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // OCR 실행
  const handleRunOCR = async () => {
    if (!imageSrc) {
      setError('이미지를 선택해주세요.');
      return;
    }

    // 모든 페이지의 크롭 영역 수집
    const allCropAreas: CropAreaData[] = [];
    for (const areas of cropAreasByPage.values()) {
      allCropAreas.push(...areas);
    }

    if (allCropAreas.length === 0) {
      setError('최소 하나의 크롭 영역을 추가해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setProcessingProgress('');

    try {
      const allResults: string[] = [];
      const newPreviews = new Map<string, string>();
      const processedPages = new Set<number>(); // 실제 처리된 페이지 번호 추적

      // 각 크롭 영역에 대해 OCR 실행
      for (let areaIndex = 0; areaIndex < allCropAreas.length; areaIndex++) {
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
          if (customPrompt && customPrompt.trim()) {
            formData.append('custom_prompt', customPrompt.trim());
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
        if (customPrompt && customPrompt.trim()) {
          formData.append('custom_prompt', customPrompt.trim());
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
            
            // 즉시 결과 업데이트 - 영역별로 바로바로 표시
            setOcrResult(allResults.join('\n\n---\n\n'));
            setCroppedPreviews(new Map(newPreviews));
            setProcessedAreasCount(allResults.length);
            setProcessedPagesSet(new Set(processedPages));
          }
        }
      }

      // 최종 결과 업데이트 (모든 영역 처리 완료 후)
      setCroppedPreviews(newPreviews);
      setProcessedAreasCount(allResults.length); // 실제 처리된 영역 수 저장
      setProcessedPagesSet(processedPages); // 실제 처리된 페이지 Set 저장
      setProcessingProgress(`완료: ${allResults.length}개 영역 처리됨`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
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

  // Landing State: 파일이 없을 때
  if (!file && !imageSrc) {
  return (
      <>
        <LandingState onFileSelect={handleFileSelect} fileInputRef={fileInputRef} />
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            // 로그인 성공 후 파일 업로드 재시도는 사용자가 다시 선택하도록
            setShowLoginModal(false);
          }}
        />
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
        {/* Left Sidebar: PDF Page Navigation */}
        {isPdf && totalPages > 1 && (
          <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">
                {t('workspace.leftSidebar.title')}
              </h2>
          </div>
            <div className="p-2 space-y-2">
              {pdfCanvases.map((canvas, index) => {
                const pageNum = index + 1;
                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isProcessing}
                    className={`w-full p-3 border-2 rounded-md text-left transition-colors ${
                      isActive
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-xs font-medium text-gray-700 mb-2">
                      {t('workspace.leftSidebar.thumbnail')} {pageNum}
                    </div>
                    <img
                      src={canvas.toDataURL('image/png')}
                      alt={`Page ${pageNum} thumbnail`}
                      className="w-full h-auto rounded border border-gray-200"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
                  onChange={(_, percentCrop) => setCurrentCrop(percentCrop)}
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
                {imgRef.current && getCurrentPageCropAreas().map((area, index) => {
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
                          removeCropArea(area.id);
                          if (editingAreaId === area.id) {
                            setEditingAreaId(null);
                            setCurrentCrop(undefined);
                            setCurrentCompletedCrop(undefined);
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 pointer-events-auto shadow-md z-20 transition-transform hover:scale-110"
                        title={t('crop.delete')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
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
            </div>
          </div>
        </div>

        {/* Right Inspector: Prompt & Results */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          {/* Custom Prompt Section (Collapsible) */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => setIsEditingPrompt(!isEditingPrompt)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">
                {t('workspace.rightInspector.prompt.title')}
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isEditingPrompt ? 'rotate-90' : ''}`} />
            </button>
            {isEditingPrompt && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3 max-h-96 overflow-y-auto">
                {/* Saved Prompts List */}
                {showSavedPrompts && (
                  <div className="mb-3 p-3 bg-white border border-gray-200 rounded-md">
                    {savedPrompts.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">{t('workspace.rightInspector.prompt.savedPrompts')}: {t('common.loading')}</p>
                    ) : (
                      <div className="space-y-2">
                        {savedPrompts.map((saved) => (
                          <div
                            key={saved.id}
                            className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{saved.name}</p>
                              <p className="text-xs text-gray-500 truncate">{saved.prompt.substring(0, 50)}...</p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => loadSavedPrompt(saved.prompt)}
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
                
                {/* Prompt Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowSavedPrompts(!showSavedPrompts)}
                      className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {t('workspace.rightInspector.prompt.savedPrompts')}
                    </button>
                  </div>
                  <textarea
                    value={editingPromptValue}
                    onChange={(e) => setEditingPromptValue(e.target.value)}
                    placeholder={t('workspace.rightInspector.prompt.placeholder')}
                    className="w-full h-32 p-3 border border-blue-500 rounded-md text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {t('workspace.rightInspector.prompt.saveDialog')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPromptValue(customPrompt || DEFAULT_PROMPT);
                          setIsEditingPrompt(false);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t('workspace.rightInspector.prompt.cancel')}
                      </button>
                      <button
                        onClick={() => {
                          const finalPrompt = editingPromptValue.trim() === DEFAULT_PROMPT.trim() 
                            ? '' 
                            : editingPromptValue.trim();
                          setCustomPrompt(finalPrompt);
                          setIsEditingPrompt(false);
                          if (finalPrompt) {
                            setShowSaveDialog(true);
                            setPromptName('');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {t('workspace.rightInspector.prompt.save')}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Save Dialog */}
                {showSaveDialog && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900 mb-2">{t('workspace.rightInspector.prompt.saveDialog')}</p>
                    <input
                      type="text"
                      value={promptName}
                      onChange={(e) => setPromptName(e.target.value)}
                      placeholder={t('workspace.rightInspector.prompt.promptName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 text-gray-900 bg-white"
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
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={() => {
                          setShowSaveDialog(false);
                          setPromptName('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        {t('common.cancel')}
                      </button>
            </div>
          </div>
        )}
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
            <button
              onClick={handleRunOCR}
              disabled={isProcessing || (() => {
                const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                return allAreasCount === 0;
              })()}
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {processingProgress || t('workspace.rightInspector.actions.processing')}
                </>
              ) : (
                <>
                  {t('workspace.rightInspector.actions.runOCR')}
                  {(() => {
                    const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                    return allAreasCount > 0 ? ` (${allAreasCount})` : '';
                  })()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


