'use client';

import { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, makeAspectCrop, centerCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { renderPdfFirstPageToCanvas, renderPdfAllPagesToCanvases, getPdfPageCount } from '@/utils/pdfUtils';
import { cropImageToBlob, CropArea } from '@/utils/cropUtils';
import { Upload, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pdfCanvases, setPdfCanvases] = useState<HTMLCanvasElement[]>([]);
  const [cropPercent, setCropPercent] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 이미지 로드 핸들러
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // 크롭 영역이 이미 선택되어 있으면 퍼센트 기반으로 복원
    if (cropPercent) {
      const newCrop: PixelCrop = {
        x: (cropPercent.x / 100) * width,
        y: (cropPercent.y / 100) * height,
        width: (cropPercent.width / 100) * width,
        height: (cropPercent.height / 100) * height,
        unit: 'px',
      };
      setCompletedCrop(newCrop);
      setCrop({
        unit: 'px',
        x: newCrop.x,
        y: newCrop.y,
        width: newCrop.width,
        height: newCrop.height,
      });
    } else {
      // 크롭 영역이 없으면 기본 크롭 생성
      const crop = makeAspectCrop(
        {
          unit: '%',
          width: 50,
        },
        16 / 9,
        width,
        height
      );
      setCrop(centerCrop(crop, width, height));
    }
  }, [cropPercent]);
  
  // 크롭 완료 핸들러
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
    
    // 크롭 영역을 퍼센트로 저장 (페이지 이동 시 동일한 위치에 표시하기 위해)
    if (imgRef.current) {
      const imgWidth = imgRef.current.width;
      const imgHeight = imgRef.current.height;
      setCropPercent({
        x: (crop.x / imgWidth) * 100,
        y: (crop.y / imgHeight) * 100,
        width: (crop.width / imgWidth) * 100,
        height: (crop.height / imgHeight) * 100,
      });
    }
  }, []);
  
  // PDF 페이지 이동
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    
    setCurrentPage(newPage);
    
    if (pdfCanvases[newPage - 1]) {
      const dataUrl = pdfCanvases[newPage - 1].toDataURL('image/png');
      setImageSrc(dataUrl);
    }
  }, [totalPages, pdfCanvases]);

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 이전 파일 완전히 정리 (먼저 정리)
    setImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCropPercent(null);
    setOcrResult(null);
    setError(null);
    setCurrentPage(1);
    setTotalPages(1);
    setPdfCanvases([]);
    
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview);
      setCroppedPreview(null);
    }

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
    if (!imageSrc || !completedCrop || !imgRef.current) {
      setError('이미지를 선택하고 크롭 영역을 지정해주세요.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setProcessingProgress('');

    try {
      const cropArea: CropArea = {
        x: completedCrop.x,
        y: completedCrop.y,
        width: completedCrop.width,
        height: completedCrop.height,
      };

      if (isPdf && pdfFile) {
        // PDF의 모든 페이지 처리
        setProcessingProgress('PDF 페이지 로딩 중...');
        const canvases = await renderPdfAllPagesToCanvases(pdfFile);
        const totalPages = canvases.length;
        const results: string[] = [];

        // 첫 페이지의 표시 크기와 원본 Canvas 크기 비율 계산
        const firstCanvas = canvases[0];
        const displayWidth = imgRef.current.width;
        const displayHeight = imgRef.current.height;
        const naturalWidth = firstCanvas.width;
        const naturalHeight = firstCanvas.height;
        
        const scaleX = naturalWidth / displayWidth;
        const scaleY = naturalHeight / displayHeight;

        // 크롭 영역을 원본 Canvas 크기에 맞게 조정
        const adjustedCropArea: CropArea = {
          x: cropArea.x * scaleX,
          y: cropArea.y * scaleY,
          width: cropArea.width * scaleX,
          height: cropArea.height * scaleY,
        };

        for (let i = 0; i < canvases.length; i++) {
          setProcessingProgress(`페이지 ${i + 1}/${totalPages} 처리 중...`);
          
          // 각 페이지에서 크롭 영역 추출 (조정된 크롭 영역 사용)
          const canvas = canvases[i];
          const blob = await cropImageToBlob(canvas, adjustedCropArea);

          // 첫 페이지의 크롭된 이미지를 미리보기로 사용
          if (i === 0) {
            const previewUrl = URL.createObjectURL(blob);
            setCroppedPreview(previewUrl);
          }

          // 백엔드에 전송하여 OCR 수행
          const formData = new FormData();
          formData.append('file', blob, `cropped_page_${i + 1}.png`);

          const response = await fetch(`${BACKEND_URL}/ocr`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`페이지 ${i + 1} 처리 실패: ${errorData.detail || 'Unknown error'}`);
          }

          const data = await response.json();
          if (data.extracted_text && data.extracted_text.trim()) {
            results.push(`[페이지 ${i + 1}]\n${data.extracted_text}`);
          }
        }

        // 모든 페이지의 결과를 합침
        setOcrResult(results.join('\n\n'));
        setProcessingProgress(`완료: ${totalPages}개 페이지 처리됨`);
      } else {
        // 이미지 파일 처리 (기존 로직)
        const blob = await cropImageToBlob(imgRef.current, cropArea);

        // 크롭된 이미지 미리보기 생성
        const previewUrl = URL.createObjectURL(blob);
        setCroppedPreview(previewUrl);

        // FormData로 백엔드에 전송
        const formData = new FormData();
        formData.append('file', blob, 'cropped.png');

        const response = await fetch(`${BACKEND_URL}/ocr`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || 'OCR 처리에 실패했습니다.');
        }

        const data = await response.json();
        setOcrResult(data.extracted_text);
      }
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
    setCrop(undefined);
    setCompletedCrop(undefined);
    setOcrResult(null);
    setError(null);
    setIsPdf(false);
    setPdfFile(null);
    setProcessingProgress('');
    setCurrentPage(1);
    setTotalPages(1);
    setPdfCanvases([]);
    setCropPercent(null);
    setUploadProgress(0);
    setIsUploading(false);
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview);
      setCroppedPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Region-Specific OCR Service
        </h1>

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
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
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
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  {isUploading ? '파일 처리 중...' : '이미지를 선택해주세요'}
                </div>
              )}
            </div>
            <div className="mt-4">
              <button
                onClick={handleRunOCR}
                disabled={!completedCrop || isProcessing}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {processingProgress || '처리 중...'}
                  </>
                ) : (
                  isPdf ? '모든 페이지 OCR 실행' : 'OCR 실행'
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
        {croppedPreview && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">크롭된 영역 미리보기:</h3>
            <div className="bg-white p-4 rounded border border-gray-200">
              <img 
                src={croppedPreview} 
                alt="Cropped area" 
                className="max-w-full h-auto border border-gray-300"
              />
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

