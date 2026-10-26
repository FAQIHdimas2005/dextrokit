"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Download,
  FileArchive,
  Image as ImageIcon,
  Images,
  Info,
  Play,
  Sliders,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import {
  convertSingleImage,
  createZipFromConvertedImages,
  formatFileSize,
  isHeicFile,
  getTargetExtension,
  MAX_IMAGE_FILE_BYTES,
  type ImageOutputFormat,
  type ConvertedImageResult,
} from "@/lib/image-converter";
import { validateUploadSize } from "@/lib/limits";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  targetFormat: ImageOutputFormat;
  status: "idle" | "converting" | "success" | "error";
  errorMsg?: string;
  result?: ConvertedImageResult;
}

const FAQ_ITEMS = [
  {
    q: "Are my photos uploaded to the internet, or do they stay on my device?",
    a: "They stay on your device. Unlike other online converters that send your files to third-party cloud servers, DextroKit processes every conversion inside your browser using HTML5 Canvas and WebAssembly. Private photos, ID cards, and confidential images never leave your browser's memory.",
  },
  {
    q: "Can I convert HEIC photos from my iPhone?",
    a: "Yes. iPhone cameras save photos as high-resolution HEIC/HEIF files by default. DextroKit decodes HEIC directly in your browser and converts .heic files to JPG, PNG, or WebP that you can open on Windows, Android, and the web.",
  },
  {
    q: "How many images can I convert at once?",
    a: "You can batch-convert dozens of images at a time. When the batch finishes, download each photo individually or grab the entire set in a single .ZIP archive with one click.",
  },
  {
    q: "Which format should I choose: JPG, PNG, or WebP?",
    a: "For camera photos and complex images, choose JPG or WebP. WebP files are about 30% smaller than JPG at comparable quality. For illustrations, logos, or images with transparent backgrounds, choose PNG.",
  },
];

