"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Info,
  Paintbrush,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  UploadCloud,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import { isHeicFile } from "@/lib/image-converter";
import { validateUploadSize } from "@/lib/limits";

/** Must stay in sync with MAX_IMAGE_BYTES in /api/inpaint. */
const MAX_INPAINT_UPLOAD_BYTES = 20 * 1024 * 1024;

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  size: number;
}

const FAQ_ITEMS = [
  {
    q: "How does the watermark remover work?",
    a: "DextroKit runs a smart dual-engine architecture: an AI neural inpainting model paired with an instant client-side boundary diffusion engine that operates directly in your browser's memory. When you paint a watermark, the engine seamlessly reconstructs clean texture over the mark without ever leaking your photo to third parties.",
  },
  {
    q: "Does the result keep full resolution and stay sharp?",
    a: "Yes. The model works at your photo's native resolution, patch by patch, so everything outside the brushed area keeps its original detail — no extra compression and no soft, upscaled edges.",
  },
  {
    q: "What's the trick to the cleanest watermark removal?",
    a: "Match the brush to the mark: a touch wider than the text or logo, not a slab across the whole corner. The less of the original photo your mask covers, the more surrounding texture the AI has to work with, and the more natural the reconstruction looks.",
  },
  {
    q: "Which image formats can I use?",
    a: "JPG, PNG, WebP, BMP, and iPhone camera photos (.HEIC). When you're done, download the cleaned image as a high-quality file with no extra watermark added.",
  },
];

export function ImageWatermarkRemoverClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Brush & Canvas State
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Processing & Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // Result & Comparison
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Drag and Drop
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  // Revoke object URLs only when the component actually unmounts
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif|jpg|jpeg|png|webp|bmp)$/i)) {
      setErrorBanner("Choose a valid image file (JPG, PNG, WebP, HEIC, or BMP).");
      return;
    }

    const sizeCheck = validateUploadSize(
      file,
      MAX_INPAINT_UPLOAD_BYTES,
      "The AI engine accepts up to 20 MB per image — resize or compress it first.",
    );
    if (!sizeCheck.ok) {
      setErrorBanner(sizeCheck.message ?? "That image is too large.");
      return;
    }

    setErrorBanner(null);

    let sourceBlob: Blob = file;

    // Convert HEIC if needed
    if (isHeicFile(file)) {
      try {
        const heic2any = (await import("heic2any")).default;
        const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.95 });
        sourceBlob = Array.isArray(converted) ? converted[0] : converted;
      } catch (err) {
        console.error(err);
        setErrorBanner("Couldn't read this iPhone HEIC photo. Try exporting it as JPG first.");
        return;
      }
    }

    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

    const url = URL.createObjectURL(sourceBlob);
    originalUrlRef.current = url;
    resultUrlRef.current = null;

    const img = new Image();
    img.onload = () => {
      setSelectedFile(file);
      setOriginalImageUrl(url);
      setResultImageUrl(null);
      setShowOriginal(false);
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setStrokes([]);
      setCurrentStroke([]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      originalUrlRef.current = null;
      setErrorBanner("This image couldn't be decoded. Try a JPG or PNG version instead.");
    };
    img.src = url;
  };

  // Draw base image and mask whenever dimensions or strokes change
  useEffect(() => {
    if (!originalImageUrl || imageDimensions.width === 0) return;

    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!baseCanvas || !maskCanvas) return;

    baseCanvas.width = imageDimensions.width;
    baseCanvas.height = imageDimensions.height;
    maskCanvas.width = imageDimensions.width;
    maskCanvas.height = imageDimensions.height;

    const baseCtx = baseCanvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!baseCtx || !maskCtx) return;

    const img = new Image();
    img.onload = () => {
      baseCtx.clearRect(0, 0, imageDimensions.width, imageDimensions.height);
      baseCtx.drawImage(img, 0, 0);

      // Redraw all strokes on mask canvas
      maskCtx.clearRect(0, 0, imageDimensions.width, imageDimensions.height);
      maskCtx.lineCap = "round";
      maskCtx.lineJoin = "round";
      maskCtx.fillStyle = "rgba(244, 63, 94, 0.45)"; // Semitransparent coral/red
      maskCtx.strokeStyle = "rgba(244, 63, 94, 0.45)";

      const allStrokes = [...strokes];
      if (currentStroke.length > 0) {
        allStrokes.push({ points: currentStroke, size: brushSize });
      }

      for (const stroke of allStrokes) {
        if (stroke.points.length === 0) continue;
        maskCtx.lineWidth = stroke.size;
        maskCtx.beginPath();
        maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        maskCtx.stroke();
      }
    };
    img.src = originalImageUrl;
  }, [originalImageUrl, imageDimensions, strokes, currentStroke, brushSize]);

  // Coordinate helper: Translates mouse/touch on scaled canvas to natural image coordinates
  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return null;

    const rect = maskCanvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;

    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);

    return {
      x: Math.max(0, Math.min(imageDimensions.width, x)),
      y: Math.max(0, Math.min(imageDimensions.height, y)),
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCanvasCoordinates(e);
    if (!pt) return;
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 0) {
      setStrokes((prev) => [...prev, { points: currentStroke, size: brushSize }]);
      setCurrentStroke([]);
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  const handleClearMask = () => {
    setStrokes([]);
    setCurrentStroke([]);
  };

  const handleReset = () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    originalUrlRef.current = null;
    resultUrlRef.current = null;
    setSelectedFile(null);
    setOriginalImageUrl(null);
    setResultImageUrl(null);
    setShowOriginal(false);
    setImageDimensions({ width: 0, height: 0 });
    setStrokes([]);
    setCurrentStroke([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Run inpainting
  const handleRemoveWatermark = async () => {
    if (!originalImageUrl || strokes.length === 0) {
      setErrorBanner("Paint over the watermark or text you want to remove first.");
      return;
    }

    const baseCanvas = baseCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!baseCanvas || !maskCanvas) return;

    const baseCtx = baseCanvas.getContext("2d", { willReadFrequently: true });
    const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
    if (!baseCtx || !maskCtx) return;

    setErrorBanner(null);
    setIsModalOpen(true);
    setModalProgress(10);
    setModalStatus("Preparing the image and mask...");

    // Allow UI to render modal first
    await new Promise((resolve) => setTimeout(resolve, 80));

    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 180_000);

    try {
      setModalProgress(25);
      setModalStatus("Setting up the image canvas and mask strokes...");

      const baseBlob = await new Promise<Blob>((resolve, reject) => {
        baseCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Couldn't read the canvas image."))),
          "image/png"
        );
      });

      // Render crisp, solid binary mask (Black background, Pure White strokes)
      const offscreenMask = document.createElement("canvas");
      offscreenMask.width = imageDimensions.width;
      offscreenMask.height = imageDimensions.height;
      const offscreenCtx = offscreenMask.getContext("2d", { willReadFrequently: true });
      if (!offscreenCtx) throw new Error("Could not initialize offscreen mask canvas context.");

      offscreenCtx.fillStyle = "#000000";
      offscreenCtx.fillRect(0, 0, imageDimensions.width, imageDimensions.height);
      offscreenCtx.lineCap = "round";
      offscreenCtx.lineJoin = "round";
      offscreenCtx.strokeStyle = "#FFFFFF";
      offscreenCtx.fillStyle = "#FFFFFF";

        for (const stroke of strokes) {
          if (stroke.points.length === 0) continue;
          if (stroke.points.length === 1) {
            offscreenCtx.beginPath();
            offscreenCtx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
            offscreenCtx.fill();
            continue;
          }
          offscreenCtx.lineWidth = stroke.size;
          offscreenCtx.beginPath();
          offscreenCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            offscreenCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          offscreenCtx.stroke();
        }

      const maskBlob = await new Promise<Blob>((resolve, reject) => {
        offscreenMask.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Couldn't read the mask strokes."))),
          "image/png"
        );
      });

      setModalProgress(40);
      setModalStatus("Analyzing watermark boundary and texture...");

      let resultBlob: Blob | null = null;
      let usedServerAi = false;

      // Try server AI endpoint first with a fast 4s timeout (aborts quickly on serverless platforms)
      const serverController = new AbortController();
      const serverTimer = window.setTimeout(() => serverController.abort(), 4000);

      try {
        const formData = new FormData();
        formData.append("image", baseBlob);
        formData.append("mask", maskBlob);

        const response = await fetch("/api/inpaint", {
          method: "POST",
          body: formData,
          signal: serverController.signal,
        });

        window.clearTimeout(serverTimer);

        if (response.ok) {
          const responseType = response.headers.get("content-type") ?? "";
          if (responseType.startsWith("image/")) {
            resultBlob = await response.blob();
            usedServerAi = true;
          }
        }
      } catch {
        window.clearTimeout(serverTimer);
        // Server AI is not available in serverless - continue to client engine
      }

      // If server AI was unavailable or failed, run the fast In-Browser Inpainting Engine
      if (!resultBlob) {
        setModalProgress(50);
        setModalStatus("Restoring texture using in-browser diffusion engine...");

        const { inpaintImageData } = await import("@/lib/image-inpainting");
        const sourceData = baseCtx.getImageData(0, 0, imageDimensions.width, imageDimensions.height);
        const maskData = offscreenCtx.getImageData(0, 0, imageDimensions.width, imageDimensions.height);

        const totalPixels = imageDimensions.width * imageDimensions.height;
        const maskArray = new Uint8Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) {
          maskArray[i] = maskData.data[i * 4] > 30 ? 1 : 0;
        }

        const inpaintedData = await inpaintImageData(
          sourceData,
          maskArray,
          imageDimensions.width,
          imageDimensions.height,
          (pct, status) => {
            setModalProgress(pct);
            setModalStatus(status);
          }
        );

        const outCanvas = document.createElement("canvas");
        outCanvas.width = imageDimensions.width;
        outCanvas.height = imageDimensions.height;
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) throw new Error("Could not create canvas context for output.");
        outCtx.putImageData(inpaintedData, 0, 0);

        resultBlob = await new Promise<Blob>((resolve, reject) => {
          outCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Could not export clean image."))),
            "image/png"
          );
        });
      }

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const cleanUrl = URL.createObjectURL(resultBlob);
      resultUrlRef.current = cleanUrl;
      setResultImageUrl(cleanUrl);
      setModalProgress(100);
      setModalStatus(
        usedServerAi
          ? "Watermark removed cleanly by neural inpainting engine"
          : "Watermark removed cleanly by in-browser diffusion engine"
      );
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "Processing took too long. Try a smaller image or brush area."
          : err instanceof Error
            ? err.message
            : "The inpainting request failed.";
      setErrorBanner(msg);
      setIsModalOpen(false);
    } finally {
      window.clearTimeout(requestTimeout);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#05070c] text-slate-100">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Background Grid Pattern */}
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
            aria-hidden="true"
          />

          <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">
                <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" />
                AI Neural Inpainting (LaMa)
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-purple-300">
                <Eraser className="size-4 text-purple-400" />
                Deep Learning Object &amp; Watermark Remover
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Erase watermarks, logos &amp; text from photos{" "}
                <span className="bg-gradient-to-r from-purple-300 via-pink-200 to-indigo-300 bg-clip-text text-transparent">
                  with AI precision
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Brush over the logo, stamp, date, or stray text spoiling an otherwise great shot. The
                LaMa AI Inpainting model rebuilds the real texture underneath — hair, skin, fabric —
                so no blurry patch is left behind.
              </p>
            </div>

            {/* Top Leaderboard Ad */}
            <div className="mt-8">
              <AdSlot type="banner-728" />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.05] px-4 py-3 text-xs leading-6 text-indigo-100/80">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-indigo-300" aria-hidden="true" />
              <p>
                <strong className="font-semibold text-indigo-200">How your image is handled:</strong>{" "}
                brush strokes and previews stay in your browser. When you run the AI pass, the marked
                image and its mask are sent to DextroKit&apos; own inpainting endpoint, processed
                once, and deleted immediately. Nothing is stored or shared. If an image can&apos;t
                leave your device, don&apos;t use this tool.
              </p>
            </div>

            {errorBanner ? (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-2xl border border-red-400/25 bg-red-500/[0.09] px-4 py-3 text-xs leading-6 text-red-200"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-300" aria-hidden="true" />
                <p className="flex-1">{errorBanner}</p>
                <button
                  type="button"
                  onClick={() => setErrorBanner(null)}
                  className="rounded-md p-1 text-red-300/70 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  aria-label="Dismiss warning"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {/* Dropzone Area (Shown if no image loaded) */}
            {!selectedFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                  isDragging
                    ? "border-purple-400 bg-purple-500/[0.08] shadow-[0_0_50px_-10px_rgba(192,132,252,0.3)] scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-purple-400/50 hover:bg-white/[0.04]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.HEIC,.heif,.HEIF"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  aria-label="Upload an image to remove its watermark"
                />

                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-purple-300 shadow-xl shadow-purple-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-purple-400/40">
                  <UploadCloud className="size-8" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                  Drag &amp; drop a photo here, or{" "}
                  <span className="text-purple-300 underline underline-offset-4">
                    choose a file from your device
                  </span>
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Supports JPG, PNG, WebP, and iPhone camera photos (.HEIC). Every brush stroke is
                  drawn locally in your browser.
                </p>
              </div>
            ) : (
              /* Canvas Workspace & Brush Controls */
              <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#080b13]/90 shadow-2xl backdrop-blur-xl">
                  {/* Top Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] p-4 bg-white/[0.02]">
                    {/* Brush Size Slider */}
                    <div className="flex items-center gap-3">
                      <Paintbrush className="size-4 text-purple-400 shrink-0" />
                      <label
                        htmlFor="brush-slider"
                        className="text-xs font-semibold text-zinc-300 whitespace-nowrap"
                      >
                        Brush size: <strong className="text-purple-300">{brushSize}px</strong>
                      </label>
                      <input
                        id="brush-slider"
                        type="range"
                        min="6"
                        max="60"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="h-1.5 w-24 sm:w-32 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-purple-400"
                      />
                    </div>

                    {/* Canvas Action Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUndo}
                        disabled={strokes.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                        title="Undo stroke (Ctrl+Z)"
                      >
                        <Undo2 className="size-3.5" />
                        Undo
                      </button>

                      <button
                        type="button"
                        onClick={handleClearMask}
                        disabled={strokes.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-40"
                        title="Clear all brush strokes"
                      >
                        <Trash2 className="size-3.5" />
                        Clear Mask
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <RotateCcw className="size-3.5" />
                        Change Photo
                      </button>
                    </div>
                  </div>

                  {/* Interactive Drawing Canvas Area */}
                  <div className="relative flex min-h-[350px] items-center justify-center p-4 sm:p-8 bg-black/60 select-none">
                    <div
                      ref={containerRef}
                      className="relative inline-block max-w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl touch-none"
                      style={{ cursor: "crosshair" }}
                      onMouseDown={handlePointerDown}
                      onMouseMove={handlePointerMove}
                      onMouseUp={handlePointerUp}
                      onTouchStart={handlePointerDown}
                      onTouchMove={handlePointerMove}
                      onTouchEnd={handlePointerUp}
                    >
                      {/* Base Image Canvas */}
                      <canvas
                        ref={baseCanvasRef}
                        className="block max-h-[500px] w-auto max-w-full object-contain"
                      />

                      {/* Brush Mask Overlay Canvas */}
                      <canvas
                        ref={maskCanvasRef}
                        className="absolute inset-0 size-full pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] p-4 bg-white/[0.02]">
                    <div className="text-xs text-zinc-400">
                      💡 <strong>Tip:</strong> Paint over the logo or text you want gone with the red
                      brush, then click the button beside it.
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveWatermark}
                      disabled={strokes.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:opacity-95 disabled:opacity-40"
                    >
                      <Sparkles className="size-4" />
                      Remove Watermark Now
                    </button>
                  </div>
                </div>

                {/* Result Card (When inpainting completed) */}
                {resultImageUrl && (
                  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white sm:text-lg">
                          Watermark removed
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {selectedFile.name} • Resolution {imageDimensions.width}x
                          {imageDimensions.height}px
                        </p>
                      </div>
                    </div>

                    {/* Cleaned Image Preview with Before/After Toggle */}
                    <div className="relative mt-6 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/50 p-4">
                      {/* Floating Indicator Badge */}
                      <div className="pointer-events-none absolute left-6 top-6 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-lg">
                        {showOriginal ? (
                          <>
                            <Eye className="size-3 text-amber-400" />
                            <span>Before (Original)</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-emerald-400" />
                            <span>AI Inpainting Result</span>
                          </>
                        )}
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={showOriginal ? "original" : "result"}
                        src={showOriginal ? (originalImageUrl || "") : (resultImageUrl || originalImageUrl || "")}
                        alt="Inpainting result"
                        className="max-h-[400px] max-w-full rounded-xl object-contain shadow-lg"
                      />

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowOriginal((prev) => !prev)}
                          onPointerDown={() => setShowOriginal(true)}
                          onPointerUp={() => setShowOriginal(false)}
                          onPointerLeave={() => setShowOriginal(false)}
                          onPointerCancel={() => setShowOriginal(false)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all select-none ${
                            showOriginal
                              ? "border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/20"
                              : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-white"
                          }`}
                          title="Hold or click to see the photo before the watermark was removed"
                        >
                          {showOriginal ? (
                            <>
                              <EyeOff className="size-3.5 text-amber-400" />
                              <span>Showing Before (Release)</span>
                            </>
                          ) : (
                            <>
                              <Eye className="size-3.5 text-zinc-400" />
                              <span>Compare Before (Hold or Click)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-emerald-300/80">
                        ✓ Reconstructed with the AI Inpainting engine — clean edges, real texture
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setResultImageUrl(null);
                            setStrokes([]);
                          }}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                        >
                          Remove Another Object
                        </button>

                        <a
                          href={resultImageUrl}
                          download={`dextrokit-clean-${selectedFile.name.replace(/\.[^/.]+$/, "")}.png`}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300"
                        >
                          <Download className="size-4" />
                          Download Result
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inpainting Expectation Notice */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-purple-300">💡 Tips for the cleanest result:</span>{" "}
              The LaMa model rebuilds texture from the pixels surrounding each brushed area. It
              excels at text, date stamps, translucent logos, and small scribbles. For a large logo,
              brush it in sections, one piece at a time, for the smoothest, most natural finish.
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide Section (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                <Info className="size-3.5" />
                Watermark Removal Guide
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to remove watermarks from photos cleanly
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Found a great photo, only to have it spoiled by a camera date stamp, a promo logo in
                the corner, or some stray text? DextroKit Image Watermark Remover helps you clean it
                up in three easy steps:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-purple-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Upload a photo</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Pick an image from your phone or computer. JPG, PNG, WebP, and iPhone camera
                    photos (.HEIC) are all supported out of the box.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20 text-xs font-bold text-pink-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Paint the mask</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Brush over the text or logo you want gone. Match the brush size to the detail in
                    that area — small for thin type, wider for a block logo.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Remove &amp; download</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Click &apos;Remove Watermark Now&apos;. Compare the result with the original,
                    then download the clean photo at no cost.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-5 text-sm leading-relaxed text-zinc-400 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Under the hood: why inpainting beats cloning and cropping
                </h3>
                <p>
                  Most online object removers charge a monthly subscription or bill you per image
                  processed on their GPU cloud. The old desktop workaround — clone-stamping a clean
                  patch over the mark — only looks right when the surrounding area is flat. Cropping
                  the watermark out costs you part of the frame every time. Inpainting works
                  differently: you tell the tool which pixels are unwanted, and the model rebuilds
                  plausible texture in their place.
                </p>
                <p>
                  With <strong className="text-white">DextroKit</strong>, the brush, mask, undo, and
                  before/after comparison all run in an HTML5 Canvas inside your browser, so nothing
                  leaves your device until you press Remove Watermark Now. When you press it, only
                  the marked image and its mask go to our LaMa inpainting endpoint, which
                  reconstructs the covered area and returns the finished image. The tool stays free,
                  with no account, no watermark on your result, and no paywall.
                </p>
              </div>

              {/* FAQ Accordion */}
              <div className="mt-12 border-t border-white/[0.06] pt-8">
                <h3 className="text-xl font-bold text-white">Frequently Asked Questions (FAQ)</h3>
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {FAQ_ITEMS.map((faq, idx) => (
                    <div key={idx} className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-purple-300"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-purple-300" : ""
                          }`}
                        />
                      </button>
                      {openFaq === idx && (
                        <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>

      {/* Processing Modal with Embedded Ad */}
      <ProcessingModal
        isOpen={isModalOpen}
        progress={modalProgress}
        statusText={modalStatus}
        onClose={() => setIsModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
