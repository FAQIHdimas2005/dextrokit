"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  FolderSync,
  Images,
  Info,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import {
  formatFileSize,
  isHeicFile,
  MAX_IMAGE_FILE_BYTES,
} from "@/lib/image-converter";
import {
  convertImagesToPdf,
  mergePdfFiles,
  MAX_PDF_FILES,
  MAX_PDF_FILE_BYTES,
  type ImageToPdfMargin,
  type ImageToPdfOrientation,
} from "@/lib/pdf-tools";
import { validateUploadSize } from "@/lib/limits";

type ToolTab = "merge" | "image-to-pdf";

interface PdfQueueFile {
  id: string;
  file: File;
}

interface ImageQueueFile {
  id: string;
  file: File;
  previewUrl: string;
}

const FAQ_ITEMS = [
  {
    q: "Are my confidential PDFs and personal photos really safe on DextroKit?",
    a: "Yes, completely. Nothing you add is uploaded to our servers. Merging PDFs and converting photos to PDF run entirely inside your browser's memory with JavaScript and WebAssembly, so there is no server copy to leak. Close the tab and no trace of your files remains.",
  },
  {
    q: "How do I change the page order in a merged PDF?",
    a: "In the file queue, use the up (↑) and down (↓) arrow buttons next to each file to move it earlier or later. Your document is assembled from position 1 through the last entry, so the order you see is the order you get.",
  },
  {
    q: "Is there a limit on how many files I can merge at once?",
    a: "No. Everything runs on your laptop's or phone's own RAM, so DextroKit sets no daily quota and no server-side size cap. Merge dozens of documents or photos at once, free, forever.",
  },
  {
    q: "Can I turn HEIC photos from my iPhone into a PDF?",
    a: "Yes. DextroKit ships with a built-in HEIC decoder. Add iPhone camera files (.heic) to the queue alongside JPG or PNG photos and they are converted into your PDF automatically.",
  },
];

