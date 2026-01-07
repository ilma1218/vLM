/**
 * PDF를 Canvas로 변환하는 유틸리티
 */

import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * PDF의 첫 페이지를 Canvas로 렌더링
 */
export async function renderPdfFirstPageToCanvas(
  file: File
): Promise<HTMLCanvasElement> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1); // 첫 페이지

  // 원본 크기로 렌더링 (scale: 1.0 = 72 DPI, PDF의 기본 크기)
  const viewport = page.getViewport({ scale: 1.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas context not available');
  }

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return canvas;
}

/**
 * PDF의 모든 페이지를 Canvas 배열로 렌더링
 */
export async function renderPdfAllPagesToCanvases(
  file: File
): Promise<HTMLCanvasElement[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // 원본 크기로 렌더링 (scale: 1.0 = 72 DPI, PDF의 기본 크기)
  const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas context not available');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    canvases.push(canvas);
  }

  return canvases;
}

/**
 * PDF의 총 페이지 수 반환
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  return pdf.numPages;
}

