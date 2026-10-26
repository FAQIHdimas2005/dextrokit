import { isHeicFile } from "./image-converter";

/** The segmentation model runs on a downscaled copy, so multi-hundred-MB
 * sources are never useful — they only risk exhausting browser memory. */
export const MAX_BG_SOURCE_BYTES = 50 * 1024 * 1024;

export interface BgRemovalProgressCallback {
  (progress: number, status: string): void;
}

export async function removeImageBackground(
  file: File,
  onProgress?: BgRemovalProgressCallback
): Promise<Blob> {
  if (file.size > MAX_BG_SOURCE_BYTES) {
    throw new Error(
      "This image is larger than 50 MB. Please resize or compress it before removing the background.",
    );
  }

  let sourceBlob: Blob = file;

  // Handle Apple HEIC photos
  if (isHeicFile(file)) {
    if (onProgress) {
      onProgress(5, "Converting Apple HEIC photo...");
    }
    try {
      const heic2any = (await import("heic2any")).default;
      const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
      sourceBlob = Array.isArray(converted) ? converted[0] : converted;
    } catch (err) {
      console.error(err);
      throw new Error("Couldn't read this iPhone HEIC photo.");
    }
  }

  if (onProgress) {
    onProgress(10, "Initializing the AI segmentation model...");
  }

  const { removeBackground } = await import("@imgly/background-removal");

  const config = {
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      if (total > 0) {
        const pct = Math.min(100, Math.round((current / total) * 100));
        if (key.includes("fetch")) {
          onProgress(
            Math.min(65, Math.round(10 + pct * 0.55)),
            `Downloading the AI model to your browser cache (${pct}%)...`
          );
        } else {
          onProgress(
            Math.min(99, Math.round(65 + pct * 0.34)),
            `Separating the subject from the background (${pct}%)...`
          );
        }
      }
    },
    output: {
      format: "image/png" as const,
      quality: 0.95,
    },
  };

  const resultBlob = await removeBackground(sourceBlob, config);

  if (onProgress) {
    onProgress(95, "Refining subject sharpness and opacity...");
  }

  const finalBlob = await ensureOpaqueForeground(resultBlob);

  if (onProgress) {
    onProgress(100, "Background removed!");
  }

  return finalBlob;
}

/**
 * Keeps the subject from looking ghostly when the model returns low alpha
 * values on illustration-style or dimly lit images.
 */
async function ensureOpaqueForeground(blob: Blob): Promise<Blob> {
  if (typeof window === "undefined") return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Sample foreground alpha (> 15) to detect washed-out subjects
      let maxAlpha = 0;
      const step = Math.max(1, Math.floor(data.length / (4 * 10000)));
      const samples: number[] = [];
      for (let i = 3; i < data.length; i += 4 * step) {
        const a = data[i];
        if (a > 15) {
          samples.push(a);
          if (a > maxAlpha) maxAlpha = a;
        }
      }

      if (samples.length === 0) {
        resolve(blob);
        return;
      }

      samples.sort((a, b) => a - b);
      const p90 = samples[Math.floor(samples.length * 0.9)];

      // If p90 is below 220, boost alpha so the subject stays solid instead of
      // letting the background show through.
      if (p90 < 220 && p90 > 0) {
        const factor = 255 / p90;
        for (let i = 3; i < data.length; i += 4) {
          const a = data[i];
          if (a < 15) {
            data[i] = 0;
          } else {
            data[i] = Math.min(255, Math.round(a * factor));
          }
        }
        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob((enhancedBlob) => {
          resolve(enhancedBlob || blob);
        }, "image/png");
      } else {
        resolve(blob);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}
