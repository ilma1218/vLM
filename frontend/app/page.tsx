'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { renderPdfFirstPageToCanvas, renderPdfAllPagesToCanvases, getPdfPageCount } from '@/utils/pdfUtils';
import { cropImageToBlob, CropArea } from '@/utils/cropUtils';
import { Upload, X, Loader2, ChevronLeft, ChevronRight, Plus, Save, FolderOpen, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const OCR_RESULT_STORAGE_KEY = 'ocr_result';
const PROMPT_STORAGE_KEY = 'custom_prompt';
const PROMPT_LIST_STORAGE_KEY = 'saved_prompts';
const DEFAULT_PROMPT = 'Extract ONLY the text that is ACTUALLY VISIBLE in this cropped image. Read from left to right, top to bottom, line by line. Extract each line exactly once. Do NOT generate patterns. Do NOT create number sequences like \'10, 11, 12...\'. Do NOT repeat any text. Do NOT extrapolate beyond what is visible. Output only the actual text you can see in the image:';

interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
}

interface CropAreaData {
  id: string;
  crop: Crop;
  completedCrop: PixelCrop;
  cropPercent?: {x: number, y: number, width: number, height: number};
  pageNumber?: number; // PDF 페이지 번호 (이미지는 undefined)
}

export default function Home() {
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

  // localStorage에서 OCR 결과 및 프롬프트 복원 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOcrResult = localStorage.getItem(OCR_RESULT_STORAGE_KEY);
      if (savedOcrResult && savedOcrResult.trim()) {
        // OCR 결과가 있고 비어있지 않으면 복원
        setOcrResult(savedOcrResult);
      }
      
      // 저장된 프롬프트 복원
      const savedPrompt = localStorage.getItem(PROMPT_STORAGE_KEY);
      if (savedPrompt !== null) {
        setCustomPrompt(savedPrompt);
      }
      
      // 저장된 프롬프트 목록 복원
      const savedPromptsJson = localStorage.getItem(PROMPT_LIST_STORAGE_KEY);
      if (savedPromptsJson) {
        try {
          const prompts = JSON.parse(savedPromptsJson);
          setSavedPrompts(prompts);
        } catch (e) {
          console.error('Failed to parse saved prompts:', e);
        }
      }
    }
  }, []); // 빈 배열: 컴포넌트 마운트 시 한 번만 실행

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
  const savePromptToList = useCallback((name: string, prompt: string) => {
    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      name: name || `프롬프트 ${savedPrompts.length + 1}`,
      prompt: prompt,
      createdAt: new Date().toISOString(),
    };
    const updatedPrompts = [newPrompt, ...savedPrompts];
    setSavedPrompts(updatedPrompts);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROMPT_LIST_STORAGE_KEY, JSON.stringify(updatedPrompts));
    }
    setShowSaveDialog(false);
    setPromptName('');
  }, [savedPrompts]);

  // 저장된 프롬프트 불러오기
  const loadSavedPrompt = useCallback((prompt: string) => {
    setCustomPrompt(prompt);
    setEditingPromptValue(prompt);
    setIsEditingPrompt(true);
    setShowSavedPrompts(false);
  }, []);

  // 저장된 프롬프트 삭제
  const deleteSavedPrompt = useCallback((id: string) => {
    const updatedPrompts = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updatedPrompts);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROMPT_LIST_STORAGE_KEY, JSON.stringify(updatedPrompts));
    }
  }, [savedPrompts]);

  // 현재 페이지의 크롭 영역 가져오기
  const getCurrentPageCropAreas = useCallback(() => {
    const pageKey = isPdf ? currentPage : undefined;
    return cropAreasByPage.get(pageKey) || [];
  }, [cropAreasByPage, isPdf, currentPage]);

  // 이미지 로드 핸들러
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    if (!imgRef.current) return;
    
    const imgWidth = imgRef.current.width;
    const imgHeight = imgRef.current.height;
    
    // 현재 페이지의 크롭 영역 복원
    const pageKey = isPdf ? currentPage : undefined;
    const currentAreas = cropAreasByPage.get(pageKey) || [];
    
    // 현재 페이지에 크롭 영역이 있으면 복원
    if (currentAreas.length > 0) {
      const restoredAreas = currentAreas.map(area => {
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
    } else if (isPdf && currentPage > 1) {
      // 현재 페이지에 크롭 영역이 없고, 첫 페이지가 아니면 첫 페이지의 모든 크롭 영역을 복사
      const firstPageAreas = cropAreasByPage.get(1) || [];
      if (firstPageAreas.length > 0) {
        // 첫 페이지의 모든 크롭 영역을 현재 페이지에 복사
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
          const defaultCrop: PixelCrop = {
            x: (firstPageArea.cropPercent.x / 100) * imgWidth,
            y: (firstPageArea.cropPercent.y / 100) * imgHeight,
            width: (firstPageArea.cropPercent.width / 100) * imgWidth,
            height: (firstPageArea.cropPercent.height / 100) * imgHeight,
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
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCurrentCompletedCrop(crop);
    // 크롭 완료 시 편집 모드가 아니면 자동으로 편집 모드로 전환하지 않음
    // 사용자가 명시적으로 버튼을 클릭하도록 함
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
    if (!imgRef.current || !currentCompletedCrop) return;
    
    const imgWidth = imgRef.current.width;
    const imgHeight = imgRef.current.height;
    const pageKey = isPdf ? currentPage : undefined;
    
    const cropPercent = {
      x: (currentCompletedCrop.x / imgWidth) * 100,
      y: (currentCompletedCrop.y / imgHeight) * 100,
      width: (currentCompletedCrop.width / imgWidth) * 100,
      height: (currentCompletedCrop.height / imgHeight) * 100,
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
                  x: currentCompletedCrop.x,
                  y: currentCompletedCrop.y,
                  width: currentCompletedCrop.width,
                  height: currentCompletedCrop.height,
                },
                completedCrop: currentCompletedCrop,
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
            x: currentCompletedCrop.x,
            y: currentCompletedCrop.y,
            width: currentCompletedCrop.width,
            height: currentCompletedCrop.height,
          },
          completedCrop: currentCompletedCrop,
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
            allResults.push(`[페이지 ${area.pageNumber} - 영역 ${areaIndex + 1}]\n${data.extracted_text}`);
          }
        } else {
          // 이미지 파일 처리
          if (!imgRef.current) {
            continue;
          }
          
          setProcessingProgress(`영역 ${areaIndex + 1}/${allCropAreas.length} 처리 중...`);
          
          // 크롭 영역의 퍼센트 값을 사용하여 실제 픽셀 좌표 계산
          if (area.cropPercent) {
            const naturalWidth = imgRef.current.naturalWidth;
            const naturalHeight = imgRef.current.naturalHeight;
            
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
          
          const blob = await cropImageToBlob(imgRef.current, cropArea);

          // 크롭된 이미지 미리보기 생성
          const previewUrl = URL.createObjectURL(blob);
          newPreviews.set(area.id, previewUrl);

          const formData = new FormData();
          formData.append('file', blob, 'cropped.png');
          formData.append('filename', file?.name || 'unknown');
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
            allResults.push(`[영역 ${areaIndex + 1}]\n${data.extracted_text}`);
          }
        }
      }

      // 모든 영역의 결과를 합침
      setOcrResult(allResults.join('\n\n---\n\n'));
      setCroppedPreviews(newPreviews);
      setProcessingProgress(`완료: ${allCropAreas.length}개 영역 처리됨`);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            IO-VISION OCR - 특정영역추출 서비스
          </h1>
          {(file || ocrResult) && (
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </button>
          )}
        </div>

        {/* 파일 업로드 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            파일 업로드 (이미지 또는 PDF)
          </label>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              파일 선택
            </label>
            {file && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{file.name}</span>
                <button
                  onClick={handleReset}
                  className="text-red-600 hover:text-red-800"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          {/* 업로드 진행 상황 표시 */}
          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">파일 처리 중...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* 이미지 크롭 영역 */}
        {imageSrc && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                영역 선택 (드래그하여 크롭할 영역을 선택하세요)
                {isPdf && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    (PDF: 모든 페이지에서 동일한 영역이 추출됩니다)
                  </span>
                )}
              </h2>
              {isPdf && totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    페이지 {currentPage} / {totalPages}
                    {isProcessing && (
                      <span className="ml-2 text-xs text-blue-600">
                        (OCR 진행 중...)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-center bg-gray-100 p-4 rounded-lg">
              {imageSrc ? (
                <div className="relative inline-block">
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
                      onLoad={onImageLoad}
                      style={{ maxWidth: '100%', maxHeight: '600px', display: 'block' }}
                    />
                  </ReactCrop>
                  {/* 저장된 크롭 영역들을 오버레이로 표시 */}
                  {imgRef.current && getCurrentPageCropAreas().map((area) => {
                    const imgWidth = imgRef.current!.width;
                    const imgHeight = imgRef.current!.height;
                    const isEditing = editingAreaId === area.id;
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
                          left: `${(area.crop.x / imgWidth) * 100}%`,
                          top: `${(area.crop.y / imgHeight) * 100}%`,
                          width: `${(area.crop.width / imgWidth) * 100}%`,
                          height: `${(area.crop.height / imgHeight) * 100}%`,
                          userSelect: 'none',
                        }}
                        title={isEditing ? '편집 중 - 드래그하여 이동하거나 크롭 영역을 다시 선택하세요' : draggingAreaId === area.id ? '드래그하여 이동 중...' : '드래그하여 이동 또는 클릭하여 편집'}
                      >
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
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 pointer-events-auto shadow-md z-20"
                          title="영역 삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  {isUploading ? '파일 처리 중...' : '이미지를 선택해주세요'}
                </div>
              )}
            </div>
            {/* 선택된 영역 목록 */}
            {(() => {
              const currentAreas = getCurrentPageCropAreas();
              const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
              return currentAreas.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {isPdf ? `페이지 ${currentPage} 영역: ${currentAreas.length}개` : `선택된 영역: ${currentAreas.length}개`}
                      {isPdf && allAreasCount > currentAreas.length && (
                        <span className="ml-2 text-xs text-gray-500">
                          (전체: {allAreasCount}개)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentAreas.map((area, index) => (
                      <div
                        key={area.id}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                      >
                        <span>영역 {index + 1}</span>
                        <button
                          onClick={() => removeCropArea(area.id)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="영역 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* 크롭 완료 시 영역 추가/업데이트 버튼 */}
            {currentCompletedCrop && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      {editingAreaId ? '영역 크롭 완료 - 업데이트하시겠습니까?' : '영역 크롭 완료 - 추가하시겠습니까?'}
                    </p>
                    <p className="text-xs text-blue-700">
                      크롭 영역: {Math.round(currentCompletedCrop.width)} × {Math.round(currentCompletedCrop.height)}px
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {editingAreaId && (
                      <button
                        onClick={() => {
                          setEditingAreaId(null);
                          setCurrentCrop(undefined);
                          setCurrentCompletedCrop(undefined);
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </button>
                    )}
                    <button
                      onClick={addCropArea}
                      className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium text-white ${
                        editingAreaId
                          ? 'border-yellow-500 bg-yellow-600 hover:bg-yellow-700'
                          : 'border-green-500 bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {editingAreaId ? (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          영역 업데이트
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          영역 추가
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* OCR 프롬프트 설정 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  OCR 프롬프트 (선택사항)
                </label>
                <button
                  onClick={() => setShowSavedPrompts(!showSavedPrompts)}
                  className="inline-flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                  title="저장된 프롬프트 목록"
                >
                  <FolderOpen className="w-3 h-3 mr-1" />
                  저장된 프롬프트
                </button>
              </div>
              
              {/* 저장된 프롬프트 목록 */}
              {showSavedPrompts && (
                <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  {savedPrompts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">저장된 프롬프트가 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedPrompts.map((saved) => (
                        <div
                          key={saved.id}
                          className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{saved.name}</p>
                            <p className="text-xs text-gray-500 truncate">{saved.prompt.substring(0, 50)}...</p>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => loadSavedPrompt(saved.prompt)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="불러오기"
                            >
                              불러오기
                            </button>
                            <button
                              onClick={() => deleteSavedPrompt(saved.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="삭제"
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
              
              {isEditingPrompt ? (
                <div className="space-y-3">
                  <textarea
                    value={editingPromptValue}
                    onChange={(e) => setEditingPromptValue(e.target.value)}
                    placeholder="프롬프트를 입력하세요..."
                    className="w-full h-32 p-3 border border-blue-500 rounded-md text-sm font-mono resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      프롬프트를 비워두면 기본 프롬프트가 사용됩니다.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // 취소 시 원래 값으로 복원 (customPrompt가 있으면 그것을, 없으면 기본 프롬프트)
                          setEditingPromptValue(customPrompt || DEFAULT_PROMPT);
                          setIsEditingPrompt(false);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        취소
                      </button>
                      <button
                        onClick={() => {
                          // 저장 시: 빈 문자열이면 기본 프롬프트를 사용, 아니면 사용자 입력값 사용
                          // 하지만 사용자가 기본 프롬프트를 그대로 두면 customPrompt를 비워서 기본값 사용
                          const finalPrompt = editingPromptValue.trim() === DEFAULT_PROMPT.trim() 
                            ? '' 
                            : editingPromptValue.trim();
                          setCustomPrompt(finalPrompt);
                          setIsEditingPrompt(false);
                          // 프롬프트가 있으면 저장 다이얼로그 표시
                          if (finalPrompt) {
                            setShowSaveDialog(true);
                            setPromptName('');
                          }
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => {
                    // customPrompt가 있으면 그것을, 없으면 기본 프롬프트를 표시
                    setEditingPromptValue(customPrompt || DEFAULT_PROMPT);
                    setIsEditingPrompt(true);
                  }}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md text-sm font-mono bg-gray-50 hover:bg-gray-100 cursor-text transition-colors"
                >
                  <pre className="whitespace-pre-wrap text-gray-900">
                    {customPrompt || DEFAULT_PROMPT}
                  </pre>
                </div>
              )}
              
              {/* 저장 다이얼로그 */}
              {showSaveDialog && (
                <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-2">프롬프트를 저장하시겠습니까?</p>
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    placeholder="프롬프트 이름 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-2 text-gray-900 bg-white"
                    style={{ color: '#111827' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        savePromptToList(promptName, customPrompt);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        savePromptToList(promptName, customPrompt);
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveDialog(false);
                        setPromptName('');
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleRunOCR}
                disabled={isProcessing || (() => {
                  const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                  return allAreasCount === 0;
                })()}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {processingProgress || '처리 중...'}
                  </>
                ) : (
                  (() => {
                    const allAreasCount = Array.from(cropAreasByPage.values()).reduce((sum, areas) => sum + areas.length, 0);
                    return isPdf ? `OCR 실행 (${allAreasCount}개 영역)` : `OCR 실행 (${allAreasCount}개 영역)`;
                  })()
                )}
              </button>
            </div>
          </div>
        )}

        {/* 오류 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 크롭된 이미지 미리보기 */}
        {croppedPreviews.size > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">크롭된 영역 미리보기:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(cropAreasByPage.entries()).flatMap(([pageKey, areas]) =>
                areas.map((area, index) => {
                  const preview = croppedPreviews.get(area.id);
                  if (!preview) return null;
                  return (
                    <div key={area.id} className="bg-white p-4 rounded border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {pageKey !== undefined ? `페이지 ${pageKey} - 영역 ${index + 1}` : `영역 ${index + 1}`}
                        </span>
                        <button
                          onClick={() => removeCropArea(area.id)}
                          className="text-red-600 hover:text-red-800"
                          title="영역 삭제"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <img 
                        src={preview} 
                        alt={`Cropped area ${index + 1}`} 
                        className="max-w-full h-auto border border-gray-300"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* OCR 결과 */}
        {ocrResult && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">추출된 텍스트:</h3>
            <div className="bg-white p-4 rounded border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{ocrResult}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

