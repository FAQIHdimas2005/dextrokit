import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

/**
 * Single-threaded FFmpeg core, loaded once per tab and shared by every video
 * tool. Single-threaded mode avoids the SharedArrayBuffer/COOP+COEP requirement
 * and works on every modern browser, including iOS Safari.
 */
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

export type VideoTargetFormat = "mp4" | "webm" | "mkv" | "mov" | "gif";
export type CompressionLevel = "low" | "medium" | "high";
export type TargetResolution = "original" | "1080p" | "720p" | "480p";

/** Browser memory is the real limit: a 500 MB video needs ~1.5 GB to transcode. */
export const MAX_VIDEO_SOURCE_BYTES = 500 * 1024 * 1024;

export interface VideoProcessingOptions {
  format: VideoTargetFormat;
  compression: CompressionLevel;
  resolution: TargetResolution;
  removeAudio?: boolean;
}

export interface VideoProcessingResult {
  blob: Blob;
  url: string;
  fileName: string;
  format: VideoTargetFormat;
  originalSize: number;
  convertedSize: number;
}

/** Stop the WASM worker and force a clean reload on the next job. */
export function terminateFFmpeg() {
  ffmpegLoadPromise = null;
  if (!ffmpegInstance) return;
  try {
    ffmpegInstance.terminate();
  } catch {
    // Already terminated or never started — nothing to clean up.
  }
  ffmpegInstance = null;
}

function assertVideoBudget(file: File) {
  if (file.size > MAX_VIDEO_SOURCE_BYTES) {
    throw new Error(
      "This video is larger than 500 MB. Browser memory can't hold a file that big — please trim or compress it first.",
    );
  }
}

/** Only a short, safe extension ever reaches the FFmpeg virtual filesystem. */
function safeExtension(fileName: string, fallback = "mp4"): string {
  const raw = fileName.includes(".")
    ? fileName.substring(fileName.lastIndexOf(".") + 1)
    : "";
  const sanitized = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return sanitized || fallback;
}

export async function loadSingleThreadFFmpeg(
  onProgress?: (progress: number, status: string) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  // Concurrent calls (two tools mounted at once) must share one load.
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  const load = async (): Promise<FFmpeg> => {
    const ffmpeg = new FFmpeg();

    if (onProgress) {
      onProgress(10, "Initializing the FFmpeg WebAssembly engine...");
    }

    const isBrowser = typeof window !== "undefined";
    const origin = isBrowser ? window.location.origin : "";

    // Load strategy order:
    // 1. Direct same-origin URL (compatible with Brave Shields; no blob overhead)
    // 2. Blob URL from local /public/ffmpeg/esm/
    // 3. Blob URL from local /public/ffmpeg/umd/
    // 4. jsDelivr CDN ESM fallback
    // 5. unpkg CDN UMD fallback
    const loadStrategies = [
      {
        label: "local direct URL",
        execute: () =>
          ffmpeg.load({
            coreURL: `${origin}/ffmpeg/esm/ffmpeg-core.js`,
            wasmURL: `${origin}/ffmpeg/esm/ffmpeg-core.wasm`,
          }),
      },
      {
        label: "local blob URL",
        execute: async () =>
          ffmpeg.load({
            coreURL: await toBlobURL(`${origin}/ffmpeg/esm/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${origin}/ffmpeg/esm/ffmpeg-core.wasm`, "application/wasm"),
          }),
      },
      {
        label: "local UMD blob",
        execute: async () =>
          ffmpeg.load({
            coreURL: await toBlobURL(`${origin}/ffmpeg/umd/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${origin}/ffmpeg/umd/ffmpeg-core.wasm`, "application/wasm"),
          }),
      },
      {
        label: "jsDelivr ESM CDN",
        execute: async () =>
          ffmpeg.load({
            coreURL: await toBlobURL(
              "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
              "text/javascript"
            ),
            wasmURL: await toBlobURL(
              "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
              "application/wasm"
            ),
          }),
      },
      {
        label: "unpkg UMD CDN",
        execute: async () =>
          ffmpeg.load({
            coreURL: await toBlobURL(
              "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
              "text/javascript"
            ),
            wasmURL: await toBlobURL(
              "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm",
              "application/wasm"
            ),
          }),
      },
    ];

    let lastError: unknown = null;

    for (const strategy of loadStrategies) {
      try {
        if (onProgress) {
          onProgress(15, `Loading the FFmpeg engine (${strategy.label})...`);
        }
        await strategy.execute();
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (err) {
        console.warn(`[FFmpeg] Failed to load from ${strategy.label}:`, err);
        lastError = err;
      }
    }

    const detail = lastError instanceof Error ? lastError.message : String(lastError || "");
    console.error("FFmpeg failed to load from every strategy:", lastError);
    throw new Error(
      `The video engine couldn't start. Check your connection and try again.${detail ? ` (${detail.slice(0, 160)})` : ""}`,
    );
  };

  ffmpegLoadPromise = load().catch((error) => {
    ffmpegLoadPromise = null;
    throw error;
  });

  return ffmpegLoadPromise;
}

export async function processVideoFile(
  file: File,
  options: VideoProcessingOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<VideoProcessingResult> {
  assertVideoBudget(file);

  const ffmpeg = await loadSingleThreadFFmpeg(onProgress);

  if (onProgress) {
    onProgress(25, `Reading ${file.name} into browser memory...`);
  }

  const ext = safeExtension(file.name);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputName = `input_${unique}.${ext}`;
  const outputExt = options.format;
  const outputName = `output_${unique}.${outputExt}`;

  // Write the file into the virtual FS
  const fileData = await fetchFile(file);
  await ffmpeg.writeFile(inputName, fileData);

  // Attach progress listener
  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) {
      const pct = Math.min(99, Math.max(30, Math.round(30 + progress * 68)));
      onProgress(pct, `Converting and compressing video (${Math.round(progress * 100)}%)...`);
    }
  };

  ffmpeg.on("progress", progressHandler);

  // Build the FFmpeg arguments
  const args: string[] = ["-i", inputName];

  // Video filters (resolution / GIF fps)
  const videoFilters: string[] = [];

  if (options.resolution === "1080p") {
    videoFilters.push("scale=-2:1080");
  } else if (options.resolution === "720p") {
    videoFilters.push("scale=-2:720");
  } else if (options.resolution === "480p") {
    videoFilters.push("scale=-2:480");
  }

  if (options.format === "gif") {
    // GIF optimization: 12 fps at 480 px wide
    videoFilters.push("fps=12,scale=480:-1:flags=lanczos");
    if (videoFilters.length > 0) {
      args.push("-vf", videoFilters.join(","));
    }
  } else {
    if (videoFilters.length > 0) {
      args.push("-vf", videoFilters.join(","));
    }

    // Codec & compression
    if (options.format === "mp4" || options.format === "mov") {
      args.push("-c:v", "libx264", "-preset", "ultrafast");

      // CRF: 23 (lighter compression / higher quality), 28 (medium), 34 (max savings)
      if (options.compression === "low") {
        args.push("-crf", "23");
      } else if (options.compression === "medium") {
        args.push("-crf", "28");
      } else {
        args.push("-crf", "34");
      }
    } else if (options.format === "webm") {
      args.push("-c:v", "libvpx-vp9", "-b:v", "0");
      if (options.compression === "low") {
        args.push("-crf", "28");
      } else if (options.compression === "medium") {
        args.push("-crf", "35");
      } else {
        args.push("-crf", "42");
      }
    }

    // Audio options
    if (options.removeAudio) {
      args.push("-an");
    } else {
      if (options.format === "webm") {
        args.push("-c:a", "libopus");
      } else {
        args.push("-c:a", "aac", "-b:a", "128k");
      }
    }
  }

  args.push(outputName);

  if (onProgress) {
    onProgress(30, "Running the compression and conversion job...");
  }

  try {
    await ffmpeg.exec(args);

    const outputData = await ffmpeg.readFile(outputName);
    const mimeTypes: Record<VideoTargetFormat, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mkv: "video/x-matroska",
      mov: "video/quicktime",
      gif: "image/gif",
    };

    const uint8Array = typeof outputData === "string" ? new TextEncoder().encode(outputData) : outputData;
    const blob = new Blob([uint8Array.buffer as ArrayBuffer], {
      type: mimeTypes[options.format] || "video/mp4",
    });

    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const fileName = `${baseName}.${outputExt}`;
    const resultUrl = URL.createObjectURL(blob);

    return {
      blob,
      url: resultUrl,
      fileName,
      format: options.format,
      originalSize: file.size,
      convertedSize: blob.size,
    };
  } finally {
    // Release the virtual files from WASM memory
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Already removed, or the worker was terminated mid-job.
    }
    ffmpeg.off("progress", progressHandler);
  }
}

