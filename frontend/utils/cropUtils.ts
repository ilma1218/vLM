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

    // 크롭 영역 크기로 canvas 설정
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    // 원본 이미지를 canvas에 그리고, 선택된 영역만 추출
    if (imageElement instanceof HTMLImageElement) {
      ctx.drawImage(
        imageElement,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
      );
    } else {
      // HTMLCanvasElement인 경우
      ctx.drawImage(
        imageElement,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
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

