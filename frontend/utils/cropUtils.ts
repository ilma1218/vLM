/**
 * Canvas에서 선택된 영역을 Blob으로 변환하는 유틸리티
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 이미지 요소에서 선택된 영역을 Blob으로 추출
 * 이미지의 표시 크기와 원본 크기 비율을 고려하여 정확한 크롭을 수행합니다.
 */
export async function cropImageToBlob(
  imageElement: HTMLImageElement | HTMLCanvasElement,
  cropArea: CropArea
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    if (imageElement instanceof HTMLImageElement) {
      // 이미지의 원본 크기와 표시 크기
      const naturalWidth = imageElement.naturalWidth;
      const naturalHeight = imageElement.naturalHeight;
      const displayWidth = imageElement.width;
      const displayHeight = imageElement.height;

      // 표시 크기와 원본 크기의 비율 계산
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      // 크롭 영역을 원본 이미지 크기에 맞게 조정
      const sourceX = cropArea.x * scaleX;
      const sourceY = cropArea.y * scaleY;
      const sourceWidth = cropArea.width * scaleX;
      const sourceHeight = cropArea.height * scaleY;

      // 크롭된 이미지의 크기로 canvas 설정
      // OCR 정확도를 위해 해상도를 높게 유지
      const minResolution = 600; // 최소 600px로 증가 (더 높은 해상도)
      let outputWidth = sourceWidth;
      let outputHeight = sourceHeight;
      
      // 항상 충분한 해상도 보장
      if (sourceWidth < minResolution || sourceHeight < minResolution) {
        // 작은 이미지는 확대 (비율 유지)
        const scale = Math.max(minResolution / sourceWidth, minResolution / sourceHeight);
        outputWidth = Math.round(sourceWidth * scale);
        outputHeight = Math.round(sourceHeight * scale);
      } else {
        // 이미 충분히 크면 약간 확대하여 더 선명하게
        outputWidth = Math.round(sourceWidth * 1.2);
        outputHeight = Math.round(sourceHeight * 1.2);
      }
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // 고품질 렌더링 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 원본 이미지에서 선택된 영역만 추출
      ctx.drawImage(
        imageElement,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );
    } else {
      // HTMLCanvasElement인 경우 - 이미 원본 크기이므로 그대로 사용
      // 최소 해상도 보장
      const minResolution = 600;
      let outputWidth = cropArea.width;
      let outputHeight = cropArea.height;
      
      if (cropArea.width < minResolution || cropArea.height < minResolution) {
        const scale = Math.max(minResolution / cropArea.width, minResolution / cropArea.height);
        outputWidth = Math.round(cropArea.width * scale);
        outputHeight = Math.round(cropArea.height * scale);
      } else {
        outputWidth = Math.round(cropArea.width * 1.2);
        outputHeight = Math.round(cropArea.height * 1.2);
      }
      
      canvas.width = outputWidth;
      canvas.height = outputHeight;

      // 고품질 렌더링 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        imageElement,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        outputWidth,
        outputHeight
      );
    }

    // Canvas를 Blob으로 변환
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/png');
  });
}

