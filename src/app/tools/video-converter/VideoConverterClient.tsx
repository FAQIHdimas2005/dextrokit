"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Download,
  Film,
  Info,
  RotateCcw,
  Sparkles,
  UploadCloud,
  VolumeX,
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
  processVideoFile,
  terminateFFmpeg,
  type CompressionLevel,
  type TargetResolution,
  type VideoProcessingResult,
  type VideoTargetFormat,
} from "@/lib/video-ffmpeg";

const FAQ_ITEMS = [
  {
    q: "How does DextroKit compress video without a server?",
    a: "DextroKit runs a WebAssembly build of FFmpeg, the world's leading video processing software, compiled to run directly inside your browser. When you pick a compression preset, your browser executes the H.264 or VP9 encoding algorithms in your device's memory, so no data is ever sent to a server.",
  },
  {
    q: "How much smaller will my video be?",
    a: "With the 'Medium (Recommended)' preset, file size typically shrinks by 40% to 60% with almost no visible difference in quality. Choose 'High (Smallest File)' and savings can reach 75–85%, which is ideal for sharing over WhatsApp, email, or Discord.",
  },
  {
    q: "Can I convert a video to an animated GIF?",
    a: "Yes. Pick 'GIF' as the output format and the tool automatically turns your video clip into a looping animated GIF that is ready to share on social media.",
  },
  {
    q: "What video duration and file size do you recommend?",
    a: "Because everything runs in browser memory, we recommend videos under 5–10 minutes or under 100 MB. That keeps processing fast and prevents your browser tab from running out of RAM.",
  },
];