export function ImageConverterClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [globalFormat, setGlobalFormat] = useState<ImageOutputFormat>("webp");
  const [quality, setQuality] = useState<number>(85); // 10 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Guardrail + cancellation state
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isCanceled, setIsCanceled] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRequestedRef = useRef<boolean>(false);
  const queueRef = useRef<QueueItem[]>([]);

  // Keep a ref in sync so unmount cleanup can release every object URL, even
  // when the last state update never rendered.
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.result?.url) URL.revokeObjectURL(item.result.url);
      }
    };
  }, []);

  const addFilesToQueue = useCallback(
    (files: FileList | File[]) => {
      const validFiles: QueueItem[] = [];
      const skipped: string[] = [];
      const fileArray = Array.from(files);
      const maxBatch = 30;
      const maxQueueBytes = 300 * 1024 * 1024;
      let totalBytes = queue.reduce((sum, item) => sum + item.file.size, 0);

      for (const file of fileArray) {
        const isSupported =
          file.type.startsWith("image/") || isHeicFile(file);
        if (!isSupported) {
          skipped.push(`"${file.name}" isn't a supported image`);
          continue;
        }

        const sizeCheck = validateUploadSize(
          file,
          MAX_IMAGE_FILE_BYTES,
          "Resize or compress it first.",
        );
        if (!sizeCheck.ok) {
          skipped.push(sizeCheck.message ?? `"${file.name}" is too large`);
          continue;
        }

        if (totalBytes + file.size > maxQueueBytes) {
          skipped.push("The queue is capped at 300 MB to keep your tab stable");
          break;
        }

        totalBytes += file.size;

        // Create a local blob preview if readable, or a placeholder
        const previewUrl = isHeicFile(file)
          ? ""
          : URL.createObjectURL(file);

        validFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          previewUrl,
          targetFormat: globalFormat,
          status: "idle",
        });

        if (validFiles.length >= maxBatch) break;
      }

      if (skipped.length > 0) {
        setErrorBanner(
          skipped.length === 1
            ? skipped[0]
            : `${skipped.length} files were skipped: ${skipped.slice(0, 3).join(" · ")}${
                skipped.length > 3 ? " …" : ""
              }`,
        );
      }

      if (validFiles.length > 0) {
        setQueue((prev) => [...prev, ...validFiles]);
      }
    },
    [globalFormat, queue]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      // Reset input value so same files can be re-selected if deleted
      e.target.value = "";
    }
  };

  const handleGlobalFormatChange = (newFormat: ImageOutputFormat) => {
    setGlobalFormat(newFormat);
    // Update target format for idle items in queue
    setQueue((prev) =>
      prev.map((item) =>
        item.status === "idle" ? { ...item, targetFormat: newFormat } : item
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item?.result?.url) URL.revokeObjectURL(item.result.url);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearQueue = () => {
    queue.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    setQueue([]);
  };

  // Convert Single Item
  const convertItem = async (item: QueueItem): Promise<QueueItem> => {
    try {
      const result = await convertSingleImage(item.file, {
        targetFormat: item.targetFormat,
        quality: quality / 100,
      });
      return {
        ...item,
        status: "success",
        result,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "That image couldn't be converted. Please try again with a different file.";
      return {
        ...item,
        status: "error",
        errorMsg: errorMessage,
      };
    }
  };

  // Run Batch Conversion
  const handleConvertAll = async () => {
    const idleItems = queue.filter((item) => item.status !== "success");
    if (idleItems.length === 0) return;

    cancelRequestedRef.current = false;
    setIsCanceled(false);
    setIsModalOpen(true);
    setModalProgress(0);
    setModalStatus(`Preparing to convert your images (${idleItems.length})...`);

    const updatedQueue = [...queue];
    const total = idleItems.length;
    let completed = 0;

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.status === "success") continue;

      if (cancelRequestedRef.current) {
        setModalStatus(`Canceled after ${completed} of ${total} images.`);
        setIsCanceled(true);
        return;
      }

      setModalStatus(`Processing: ${item.file.name}...`);

      // Update state item to converting
      updatedQueue[i] = { ...item, status: "converting" };
      setQueue([...updatedQueue]);

      const finishedItem = await convertItem(item);
      updatedQueue[i] = finishedItem;
      completed++;

      if (finishedItem.status === "error" && finishedItem.errorMsg) {
        setErrorBanner(finishedItem.errorMsg);
      }

      const currentProgress = Math.round((completed / total) * 100);
      setModalProgress(currentProgress);
      setModalStatus(
        `Converted ${completed} of ${total} (${currentProgress}%)`
      );
      setQueue([...updatedQueue]);
    }

    setModalProgress(100);
    setModalStatus("All images converted.");
  };

  const handleCancelProcessing = () => {
    cancelRequestedRef.current = true;
    setModalStatus("Finishing the current image, then stopping...");
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    const successItems = queue.filter(
      (item) => item.status === "success" && item.result
    );
    if (successItems.length === 0) return;

    try {
      setIsZipping(true);
      const zipBlob = await createZipFromConvertedImages(
        successItems.map((item) => ({
          fileName: item.result!.fileName,
          blob: item.result!.blob,
        }))
      );

      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `dextrokit-converted-images-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Failed to create ZIP file:", err);
      setErrorBanner(
        "Couldn't create the ZIP archive. Please download your images one by one.",
      );
    } finally {
      setIsZipping(false);
    }
  };

  const successCount = queue.filter((i) => i.status === "success").length;
  const totalOriginalSize = queue.reduce((acc, i) => acc + i.file.size, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#05070c] text-slate-100">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Background Subtle Grid Pattern */}
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
            aria-hidden="true"
          />

          <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
            {/* Top Navigation / Breadcrumb */}
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                100% Client-Side Engine
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-purple-300">
                <Images className="size-4 text-purple-400" />
                Image Format Converter
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Convert Images{" "}
                <span className="bg-gradient-to-r from-purple-300 via-sky-200 to-emerald-300 bg-clip-text text-transparent">
                  Instantly &amp; Privately
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Convert JPG, PNG, WebP, GIF, and iPhone HEIC photos in a flash,
                right in your browser&apos;s memory. No server queues, no quotas,
                and no risk of data leaks.
              </p>
            </div>

            {/* Top Leaderboard Ad */}
            <div className="mt-8">
              <AdSlot type="banner-728" />
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-500/[0.08] shadow-[0_0_50px_-10px_rgba(52,211,153,0.3)] scale-[1.01]"
                  : "border-white/15 bg-white/[0.02] hover:border-purple-400/50 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic,.HEIC,.heif,.HEIF"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Choose image files to convert"
              />

              <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-purple-300 shadow-xl shadow-purple-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-purple-400/40">
                <UploadCloud className="size-8" />
              </div>

              <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                Drop your images here, or{" "}
                <span className="text-purple-300 underline underline-offset-4">
                  choose files from your device
                </span>
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                Batch-convert JPG, PNG, WebP, GIF, BMP, and{" "}
                <strong className="text-zinc-300">iPhone photos (.HEIC)</strong>.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {["JPG", "PNG", "WebP", "HEIC (Apple)", "GIF", "BMP"].map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-mono text-zinc-400"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
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

            {/* Queue & Control Toolbar */}
            {queue.length > 0 && (
              <div className="mt-10 space-y-6">
                {/* Global Settings Toolbar */}
                <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#0b0e17]/90 p-5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Format Selector */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                      Convert all to
                    </span>
                    <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
                      {(["webp", "jpeg", "png"] as ImageOutputFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleGlobalFormatChange(fmt)}
                          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase transition-all ${
                            globalFormat === fmt
                              ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {fmt === "jpeg" ? "JPG" : fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider (Visible for WebP and JPEG) */}
                  {globalFormat !== "png" && (
                    <div className="flex items-center gap-3">
                      <Sliders className="size-4 text-zinc-400" />
                      <label
                        htmlFor="quality-slider"
                        className="text-xs font-medium text-zinc-300 whitespace-nowrap"
                      >
                        Quality: <strong className="text-purple-300">{quality}%</strong>
                      </label>
                      <input
                        id="quality-slider"
                        type="range"
                        min="20"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="h-1.5 w-24 sm:w-32 cursor-pointer appearance-none rounded-lg bg-zinc-700 accent-purple-400"
                      />
                    </div>
                  )}

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2.5 sm:ml-auto">
                    <button
                      type="button"
                      onClick={handleConvertAll}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <Play className="size-3.5 fill-current" />
                      Convert All ({queue.length})
                    </button>

                    {successCount > 0 && (
                      <button
                        type="button"
                        onClick={handleDownloadAllZip}
                        disabled={isZipping}
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-200 transition-all hover:bg-sky-500/25 disabled:opacity-50"
                      >
                        <FileArchive className="size-3.5" />
                        {isZipping ? "Creating ZIP..." : `Download All (ZIP) (${successCount})`}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleClearQueue}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                      title="Clear entire queue"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="hidden sm:inline">Clear</span>
                    </button>
                  </div>
                </div>

                {/* Queue Summary Bar */}
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <span>
                    Total:{" "}
                    <strong className="text-zinc-200">
                      {queue.length} {queue.length === 1 ? "file" : "files"}
                    </strong>{" "}
                    ({formatFileSize(totalOriginalSize)})
                  </span>
                  <span>
                    Done:{" "}
                    <strong className="text-emerald-300">
                      {successCount} / {queue.length}
                    </strong>
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-[#080b13]/80 backdrop-blur-md">
                  {queue.map((item) => {
                    const isAppleHeic = isHeicFile(item.file);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-4 p-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                      >
                        {/* File Thumbnail & Meta */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/50">
                            {item.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-[10px] font-semibold text-purple-300">
                                <ImageIcon className="size-5 mb-0.5" />
                                {isAppleHeic ? "HEIC" : "IMG"}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-semibold text-zinc-100"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                              <span>{formatFileSize(item.file.size)}</span>
                              <span>•</span>
                              <span className="font-mono uppercase text-zinc-300">
                                ➔ {getTargetExtension(item.targetFormat)}
                              </span>
                              {isAppleHeic && (
                                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                                  Apple HEIC
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status & Output Details */}
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          {item.status === "idle" && (
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                              Ready to convert
                            </span>
                          )}

                          {item.status === "converting" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-purple-500/10 px-2.5 py-1 text-[11px] font-medium text-purple-300">
                              <span className="size-1.5 rounded-full bg-purple-400 animate-ping" />
                              Converting...
                            </span>
                          )}

                          {item.status === "error" && (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
                              {item.errorMsg || "Failed"}
                            </span>
                          )}

                          {item.status === "success" && item.result && (
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="block text-xs font-semibold text-emerald-300">
                                  {formatFileSize(item.result.convertedSize)}
                                </span>
                                <span className="block text-[10px] text-zinc-500">
                                  {item.result.convertedSize < item.file.size ? (
                                    <span className="text-emerald-400">
                                      -{Math.round(
                                        (1 - item.result.convertedSize / item.file.size) *
                                          100
                                      )}% smaller
                                    </span>
                                  ) : (
                                    <span>Lossless format</span>
                                  )}
                                </span>
                              </div>

                              <a
                                href={item.result.url}
                                download={item.result.fileName}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-all hover:bg-emerald-500/30"
                              >
                                <Download className="size-3.5" />
                                Download
                              </a>
                            </div>
                          )}

                          {/* Delete Item Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-red-400"
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* Educational & SEO Guide Section (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                <Info className="size-3.5" />
                Guide &amp; Technical Details
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to Convert Image Formats in DextroKit
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                The DextroKit Image Converter makes professional-quality image
                conversion effortless. No heavy software like Photoshop required,
                and no account needed. Here&apos;s how it works:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-purple-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Upload your images</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Drag one photo or a whole batch into the drop zone. HEIC
                    (iPhone photos), JPG, PNG, and WebP files are supported automatically.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/20 text-xs font-bold text-indigo-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Pick an output format</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Choose your target format (JPG, PNG, or WebP). You can also adjust
                    the compression quality slider to keep file sizes down.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">
                    Download instantly or as a ZIP
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Click &apos;Convert All&apos; to process everything in a flash right in
                    your browser. Download files one by one or all at once in a
                    single .ZIP archive, free of charge.
                  </p>
                </div>
              </div>

              {/* In-depth SEO text */}
              <div className="mt-10 space-y-5 text-sm leading-relaxed text-zinc-400 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Why client-side processing is fundamentally safer
                </h3>
                <p>
                  Most online converters require you to upload your images to
                  their servers. That creates serious privacy risks, especially when
                  you&apos;re converting ID cards, driver&apos;s licenses, passports, bank
                  statements, or private family photos.
                </p>
                <p>
                  At <strong className="text-white">DextroKit</strong>, everything runs
                  on a <em className="text-zinc-200">Zero Server Storage</em> architecture.
                  JavaScript and WebAssembly read your files directly from your
                  device&apos;s RAM, render them on an internal browser canvas, and export
                  them back to your disk. Our hosting infrastructure cannot see, store,
                  or copy your images. Your files stay 100% private, every time.
                </p>

                <h3 className="text-lg font-semibold text-zinc-200 pt-3">
                  Format guide: JPG vs PNG vs WebP
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-zinc-300">WebP:</strong> A next-generation
                    image format supported by all modern browsers. It produces files
                    up to 35% smaller than JPEG at the same visual sharpness,
                    making it ideal for websites and online stores.
                  </li>
                  <li>
                    <strong className="text-zinc-300">JPG / JPEG:</strong> The universal
                    standard for photos. It works with older devices, printers, and
                    office software.
                  </li>
                  <li>
                    <strong className="text-zinc-300">PNG:</strong> A lossless format
                    that supports transparent backgrounds. Great for stickers, logos,
                    icons, and graphics with crisp lines and fine detail.
                  </li>
                  <li>
                    <strong className="text-zinc-300">HEIC / HEIF:</strong> The default
                    camera format on Apple iOS devices. Converting HEIC to JPG here lets
                    you open iPhone photos on a Windows laptop or Android phone
                    without a hitch.
                  </li>
                </ul>
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
        onCancel={handleCancelProcessing}
        isCanceled={isCanceled}
      />

      <Footer />
    </div>
  );
}
