import * as pdfjsLib from 'pdfjs-dist';

// Use standard CDN minified worker for universal browser execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    isEvalSupported: false
  });

  const pdfDoc = await loadingTask.promise;
  const total = Math.min(pdfDoc.numPages, maxPages);
  const pages: RenderedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
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