export interface WatermarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type VideoWatermarkMode = "delogo" | "blur";

export async function removeVideoWatermark(
  file: File,
  box: WatermarkBox,
  mode: VideoWatermarkMode = "delogo",
  onProgress?: (progress: number, status: string) => void
): Promise<VideoProcessingResult> {
  assertVideoBudget(file);

  const ffmpeg = await loadSingleThreadFFmpeg(onProgress);

  if (onProgress) {
    onProgress(20, `Reading ${file.name}...`);
  }

  const ext = safeExtension(file.name);
  const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inputName = `input_delogo_${unique}.${ext}`;
  const outputName = `output_delogo_${unique}.mp4`;

  const fileData = await fetchFile(file);
  await ffmpeg.writeFile(inputName, fileData);

  const progressHandler = ({ progress }: { progress: number }) => {
    if (onProgress) {
      const pct = Math.min(99, Math.max(25, Math.round(25 + progress * 73)));
      onProgress(pct, `Masking the video watermark (${Math.round(progress * 100)}%)...`);
    }
  };

  ffmpeg.on("progress", progressHandler);

  // Sanitize coordinates so the filter string always receives valid integers.
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const w = Math.max(8, Math.floor(box.width));
  const h = Math.max(8, Math.floor(box.height));

  const blurLuma = Math.max(2, Math.min(12, Math.floor(Math.min(w, h) / 3)));
  const blurChroma = Math.max(1, Math.floor(blurLuma / 2));

  const filterString =
    mode === "blur"
      ? `split[v1][v2];[v1]crop=${w}:${h}:${x}:${y},boxblur=${blurLuma}:1:${blurChroma}:1[b];[v2][b]overlay=${x}:${y}`
      : `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;

  const args = [
    "-i",
    inputName,
    "-vf",
    filterString,
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "26",
    "-c:a",
    "copy",
    outputName,
  ];

  if (onProgress) {
    onProgress(30, "Applying the watermark filter...");
  }

  try {
    await ffmpeg.exec(args);

    const outputData = await ffmpeg.readFile(outputName);
    const uint8Array =
      typeof outputData === "string" ? new TextEncoder().encode(outputData) : outputData;
    const blob = new Blob([uint8Array.buffer as ArrayBuffer], {
      type: "video/mp4",
    });

    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const fileName = `${baseName}_nowatermark.mp4`;
    const resultUrl = URL.createObjectURL(blob);

    return {
      blob,
      url: resultUrl,
      fileName,
      format: "mp4",
      originalSize: file.size,
      convertedSize: blob.size,
    };
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Already cleaned up, or the worker was terminated mid-job.
    }
    ffmpeg.off("progress", progressHandler);
  }
}
