export type ImageOutputFormat = "jpeg" | "png" | "webp";

/**
 * Guardrail for in-browser decoding. Beyond roughly 50 megapixels a single
 * canvas can exceed the memory budget of mobile Safari and low-end Android
 * devices, which crashes the tab instead of failing gracefully.
 */
export const MAX_IMAGE_PIXELS = 50_000_000;

export const MAX_IMAGE_FILE_BYTES = 50 * 1024 * 1024;

export interface ImageConversionOptions {
  targetFormat: ImageOutputFormat;
  quality: number; // 0.1 to 1.0 (default 0.85)
}

export interface ConvertedImageResult {
  blob: Blob;
  url: string;
  fileName: string;
  format: ImageOutputFormat;
  originalSize: number;
  convertedSize: number;
  width: number;
  height: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}
export function getMimeType(format: ImageOutputFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}

export function getTargetExtension(format: ImageOutputFormat): string {
  switch (format) {
    case "jpeg":
      return "jpg";
    case "png":
      return "png";
    case "webp":
      return "webp";
  }
}

export function replaceExtension(fileName: string, newExt: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const baseName = lastDot === -1 ? fileName : fileName.substring(0, lastDot);
  return `${baseName}.${newExt}`;
}

export async function convertSingleImage(
  file: File,
  options: ImageConversionOptions
): Promise<ConvertedImageResult> {
  const { targetFormat, quality } = options;
  let sourceBlob: Blob = file;

  // 1. Handle Apple HEIC/HEIF using dynamic heic2any import
  if (isHeicFile(file)) {
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: Math.max(0.1, Math.min(1.0, quality)),
      });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error("Failed to decode HEIC file:", err);
      throw new Error(
        "This HEIC photo couldn't be converted. Check that the file isn't corrupted and try again.",
      );
    }
  }

  // 2. Load into HTML Image
  const objectUrl = URL.createObjectURL(sourceBlob);
  const img = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("This image format isn't supported, or the file is corrupted."));
      img.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (!width || !height) {
      throw new Error("The image has invalid dimensions.");
    }

    if (width * height > MAX_IMAGE_PIXELS) {
      const megapixels = Math.round((width * height) / 1_000_000);
      throw new Error(
        `This image is ${width} × ${height} (${megapixels} MP), which is above the 50 MP browser limit. Resize it first, then try again.`,
      );
    }

    // 3. Draw on Canvas
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Your browser couldn't create the canvas needed for conversion.");
    }

    // If target is JPEG, draw a white background first to avoid black transparency
    if (targetFormat === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    // 4. Export to Target MIME format
    const mimeType = getMimeType(targetFormat);
    const convertedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("The image couldn't be encoded into the selected format."));
          }
        },
        mimeType,
        quality
      );
    });

    const targetExt = getTargetExtension(targetFormat);
    const fileName = replaceExtension(file.name, targetExt);
    const resultUrl = URL.createObjectURL(convertedBlob);

    return {
      blob: convertedBlob,
      url: resultUrl,
      fileName,
      format: targetFormat,
      originalSize: file.size,
      convertedSize: convertedBlob.size,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createZipFromConvertedImages(
  items: { fileName: string; blob: Blob }[]
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Deduplicate file names if any
  const nameCounts = new Map<string, number>();

  for (const item of items) {
    let name = item.fileName;
    const count = nameCounts.get(name) || 0;
    if (count > 0) {
      const dotIndex = name.lastIndexOf(".");
      if (dotIndex !== -1) {
        name = `${name.substring(0, dotIndex)} (${count})${name.substring(dotIndex)}`;
      } else {
        name = `${name} (${count})`;
      }
    }
    nameCounts.set(item.fileName, count + 1);
    zip.file(name, item.blob);
  }

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
