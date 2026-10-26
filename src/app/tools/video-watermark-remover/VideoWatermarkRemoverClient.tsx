"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  EyeOff,
  Film,
  Info,
  Move,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import { formatFileSize } from "@/lib/image-converter";
import { formatDuration } from "@/lib/audio-extractor";
import { validateUploadSize } from "@/lib/limits";
import {
  MAX_VIDEO_SOURCE_BYTES,
  removeVideoWatermark,
  terminateFFmpeg,
  type VideoProcessingResult,
  type VideoWatermarkMode,
  type WatermarkBox,
} from "@/lib/video-ffmpeg";

const FAQ_ITEMS = [
  {
    q: "How does in-browser video watermark removal work?",
    a: "When you position the selection box over a logo, OmniTools translates those preview coordinates into the source video's pixel grid (X, Y, width, and height). FFmpeg WebAssembly then applies the Delogo or Box Blur filter to that region on every frame. The file is read directly from browser memory, so burned-in marks can be masked without an upload. MP4, MKV, MOV, WebM, and AVI inputs are supported, and the export is an MP4.",
  },
  {
    q: "What is the difference between Delogo and Box Blur?",
    a: "Delogo reconstructs pixels around the logo from nearby color and texture, producing a cleaner, painted-out look on flat backgrounds such as walls, sky, or solid graphics. Box Blur applies a dense, mosaic-style blur that keeps the frame intact and is often safer on busy or moving footage. Both modes re-encode the clip to H.264, so some compression is unavoidable; a tight box and a shorter clip keep the impact low. Start with Delogo, then switch to Box Blur if the mark still draws the eye.",
  },
  {
    q: "How long does watermark removal take?",
    a: "Most 15–60-second clips finish in about 10–30 seconds on a modern laptop or phone, depending on resolution and the area being filtered. Longer or 4K videos take proportionally more time because WebAssembly processes every frame locally. For the smoothest experience, keep source videos to 3–5 minutes or less. If a clip contains several watermarks, mask one area per pass and run the exported MP4 through the tool again.",
  },
  {
    q: "Is my video uploaded to a server?",
    a: "No. Your video never leaves your device: there is no upload, no server queue, and zero server storage. FFmpeg WebAssembly reads the file from browser memory, applies the filter locally, and creates the download link on your machine. Closing the tab releases the working copy from browser memory.",
  },
];

export function VideoWatermarkRemoverClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoNaturalDimensions, setVideoNaturalDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Watermark Box Coordinates in natural video pixels
  const [boxX, setBoxX] = useState<number>(50);
  const [boxY, setBoxY] = useState<number>(50);
  const [boxWidth, setBoxWidth] = useState<number>(140);
  const [boxHeight, setBoxHeight] = useState<number>(60);
  const [filterMode, setFilterMode] = useState<VideoWatermarkMode>("delogo");

  // Dragging state for the bounding box
  const [isDraggingBox, setIsDraggingBox] = useState<boolean>(false);
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startBoxX: number; startBoxY: number }>({
    startMouseX: 0,
    startMouseY: 0,
    startBoxX: 0,
    startBoxY: 0,
  });

  // Processing & Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // Result
  const [result, setResult] = useState<VideoProcessingResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);

  // Guardrail + cancellation state
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isCanceled, setIsCanceled] = useState<boolean>(false);

  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const canceledRef = useRef<boolean>(false);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    resultUrlRef.current = result?.url ?? null;
  }, [result]);

  // Release object URLs and the FFmpeg worker when leaving the page. The old
  // effect revoked the live preview whenever a result arrived.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      terminateFFmpeg();
    };
  }, []);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mkv|mov|webm|avi|flv|m4v)$/i)) {
      setErrorBanner("Choose a valid video file (MP4, MKV, MOV, WebM, AVI).");
      return;
    }

    const sizeCheck = validateUploadSize(
      file,
      MAX_VIDEO_SOURCE_BYTES,
      "Browser memory can't hold a file that big — trim or compress it first.",
    );
    if (!sizeCheck.ok) {
      setErrorBanner(sizeCheck.message ?? "That video is too large.");
      return;
    }

    setErrorBanner(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setResult(null);
    setVideoDuration(0);
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setVideoDuration(0);
    setVideoNaturalDimensions({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Preset positioning
  const setPresetPosition = (position: "top-right" | "bottom-right" | "bottom-left" | "top-left") => {
    const W = videoNaturalDimensions.width || 1280;
    const H = videoNaturalDimensions.height || 720;
    const padding = 30;

    switch (position) {
      case "top-right":
        setBoxX(Math.max(0, W - boxWidth - padding));
        setBoxY(padding);
        break;
      case "bottom-right":
        setBoxX(Math.max(0, W - boxWidth - padding));
        setBoxY(Math.max(0, H - boxHeight - padding));
        break;
      case "bottom-left":
        setBoxX(padding);
        setBoxY(Math.max(0, H - boxHeight - padding));
        break;
      case "top-left":
        setBoxX(padding);
        setBoxY(padding);
        break;
    }
  };

  // Pointer drag events for moving the box
  const handleBoxPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingBox(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = {
      startMouseX: clientX,
      startMouseY: clientY,
      startBoxX: boxX,
      startBoxY: boxY,
    };
  };

  const handleVideoPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingBox || !videoRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = videoRef.current.getBoundingClientRect();
    const scaleX = videoNaturalDimensions.width / rect.width;
    const scaleY = videoNaturalDimensions.height / rect.height;

    const deltaX = (clientX - dragStartRef.current.startMouseX) * scaleX;
    const deltaY = (clientY - dragStartRef.current.startMouseY) * scaleY;

    const newX = Math.max(
      0,
      Math.min(
        videoNaturalDimensions.width - boxWidth,
        Math.round(dragStartRef.current.startBoxX + deltaX)
      )
    );
    const newY = Math.max(
      0,
      Math.min(
        videoNaturalDimensions.height - boxHeight,
        Math.round(dragStartRef.current.startBoxY + deltaY)
      )
    );

    setBoxX(newX);
    setBoxY(newY);
  };

  const handleVideoPointerUp = () => {
    setIsDraggingBox(false);
  };

  const handleCancelProcessing = () => {
    canceledRef.current = true;
    terminateFFmpeg();
    setModalStatus("Canceling the watermark pass...");
    setIsCanceled(true);
  };

  const handleProcessWatermark = async () => {
    if (!selectedFile) return;

    canceledRef.current = false;
    setIsCanceled(false);
    setIsModalOpen(true);
    setModalProgress(5);
    setModalStatus("Preparing the FFmpeg Delogo engine...");

    const box: WatermarkBox = {
      x: boxX,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
    };

    try {
      const output = await removeVideoWatermark(
        selectedFile,
        box,
        filterMode,
        (progress, status) => {
          setModalProgress(progress);
          setModalStatus(status);
        }
      );

      setResult(output);
      setModalProgress(100);
      setModalStatus("Watermark successfully masked.");
    } catch (err: unknown) {
      console.error(err);
      if (canceledRef.current) {
        setModalStatus("Processing canceled. Your original file is untouched.");
        setIsCanceled(true);
        return;
      }
      const msg = err instanceof Error ? err.message : "Please try again with a different file.";
      setErrorBanner(msg);
      setIsModalOpen(false);
    }
  };

  // Convert natural box coordinates to percentage for the overlay box
  const W = videoNaturalDimensions.width || 1280;
  const H = videoNaturalDimensions.height || 720;
  const leftPct = (boxX / W) * 100;
  const topPct = (boxY / H) * 100;
  const widthPct = (boxWidth / W) * 100;
  const heightPct = (boxHeight / H) * 100;

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

              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
                FFmpeg Delogo Engine
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-rose-300">
                <EyeOff className="size-4 text-rose-400" />
                Video Watermark Blur &amp; Censor
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Blur or censor watermarks on video{" "}
                <span className="bg-gradient-to-r from-rose-300 via-pink-200 to-indigo-300 bg-clip-text text-transparent">
                  without uploading it
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Drag the selection box over the watermark, then use Delogo or Box Blur to paint it out
                or censor it — all locally in your browser. Your video is never uploaded.
              </p>
            </div>

            {/* Top Leaderboard Ad */}
            <div className="mt-8">
              <AdSlot type="banner-728" />
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

            {/* Dropzone Area (When no file loaded) */}
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
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                  isDragging
                    ? "border-rose-400 bg-rose-500/[0.08] shadow-[0_0_50px_-10px_rgba(251,113,133,0.3)] scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-rose-400/50 hover:bg-white/[0.04]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mkv,.mov,.webm,.avi,.m4v"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  aria-label="Select a video to remove its watermark"
                />

                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-rose-300 shadow-xl shadow-rose-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-rose-400/40">
                  <UploadCloud className="size-8" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                  Drag &amp; drop your video here, or{" "}
                  <span className="text-rose-300 underline underline-offset-4">
                    choose a file from your device
                  </span>
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Supports MP4, MKV, MOV, WebM, and AVI input. Files are processed locally in your
                  browser and never uploaded.
                </p>
              </div>
            ) : (
              /* Video Workspace & Bounding Box Area */
              <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#080b13]/90 shadow-2xl backdrop-blur-xl">
                  {/* Top Bar Video Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className="size-4 text-rose-400 shrink-0" />
                      <span className="truncate text-sm font-semibold text-zinc-100">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                      {videoDuration > 0 && (
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                          {formatDuration(videoDuration)}
                        </span>
                      )}
                      {videoNaturalDimensions.width > 0 && (
                        <span className="hidden sm:inline-block text-[11px] text-zinc-500">
                          {videoNaturalDimensions.width}x{videoNaturalDimensions.height}px
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <RotateCcw className="size-3.5" />
                      Change Video
                    </button>
                  </div>

                  {/* Interactive Video Player with Bounding Box Overlay */}
                  <div
                    ref={videoWrapperRef}
                    onMouseMove={handleVideoPointerMove}
                    onMouseUp={handleVideoPointerUp}
                    onTouchMove={handleVideoPointerMove}
                    onTouchEnd={handleVideoPointerUp}
                    className="relative flex min-h-[350px] touch-none items-center justify-center p-4 sm:p-8 bg-black/70 select-none overflow-hidden"
                  >
                    <div className="relative inline-block max-w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl">
                      <video
                        ref={videoRef}
                        src={previewUrl || ""}
                        controls
                        preload="metadata"
                        onError={() =>
                          setErrorBanner(
                            "This video can't be played by your browser, so it may not convert correctly. Try an MP4 (H.264) source.",
                          )
                        }
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            setVideoDuration(videoRef.current.duration);
                            setVideoNaturalDimensions({
                              width: videoRef.current.videoWidth,
                              height: videoRef.current.videoHeight,
                            });
                            // Default position top right
                            setPresetPosition("top-right");
                          }
                        }}
                        className="max-h-[420px] w-auto max-w-full object-contain pointer-events-auto"
                      />

                      {/* Draggable Watermark Bounding Box */}
                      {videoNaturalDimensions.width > 0 && (
                        <div
                          onMouseDown={handleBoxPointerDown}
                          onTouchStart={handleBoxPointerDown}
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                          }}
                          className={`absolute z-20 flex cursor-move items-center justify-center rounded border-2 border-rose-400 bg-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.4)] backdrop-blur-[2px] transition-all ${
                            isDraggingBox ? "ring-2 ring-rose-300 scale-[1.02]" : ""
                          }`}
                        >
                          <span className="flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white tracking-wider uppercase select-none pointer-events-none">
                            <Move className="size-2.5 text-rose-300" />
                            Watermark Area
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Box Adjustment Controls */}
                  <div className="space-y-6 border-t border-white/[0.08] p-5 sm:p-6 bg-white/[0.01]">
                    {/* Position Presets */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">Corner Presets:</span>
                        <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
                          <button
                            type="button"
                            onClick={() => setPresetPosition("top-right")}
                            className="rounded px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                          >
                            Top Right
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetPosition("bottom-right")}
                            className="rounded px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                          >
                            Bottom Right
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetPosition("bottom-left")}
                            className="rounded px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                          >
                            Bottom Left
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetPosition("top-left")}
                            className="rounded px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10"
                          >
                            Top Left
                          </button>
                        </div>
                      </div>

                      {/* Filter Mode Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400">Masking Method:</span>
                        <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
                          <button
                            type="button"
                            onClick={() => setFilterMode("delogo")}
                            className={`rounded px-3 py-1 text-xs font-semibold transition-all ${
                              filterMode === "delogo"
                                ? "bg-rose-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Delogo (Smooth)
                          </button>
                          <button
                            type="button"
                            onClick={() => setFilterMode("blur")}
                            className={`rounded px-3 py-1 text-xs font-semibold transition-all ${
                              filterMode === "blur"
                                ? "bg-rose-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Box Blur (Heavy)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Width & Height Sliders */}
                    <div className="grid gap-4 sm:grid-cols-2 rounded-2xl border border-white/10 bg-[#0b0e17]/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-medium text-zinc-400">
                          Box Width: <strong className="text-rose-300">{boxWidth}px</strong>
                        </label>
                        <input
                          type="range"
                          min="40"
                          max={Math.min(600, videoNaturalDimensions.width || 600)}
                          value={boxWidth}
                          onChange={(e) => setBoxWidth(Number(e.target.value))}
                          className="h-1.5 w-36 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-rose-400"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-medium text-zinc-400">
                          Box Height: <strong className="text-rose-300">{boxHeight}px</strong>
                        </label>
                        <input
                          type="range"
                          min="20"
                          max={Math.min(300, videoNaturalDimensions.height || 300)}
                          value={boxHeight}
                          onChange={(e) => setBoxHeight(Number(e.target.value))}
                          className="h-1.5 w-36 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-rose-400"
                        />
                      </div>
                    </div>

                    {/* Process Action CTA */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <div className="text-xs text-zinc-400">
                        💡 Drag the selection box over the watermark in the preview. The box is applied
                        to every frame, and its coordinates map from preview pixels to source pixels
                        automatically.
                      </div>

                      <button
                        type="button"
                        onClick={handleProcessWatermark}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.01] hover:opacity-95"
                      >
                        <Sparkles className="size-4" />
                        Apply Watermark Censor
                      </button>
                    </div>
                  </div>
                </div>

                {/* Result Card */}
                {result && (
                  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white sm:text-lg">
                          Watermark removed successfully
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {result.fileName} • Size: {formatFileSize(result.convertedSize)}
                        </p>
                      </div>
                    </div>

                    {/* Cleaned Video Preview Player */}
                    <div className="mt-6 mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black p-2">
                      <video
                        src={result.url}
                        controls
                        className="max-h-[300px] w-full object-contain"
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-emerald-300/80">
                        ✓ Processed locally with FFmpeg WebAssembly in your browser
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setResult(null)}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                        >
                          Adjust Another Area
                        </button>

                        <a
                          href={result.url}
                          download={result.fileName}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300"
                        >
                          <Download className="size-4" />
                          Download Clean Video
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Notice */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-rose-300">💡 Performance Tip:</span> Delogo and Box
              Blur process every frame, so clips of 3–5 minutes or less process fastest in your browser.
              Very long or high-resolution videos can exhaust available memory; start with a shorter
              clip when in doubt.
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                <Info className="size-3.5" />
                Video Watermark Removal Guide
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to remove a video watermark with a Delogo box
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Screen recordings, client cuts, and unreleased footage often carry a station logo, username
                stamp, or app watermark that was never meant to go out. This tool places a single selection
                box over the mark and masks it with Delogo or Box Blur, without sending the file to a server.
                FFmpeg WebAssembly decodes, filters, and re-encodes the video inside your browser: only the
                selected region receives the filter, the rest of the frame keeps its original content, and the
                audio track is copied without re-encoding. Because the file never leaves your device,
                embargoed footage and client material stay out of an upload queue and are never stored on a
                remote server. Your CPU does the work, so shorter clips and a tight box produce the best
                results. The workflow takes only a few minutes.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-rose-500/20 text-xs font-bold text-rose-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Choose your video</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Select an MP4, MKV, MOV, WebM, or AVI file from your device. There is no upload step:
                    your browser reads the file locally, shows a preview, and prepares the selection overlay.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20 text-xs font-bold text-pink-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Frame the watermark</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Drag the red box over the watermark in the preview. Use the width and height sliders or
                    the corner presets to tighten it around the mark; the overlay maps preview pixels to
                    source pixels automatically. Choose Delogo to reconstruct pixels around the logo for a
                    cleaner, painted-out look on flat backgrounds, or Box Blur for a heavy, mosaic-style
                    censor that is safer on busy or moving footage. Because the box is applied to every
                    frame, avoid covering faces or other important details.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Apply, review &amp; download</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Click Apply Watermark Censor and keep the tab open while FFmpeg processes each frame.
                    Review the MP4 in the result card, and make sure the mark is hidden while the surrounding
                    image still looks natural. Download the file, or adjust the box and run another pass if a
                    second watermark needs attention.
                  </p>
                </div>
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
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-rose-300"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-rose-300" : ""
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

      {/* Processing Modal with Ad */}
      <ProcessingModal
        isOpen={isModalOpen}
        progress={modalProgress}
        statusText={modalStatus}
        onClose={() => setIsModalOpen(false)}
        onCancel={handleCancelProcessing}
        isCanceled={isCanceled}
      />

      <Footer />
    </div>
  );
}
