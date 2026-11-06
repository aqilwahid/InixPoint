import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
}

export async function renderPdfToImages(
  file: File,
  maxPages = 100,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const total = Math.min(pdfDoc.numPages, maxPages);
  const pages: RenderedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    // Render at scale 1.5 for crisp projection clarity while keeping payload reasonable
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
    });

    if (onProgress) {
      onProgress(pageNum, total);
    }
  }

  return pages;
}