export function VideoConverterClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Settings
  const [targetFormat, setTargetFormat] = useState<VideoTargetFormat>("mp4");
  const [compression, setCompression] = useState<CompressionLevel>("medium");
  const [resolution, setResolution] = useState<TargetResolution>("original");
  const [removeAudio, setRemoveAudio] = useState<boolean>(false);

  // Modal & Processing State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // Result State
  const [result, setResult] = useState<VideoProcessingResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Guardrail + cancellation state
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isCanceled, setIsCanceled] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const canceledRef = useRef<boolean>(false);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    resultUrlRef.current = result?.url ?? null;
  }, [result]);

  // Revoke the object URLs and release the FFmpeg WASM worker on unmount.
  // Revoking on every dependency change (the previous behavior) killed the
  // still-visible preview as soon as a result arrived.
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
    setVideoDimensions({ width: 0, height: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelProcessing = () => {
    canceledRef.current = true;
    terminateFFmpeg();
    setModalStatus("Canceling the conversion...");
    setIsCanceled(true);
  };

  const handleProcessVideo = async () => {
    if (!selectedFile) return;

    canceledRef.current = false;
    setIsCanceled(false);
    setIsModalOpen(true);
    setModalProgress(5);
    setModalStatus("Preparing the FFmpeg WebAssembly engine...");

    try {
      const output = await processVideoFile(
        selectedFile,
        {
          format: targetFormat,
          compression,
          resolution,
          removeAudio,
        },
        (progress, status) => {
          setModalProgress(progress);
          setModalStatus(status);
        }
      );

      setResult(output);
      setModalProgress(100);
      setModalStatus("Video converted and compressed!");
    } catch (err: unknown) {
      console.error(err);
      if (canceledRef.current) {
        setModalStatus("Conversion canceled. Your original file is untouched.");
        setIsCanceled(true);
        return;
      }
      const msg = err instanceof Error ? err.message : "The video could not be processed.";
      setErrorBanner(msg);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#05070c] text-slate-100">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Background Grid Accent */}
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

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300">
                <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
                FFmpeg WASM Single-Thread
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-indigo-300">
                <Film className="size-4 text-indigo-400" />
                Video Converter &amp; Compressor
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Convert &amp; compress video{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-sky-200 to-purple-300 bg-clip-text text-transparent">
                  privately in your browser
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Shrink video size by up to 80% or convert MOV, MKV, and AVI to MP4, WebM, or GIF right
                on your device, with no cloud server involved.
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

            {/* Dropzone Area (When no video chosen) */}
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
                    ? "border-indigo-400 bg-indigo-500/[0.08] shadow-[0_0_50px_-10px_rgba(129,140,248,0.3)] scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-indigo-400/50 hover:bg-white/[0.04]"
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
                  aria-label="Choose a video to convert or compress"
                />

                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-indigo-300 shadow-xl shadow-indigo-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-indigo-400/40">
                  <UploadCloud className="size-8" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                  Drag &amp; drop your video here, or{" "}
                  <span className="text-indigo-300 underline underline-offset-4">
                    choose a file from your device
                  </span>
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Supports MP4, MKV, MOV, WebM, and AVI input. Processed with the FFmpeg WASM engine.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {["MP4", "MKV", "MOV", "WebM", "AVI", "To MP4", "To WebM", "To GIF"].map(
                    (fmt) => (
                      <span
                        key={fmt}
                        className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-mono text-zinc-400"
                      >
                        {fmt}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : (
              /* Video Loaded & Settings Workspace */
              <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#080b13]/90 shadow-2xl backdrop-blur-xl">
                  {/* Top Bar Video Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className="size-4 text-indigo-400 shrink-0" />
                      <span className="truncate text-sm font-semibold text-zinc-100">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                      {videoDuration > 0 && (
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                          {formatDuration(videoDuration)}
                        </span>
                      )}
                      {videoDimensions.width > 0 && (
                        <span className="hidden sm:inline-block text-[11px] text-zinc-500">
                          {videoDimensions.width}x{videoDimensions.height}px
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

                  {/* Video Preview */}
                  <div className="p-5 sm:p-8">
                    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
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
                            setVideoDimensions({
                              width: videoRef.current.videoWidth,
                              height: videoRef.current.videoHeight,
                            });
                          }
                        }}
                        className="max-h-[300px] w-full object-contain"
                      />
                    </div>

                    {/* Controls Grid */}
                    <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-[#0b0e17]/80 p-5">
                      {/* 1. Target Format Selection */}
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Output Format:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {(["mp4", "webm", "mov", "mkv", "gif"] as VideoTargetFormat[]).map(
                            (fmt) => (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => setTargetFormat(fmt)}
                                className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase transition-all ${
                                  targetFormat === fmt
                                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                                    : "border border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {fmt === "gif" ? "GIF (Animated)" : fmt}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* 2. Compression Level (If not GIF) */}
                      {targetFormat !== "gif" && (
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Compression Level:
                          </label>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              type="button"
                              onClick={() => setCompression("low")}
                              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                compression === "low"
                                  ? "border-indigo-400 bg-indigo-500/15 text-white"
                                  : "border-white/10 bg-black/30 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-bold">Low (Best Quality)</span>
                              <span className="text-[10px] text-zinc-500 mt-1">
                                Saves ~15-25% in size with virtually no quality loss
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCompression("medium")}
                              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                compression === "medium"
                                  ? "border-indigo-400 bg-indigo-500/15 text-white"
                                  : "border-white/10 bg-black/30 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-bold text-indigo-300">
                                Medium (Recommended)
                              </span>
                              <span className="text-[10px] text-zinc-500 mt-1">
                                Saves ~40-60% in size while keeping the picture crisp
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCompression("high")}
                              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                                compression === "high"
                                  ? "border-indigo-400 bg-indigo-500/15 text-white"
                                  : "border-white/10 bg-black/30 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <span className="text-xs font-bold">High (Smallest File)</span>
                              <span className="text-[10px] text-zinc-500 mt-1">
                                Saves ~70-85% in size, perfect for WhatsApp and email
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. Resolution Scaling & Audio Toggle */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.06] pt-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-medium text-zinc-400">Resolution:</span>
                          <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
                            {(["original", "1080p", "720p", "480p"] as TargetResolution[]).map(
                              (res) => (
                                <button
                                  key={res}
                                  type="button"
                                  onClick={() => setResolution(res)}
                                  className={`rounded-md px-3 py-1 text-xs font-semibold uppercase transition-all ${
                                    resolution === res
                                      ? "bg-indigo-500 text-white"
                                      : "text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {res === "original" ? "Original" : res}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {targetFormat !== "gif" && (
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-300 select-none">
                            <input
                              type="checkbox"
                              checked={removeAudio}
                              onChange={(e) => setRemoveAudio(e.target.checked)}
                              className="size-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-400"
                            />
                            <VolumeX className="size-3.5 text-zinc-400" />
                            Mute Audio (Silent Video)
                          </label>
                        )}
                      </div>

                      {/* Process CTA Button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleProcessVideo}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] hover:opacity-95"
                        >
                          <Sparkles className="size-4" />
                          Convert &amp; Compress Video
                        </button>
                      </div>
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
                          Video converted successfully
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {result.fileName} • From {formatFileSize(result.originalSize)} to{" "}
                          <strong className="text-emerald-300">
                            {formatFileSize(result.convertedSize)}
                          </strong>
                          {result.convertedSize < result.originalSize && (
                            <span className="ml-2 rounded bg-emerald-400/20 px-1.5 py-0.5 text-emerald-300">
                              -
                              {Math.round(
                                (1 - result.convertedSize / result.originalSize) * 100
                              )}
                              % smaller
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Result Video Preview Player */}
                    <div className="mt-6 mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black p-2">
                      <video
                        src={result.url}
                        controls
                        className="max-h-[300px] w-full object-contain"
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-emerald-300/80">
                        ✓ Processed with single-thread FFmpeg WebAssembly (100% local)
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                        >
                          Process Another Video
                        </button>

                        <a
                          href={result.url}
                          download={result.fileName}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300"
                        >
                          <Download className="size-4" />
                          Download Video
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile RAM & Duration Guardrail */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-indigo-300">💡 Video Performance Tips:</span> Video
              compression relies on the CPU and RAM of your device. For the best speed and to keep your
              browser tab from crashing on a phone, we recommend a video under 5–10 minutes or under
              100 MB.
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* Educational & SEO Guide Section (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Info className="size-3.5" />
                Video Compression &amp; Conversion Guide
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to reduce video size &amp; change format without a server
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Phone cameras now record at very high bitrates, so a single file often reaches
                hundreds of megabytes. DextroKit Video Converter &amp; Compressor helps you shrink video
                size quickly while keeping the picture sharp:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/20 text-xs font-bold text-indigo-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Upload video</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Choose a video in MP4, MKV, MOV, or WebM format. You can review the clip right in the
                    preview player.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-purple-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Set compression</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Pick a compression level (Medium is recommended and saves about 50% of the file
                    size) or change the format to MP4 / WebM / animated GIF.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Download the new video</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Preview the compressed video right in your browser and download it instantly, with
                    no extra watermark.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-5 text-sm leading-relaxed text-zinc-400 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Why we use single-thread FFmpeg WebAssembly
                </h3>
                <p>
                  Many web video converters require cross-origin isolation headers (COOP/COEP), which break
                  third-party scripts. At DextroKit, we use a modern single-thread FFmpeg WASM architecture
                  that runs smoothly in every browser without disrupting your browsing experience.
                </p>
                <p>
                  Most importantly: <strong className="text-white">your videos are never uploaded to the internet</strong>.
                  Whether you compress private family videos or internal company footage, the file stays
                  entirely inside your device memory.
                </p>
              </div>

              {/* FAQ Accordion */}
              <div className="mt-12 border-t border-white/[0.06] pt-8">
                <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {FAQ_ITEMS.map((faq, idx) => (
                    <div key={idx} className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-indigo-300"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-indigo-300" : ""
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
        onCancel={handleCancelProcessing}
        isCanceled={isCanceled}
      />

      <Footer />
    </div>
  );
}