export function PdfToolsClient() {
  const [activeTab, setActiveTab] = useState<ToolTab>("merge");
  const [pdfQueue, setPdfQueue] = useState<PdfQueueFile[]>([]);
  const [imageQueue, setImageQueue] = useState<ImageQueueFile[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Image to PDF Settings
  const [orientation, setOrientation] = useState<ImageToPdfOrientation>("auto");
  const [margin, setMargin] = useState<ImageToPdfMargin>("small");

  // Output State
  const [resultPdfUrl, setResultPdfUrl] = useState<string | null>(null);
  const [resultPdfSize, setResultPdfSize] = useState<number>(0);
  const [resultPdfName, setResultPdfName] = useState<string>("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Guardrail state
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageQueueRef = useRef<ImageQueueFile[]>([]);
  const resultPdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    imageQueueRef.current = imageQueue;
  }, [imageQueue]);

  useEffect(() => {
    resultPdfUrlRef.current = resultPdfUrl;
  }, [resultPdfUrl]);

  // Release every object URL when the user leaves the page.
  useEffect(() => {
    return () => {
      for (const item of imageQueueRef.current) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      if (resultPdfUrlRef.current) URL.revokeObjectURL(resultPdfUrlRef.current);
    };
  }, []);

  const replaceResultUrl = (nextUrl: string | null) => {
    if (resultPdfUrlRef.current && resultPdfUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(resultPdfUrlRef.current);
    }
    resultPdfUrlRef.current = nextUrl;
    setResultPdfUrl(nextUrl);
  };

  const handleTabChange = (tab: ToolTab) => {
    setActiveTab(tab);
    replaceResultUrl(null);
    setErrorBanner(null);
  };

  const handleFilesAdded = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    replaceResultUrl(null);

    if (activeTab === "merge") {
      const accepted: PdfQueueFile[] = [];
      const skipped: string[] = [];

      for (const file of fileArray) {
        const isPdf =
          file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          skipped.push(`"${file.name}" isn't a PDF`);
          continue;
        }

        const sizeCheck = validateUploadSize(
          file,
          MAX_PDF_FILE_BYTES,
          "Compress it before merging.",
        );
        if (!sizeCheck.ok) {
          skipped.push(sizeCheck.message ?? `"${file.name}" is too large`);
          continue;
        }

        accepted.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
        });
      }

      const room = Math.max(0, MAX_PDF_FILES - pdfQueue.length);
      if (accepted.length > room) {
        skipped.push(
          `Only ${MAX_PDF_FILES} files can be queued at once; ${accepted.length - room} weren't added`,
        );
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

      if (accepted.length > 0) {
        setPdfQueue((prev) => [...prev, ...accepted.slice(0, Math.max(room, 0))]);
      }
    } else {
      const accepted: ImageQueueFile[] = [];
      const skipped: string[] = [];

      for (const file of fileArray) {
        const isImage = file.type.startsWith("image/") || isHeicFile(file);
        if (!isImage) {
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

        accepted.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          previewUrl: isHeicFile(file) ? "" : URL.createObjectURL(file),
        });
      }

      const room = Math.max(0, MAX_PDF_FILES - imageQueue.length);
      if (accepted.length > room) {
        skipped.push(
          `Only ${MAX_PDF_FILES} images can be queued at once; ${accepted.length - room} weren't added`,
        );
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

      if (accepted.length > 0) {
        setImageQueue((prev) => [...prev, ...accepted.slice(0, Math.max(room, 0))]);
      }
    }
  };

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
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  // Reordering functions
  const moveItem = (index: number, direction: "up" | "down") => {
    if (activeTab === "merge") {
      const newQueue = [...pdfQueue];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newQueue.length) return;
      const [item] = newQueue.splice(index, 1);
      newQueue.splice(targetIndex, 0, item);
      setPdfQueue(newQueue);
    } else {
      const newQueue = [...imageQueue];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newQueue.length) return;
      const [item] = newQueue.splice(index, 1);
      newQueue.splice(targetIndex, 0, item);
      setImageQueue(newQueue);
    }
  };

  const removeItem = (id: string) => {
    if (activeTab === "merge") {
      setPdfQueue((prev) => prev.filter((item) => item.id !== id));
    } else {
      setImageQueue((prev) => {
        const item = prev.find((i) => i.id === id);
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
        return prev.filter((i) => i.id !== id);
      });
    }
  };

  const clearQueue = () => {
    if (activeTab === "image-to-pdf") {
      imageQueue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setImageQueue([]);
    } else {
      setPdfQueue([]);
    }
    replaceResultUrl(null);
  };

  // Execute Processing
  const handleProcess = async () => {
    if (activeTab === "merge" && pdfQueue.length < 2) {
      setErrorBanner("Select at least two PDF files to merge.");
      return;
    }

    if (activeTab === "image-to-pdf" && imageQueue.length === 0) {
      setErrorBanner("Select at least one image to convert.");
      return;
    }

    setErrorBanner(null);
    setIsModalOpen(true);
    setModalProgress(5);
    replaceResultUrl(null);

    try {
      let finalBlob: Blob;
      let outputFileName = "";

      if (activeTab === "merge") {
        outputFileName = `dextrokit-merged-${Date.now()}.pdf`;
        finalBlob = await mergePdfFiles(
          pdfQueue.map((item) => item.file),
          (progress, status) => {
            setModalProgress(progress);
            setModalStatus(status);
          }
        );
      } else {
        outputFileName = `dextrokit-images-${Date.now()}.pdf`;
        finalBlob = await convertImagesToPdf(
          imageQueue.map((item) => item.file),
          { orientation, margin },
          (progress, status) => {
            setModalProgress(progress);
            setModalStatus(status);
          }
        );
      }

      replaceResultUrl(URL.createObjectURL(finalBlob));
      setResultPdfSize(finalBlob.size);
      setResultPdfName(outputFileName);

      setModalProgress(100);
      setModalStatus("Your PDF is ready!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Something went wrong while processing your PDF.";
      setErrorBanner(msg);
      setIsModalOpen(false);
    }
  };

  const currentCount = activeTab === "merge" ? pdfQueue.length : imageQueue.length;

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

              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-300">
                <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
                Zero Server Storage
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-rose-300">
                <FileText className="size-4 text-rose-400" />
                PDF &amp; Document Utilities
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Your All-in-One PDF Suite,{" "}
                <span className="bg-gradient-to-r from-rose-300 via-pink-200 to-indigo-300 bg-clip-text text-transparent">
                  Free &amp; Private
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Merge PDFs or turn photos into polished, print-ready A4 PDFs.
                Everything runs 100% locally in your browser — your files are never uploaded.
              </p>
            </div>

            {/* Top Leaderboard Ad */}
            <div className="mt-8">
              <AdSlot type="banner-728" />
            </div>

            {/* Mode Selector Tabs */}
            <div className="mt-8 flex justify-center sm:justify-start">
              <div className="inline-flex rounded-2xl border border-white/10 bg-[#080b13]/90 p-1.5 shadow-xl backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => handleTabChange("merge")}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === "merge"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FolderSync className="size-4" />
                  Merge PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("image-to-pdf")}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    activeTab === "image-to-pdf"
                      ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Images className="size-4" />
                  Images to PDF
                </button>
              </div>
            </div>

            {/* Dropzone Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative mt-6 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                isDragging
                  ? "border-rose-400 bg-rose-500/[0.08] shadow-[0_0_50px_-10px_rgba(251,113,133,0.3)] scale-[1.01]"
                  : "border-white/15 bg-white/[0.02] hover:border-rose-400/50 hover:bg-white/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={
                  activeTab === "merge"
                    ? "application/pdf,.pdf"
                    : "image/*,.heic,.HEIC,.heif,.HEIF"
                }
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
                aria-label="Upload files"
              />

              <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-rose-300 shadow-xl shadow-rose-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-rose-400/40">
                <UploadCloud className="size-8" />
              </div>

              <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                Drag &amp; drop your files here, or{" "}
                <span className="text-rose-300 underline underline-offset-4">
                  choose files from your device
                </span>
              </h2>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                {activeTab === "merge"
                  ? "Select two or more PDF files to combine them into one clean document."
                  : "Works with JPG, PNG, WebP, and iPhone photos (.HEIC) — all in a single PDF."}
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

            {/* Controls & Queue List */}
            {currentCount > 0 && (
              <div className="mt-10 space-y-6">
                {/* Image-to-PDF Specific Settings Bar */}
                {activeTab === "image-to-pdf" && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0b0e17]/90 p-4 backdrop-blur-xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-medium text-zinc-400">Page orientation:</span>
                      <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
                        {(["auto", "portrait", "landscape"] as ImageToPdfOrientation[]).map(
                          (opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setOrientation(opt)}
                              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                                orientation === opt
                                  ? "bg-rose-500 text-white"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              {opt === "auto" ? "Auto" : opt === "portrait" ? "Portrait" : "Landscape"}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-medium text-zinc-400">Margin:</span>
                      <div className="inline-flex rounded-lg border border-white/10 bg-black/40 p-1">
                        {(["none", "small", "standard"] as ImageToPdfMargin[]).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setMargin(opt)}
                            className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                              margin === opt
                                ? "bg-rose-500 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            {opt === "none" ? "None" : opt === "small" ? "Small" : "Standard"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Queue Action Toolbar */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-zinc-400">
                    Files in queue: <strong className="text-white">{currentCount}</strong> — use the
                    ↑ ↓ arrows to reorder
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearQueue}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="size-3.5" />
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={handleProcess}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:scale-[1.02] hover:opacity-95"
                    >
                      <Sparkles className="size-3.5" />
                      {activeTab === "merge" ? "Merge PDFs" : "Convert to PDF"}
                    </button>
                  </div>
                </div>

                {/* Queue Items */}
                <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-[#080b13]/80 backdrop-blur-md">
                  {activeTab === "merge"
                    ? pdfQueue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-bold text-rose-300">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-100" title={item.file.name}>
                                {item.file.name}
                              </p>
                              <span className="text-xs text-zinc-400">
                                {formatFileSize(item.file.size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveItem(index, "up")}
                              disabled={index === 0}
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(index, "down")}
                              disabled={index === pdfQueue.length - 1}
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-red-400"
                              title="Remove file"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    : imageQueue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-bold text-rose-300">
                              {index + 1}
                            </span>
                            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/50">
                              {item.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.previewUrl}
                                  alt={item.file.name}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-rose-300">HEIC</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-100" title={item.file.name}>
                                {item.file.name}
                              </p>
                              <span className="text-xs text-zinc-400">
                                {formatFileSize(item.file.size)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveItem(index, "up")}
                              disabled={index === 0}
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(index, "down")}
                              disabled={index === imageQueue.length - 1}
                              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-red-400"
                              title="Remove file"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            )}

            {/* Output Download Banner */}
            {resultPdfUrl && (
              <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                      <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        Your PDF is ready
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {resultPdfName} ({formatFileSize(resultPdfSize)}) • 100% Client-Side Rendered
                      </p>
                    </div>
                  </div>

                  <a
                    href={resultPdfUrl}
                    download={resultPdfName}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300"
                  >
                    <Download className="size-4" />
                    Download PDF
                  </a>
                </div>
              </div>
            )}

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
                <Info className="size-3.5" />
                Guide &amp; Data Security
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to Merge PDFs &amp; Convert Images to PDF
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                The DextroKit PDF Suite makes quick work of reports, contracts, class assignments,
                and official forms — producing clean, standard PDF files without another monthly subscription.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-rose-500/20 text-xs font-bold text-rose-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Pick your mode</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Use the &apos;Merge PDF&apos; tab to combine multiple PDFs, or &apos;Images to PDF&apos;
                    to turn a photo gallery into a single PDF file.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-pink-500/20 text-xs font-bold text-pink-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Set the order &amp; layout</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Arrange the files with the up and down arrows. For photos, choose a margin and
                    page orientation (A4 portrait or landscape).
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Download your PDF instantly</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Click the merge or convert button to render the PDF right in your browser. Download the result
                    in seconds, with no added watermark.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-5 text-sm leading-relaxed text-zinc-400 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Full privacy for your sensitive documents
                </h3>
                <p>
                  Combining financial reports, copies of your ID, pay stubs, signed contracts, or medical
                  records on an unfamiliar third-party site can put that data at risk. At DextroKit, every
                  page is rendered by pdf-lib, a client-side JavaScript engine that runs in isolation on your
                  own device — so there is no upload step and nothing to leak.
                </p>
                <p>
                  Your files never travel across the internet to reach our servers. Your laptop or phone
                  is the only place your document is processed.
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
      />

      <Footer />
    </div>
  );
}
