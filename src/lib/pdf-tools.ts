import { PDFDocument, PageSizes } from "pdf-lib";
import { convertSingleImage, isHeicFile } from "./image-converter";

export type ImageToPdfOrientation = "auto" | "portrait" | "landscape";
export type ImageToPdfMargin = "none" | "small" | "standard";

/** Practical in-browser limits; PDFs are assembled entirely in page memory. */
export const MAX_PDF_FILES = 50;
export const MAX_PDF_FILE_BYTES = 100 * 1024 * 1024;

export interface ImageToPdfOptions {
  orientation: ImageToPdfOrientation;
  margin: ImageToPdfMargin;
}

function assertFileBudget(files: File[]) {
  if (files.length > MAX_PDF_FILES) {
    throw new Error(
      `You selected ${files.length} files. Please process at most ${MAX_PDF_FILES} at a time to keep the tab stable.`,
    );
  }

  const oversized = files.find((file) => file.size > MAX_PDF_FILE_BYTES);
  if (oversized) {
    throw new Error(
      `"${oversized.name}" is larger than 100 MB. Compress it first, then try again.`,
    );
  }
}

export async function mergePdfFiles(
  files: File[],
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error("No PDF files were selected.");
  }

  assertFileBudget(files);

  const mergedPdf = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(
        Math.round((i / total) * 100),
        `Reading and merging PDF ${i + 1} of ${total}: ${file.name}...`
      );
    }

    try {
      const fileBytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (err) {
      console.error(`Failed to read ${file.name}:`, err);
      throw new Error(
        `"${file.name}" couldn't be read. The file may be corrupted or password-protected.`,
      );
    }
  }

  if (onProgress) {
    onProgress(95, "Assembling and rendering the merged PDF...");
  }

  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export async function convertImagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error("No images were selected.");
  }

  assertFileBudget(files);

  const pdfDoc = await PDFDocument.create();
  const total = files.length;

  // Margin in points (72 points = 1 inch)
  let marginPt = 0;
  if (options.margin === "small") marginPt = 18; // 0.25 inch
  if (options.margin === "standard") marginPt = 36; // 0.5 inch

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(
        Math.round((i / total) * 100),
        `Processing image ${i + 1} of ${total}: ${file.name}...`
      );
    }

    let imageBytes: ArrayBuffer;
    let isPng = file.type === "image/png";

    // If file is HEIC, WebP, BMP, or not pure JPEG/PNG, convert it via canvas first
    if (
      isHeicFile(file) ||
      file.type === "image/webp" ||
      file.type === "image/bmp" ||
      file.type === "image/gif" ||
      (!isPng && file.type !== "image/jpeg")
    ) {
      const converted = await convertSingleImage(file, {
        targetFormat: "jpeg",
        quality: 0.9,
      });
      imageBytes = await converted.blob.arrayBuffer();
      isPng = false;
    } else {
      imageBytes = await file.arrayBuffer();
    }

    // Embed image
    let embeddedImage;
    if (isPng) {
      try {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } catch {
        // Fallback: If PNG embed fails (e.g. malformed chunks), convert to JPEG and embed
        const converted = await convertSingleImage(file, {
          targetFormat: "jpeg",
          quality: 0.9,
        });
        embeddedImage = await pdfDoc.embedJpg(await converted.blob.arrayBuffer());
      }
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    // Determine Page Size & Orientation
    let pageWidth: number;
    let pageHeight: number;

    if (options.orientation === "portrait") {
      pageWidth = PageSizes.A4[0];
      pageHeight = PageSizes.A4[1];
    } else if (options.orientation === "landscape") {
      pageWidth = PageSizes.A4[1];
      pageHeight = PageSizes.A4[0];
    } else {
      // Auto: follow image aspect ratio
      if (imgWidth > imgHeight) {
        pageWidth = PageSizes.A4[1];
        pageHeight = PageSizes.A4[0];
      } else {
        pageWidth = PageSizes.A4[0];
        pageHeight = PageSizes.A4[1];
      }
    }

    // Calculate scaled dimensions fitting within margin
    const availWidth = pageWidth - marginPt * 2;
    const availHeight = pageHeight - marginPt * 2;

    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;

    // Center image on the page
    const x = marginPt + (availWidth - renderWidth) / 2;
    const y = marginPt + (availHeight - renderHeight) / 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  if (onProgress) {
    onProgress(95, "Building the final PDF pages...");
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
