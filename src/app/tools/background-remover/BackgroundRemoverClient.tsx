"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Info,
  Palette,
  RotateCcw,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import { formatFileSize } from "@/lib/image-converter";
import { MAX_BG_SOURCE_BYTES, removeImageBackground } from "@/lib/bg-remover";
import { validateUploadSize } from "@/lib/limits";

const COLOR_PRESETS = [
  { label: "Transparent", value: "transparent" },
  { label: "White", value: "#ffffff" },
  { label: "Passport Red", value: "#dc2626" },
  { label: "Passport Blue", value: "#2563eb" },
  { label: "Black", value: "#000000" },
  { label: "Gray", value: "#64748b" },
];

const FAQ_ITEMS = [
  {
    q: "How does the AI background remover work in this browser?",
    a: "OmniTools runs a lightweight deep learning model optimized for WebAssembly and WebGL. The model downloads once into your browser cache, then analyzes the image and cuts out the subject — a person, pet, or product — pixel by pixel, entirely in your device's memory.",
  },
  {
    q: "Are my passport or ID card photos safe?",
    a: "Yes — 100%. Unlike sites that upload your photo to a cloud server, OmniTools never sends your photo off your computer or phone. Personal, family, and official-document photos stay completely private.",
  },
  {
    q: "Can I change the background color for a passport photo (red or blue)?",
    a: "Yes. Choose the Passport Red or Passport Blue preset, or pick any shade with the custom color picker. Your new background is applied instantly and exported as a high-quality PNG. Requirements vary by country, though, so check your local requirements before printing.",
  },
  {
    q: "Why does the first photo take a few seconds to process?",
    a: "On first use, your browser downloads the ~30 MB IS-Net model, which is then stored permanently in your browser cache. On every photo after that, processing is much faster because the model is already available locally.",
  },
];

export function BackgroundRemoverClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  // Background Customization
  const [bgColor, setBgColor] = useState<string>("transparent");
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Processing & Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // UI state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  // Clean up object URLs only when the component unmounts from the DOM
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif|jpg|jpeg|png|webp)$/i)) {
      setErrorBanner("Choose a valid image file (JPG, PNG, WebP, HEIC).");
      return;
    }

    const sizeCheck = validateUploadSize(
      file,
      MAX_BG_SOURCE_BYTES,
      "Resize or compress it before removing the background.",
    );
    if (!sizeCheck.ok) {
      setErrorBanner(sizeCheck.message ?? "That image is too large.");
      return;
    }

    setErrorBanner(null);

    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

    const originalUrl = URL.createObjectURL(file);
    originalUrlRef.current = originalUrl;
    resultUrlRef.current = null;

    setSelectedFile(file);
    setOriginalImageUrl(originalUrl);
    setResultBlob(null);
    setResultImageUrl(null);
    setBgColor("transparent");
    setShowOriginal(false);

    // Automatically trigger removal on upload
    setIsModalOpen(true);
    setModalProgress(5);
    setModalStatus("Preparing the AI segmentation model...");

    try {
      const transparentBlob = await removeImageBackground(file, (progress, status) => {
        setModalProgress(progress);
        setModalStatus(status);
      });

      const transUrl = URL.createObjectURL(transparentBlob);
      resultUrlRef.current = transUrl;
      setResultBlob(transparentBlob);
      setResultImageUrl(transUrl);
      setModalProgress(100);
      setModalStatus("Background removed successfully!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "The image couldn't be processed.";
      setErrorBanner(msg);
      setIsModalOpen(false);
    }
  };

  const handleReset = () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    originalUrlRef.current = null;
    resultUrlRef.current = null;

    setSelectedFile(null);
    setOriginalImageUrl(null);
    setResultBlob(null);
    setResultImageUrl(null);
    setBgColor("transparent");
    setShowOriginal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Download logic (handles transparent or colored background)
  const handleDownload = async () => {
    if (!resultImageUrl || !selectedFile) return;

    if (bgColor === "transparent" && resultBlob) {
      const a = document.createElement("a");
      a.href = resultImageUrl;
      a.download = `omnitools-transparent-${selectedFile.name.replace(/\.[^/.]+$/, "")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // If color is set, draw onto canvas with that background
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw subject on top
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `omnitools-bg-${selectedFile.name.replace(/\.[^/.]+$/, "")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.src = resultImageUrl;
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

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local ONNX AI Engine
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-emerald-300">
                <WandSparkles className="size-4 text-emerald-400" />
                AI Auto Background Removal
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Remove Photo Backgrounds{" "}
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                  Automatically with AI
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Get a clean transparent PNG or swap in a passport-photo background color
                (red or blue) in seconds. Everything runs locally in your browser — no uploads.
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
                    handleFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-14 ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-500/[0.08] shadow-[0_0_50px_-10px_rgba(52,211,153,0.3)] scale-[1.01]"
                    : "border-white/15 bg-white/[0.02] hover:border-emerald-400/50 hover:bg-white/[0.04]"
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
                  aria-label="Upload a photo to remove its background"
                />

                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-emerald-300 shadow-xl shadow-emerald-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-emerald-400/40">
                  <UploadCloud className="size-8" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                  Drag &amp; drop a photo here, or{" "}
                  <span className="text-emerald-300 underline underline-offset-4">
                    choose a file from your device
                  </span>
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Supports portraits, e-commerce product shots, pets, and signatures (JPG, PNG, WebP, HEIC).
                </p>
              </div>
            ) : (
              /* Result & Customization Workspace */
              <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#080b13]/90 shadow-2xl backdrop-blur-xl">
                  {/* Top Bar Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className="size-4 text-emerald-400 shrink-0" />
                      <span className="truncate text-sm font-semibold text-zinc-100">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <RotateCcw className="size-3.5" />
                      Change Photo
                    </button>
                  </div>

                  {/* Image Preview Canvas with Background Style */}
                  <div className="relative flex min-h-[380px] items-center justify-center p-6 sm:p-10 select-none">
                    {/* Checkerboard Pattern Container */}
                    <div
                      style={{
                        backgroundColor: bgColor === "transparent" ? undefined : bgColor,
                      }}
                      className={`relative flex max-h-[420px] max-w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 p-4 shadow-2xl transition-colors ${
                        bgColor === "transparent"
                          ? "bg-[linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] bg-zinc-900"
                          : ""
                      }`}
                    >
                      {/* Floating Indicator Badge */}
                      <div className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md shadow-lg">
                        {showOriginal ? (
                          <>
                            <Eye className="size-3 text-amber-400" />
                            <span>Original Photo</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3 text-emerald-400" />
                            <span>{bgColor === "transparent" ? "Transparent (AI)" : "Colored Background (AI)"}</span>
                          </>
                        )}
                      </div>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={showOriginal ? "original" : "result"}
                        src={showOriginal ? (originalImageUrl || "") : (resultImageUrl || originalImageUrl || "")}
                        alt={showOriginal ? "Original photo" : "Photo subject with the background removed"}
                        className="max-h-[360px] w-auto max-w-full object-contain drop-shadow-xl"
                      />
                    </div>
                  </div>

                  {/* Background Customizer Toolbar */}
                  <div className="space-y-4 border-t border-white/[0.08] p-5 sm:p-6 bg-white/[0.01]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Color Presets */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                          <Palette className="size-3.5 text-emerald-400" />
                          Background Color:
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setBgColor(preset.value)}
                              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                                bgColor === preset.value
                                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-sm shadow-emerald-500/30"
                                  : "border-white/10 bg-black/40 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                              }`}
                            >
                              {preset.value !== "transparent" && (
                                <span
                                  style={{ backgroundColor: preset.value }}
                                  className="size-3 rounded-full border border-white/20"
                                />
                              )}
                              {preset.label}
                            </button>
                          ))}

                          {/* Custom Color Input */}
                          <label
                            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white"
                            title="Choose a custom color"
                          >
                            <input
                              type="color"
                              value={bgColor === "transparent" ? "#ffffff" : bgColor}
                              onChange={(e) => setBgColor(e.target.value)}
                              className="size-4 cursor-pointer appearance-none rounded border-0 bg-transparent"
                            />
                            Custom
                          </label>
                        </div>
                      </div>

                      {/* Before / After Preview Button */}
                      <button
                        type="button"
                        onClick={() => setShowOriginal((prev) => !prev)}
                        onPointerDown={() => setShowOriginal(true)}
                        onPointerUp={() => setShowOriginal(false)}
                        onPointerLeave={() => setShowOriginal(false)}
                        onPointerCancel={() => setShowOriginal(false)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all select-none ${
                          showOriginal
                            ? "border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md shadow-amber-500/20"
                            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10 hover:text-white"
                        }`}
                        title="Hold or click to view the original photo"
                      >
                        {showOriginal ? (
                          <>
                            <EyeOff className="size-3.5 text-amber-400" />
                            <span>Showing Original (Click/Release)</span>
                          </>
                        ) : (
                          <>
                            <Eye className="size-3.5 text-zinc-400" />
                            <span>Compare with Original (Hold/Click)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-4">
                      <span className="text-xs text-emerald-300/80">
                        ✓ AI segmentation completed in your browser
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                        >
                          New Photo
                        </button>

                        <button
                          type="button"
                          onClick={handleDownload}
                          disabled={!resultImageUrl}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300 disabled:opacity-50"
                        >
                          <Download className="size-4" />
                          Download Image ({bgColor === "transparent" ? "Transparent PNG" : "With Background"})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model Cache Notice */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-emerald-300">💡 About the AI Model:</span> The IS-Net
              segmentation model is downloaded once (~30 MB) and cached automatically in your browser.
              Future runs start fast with no re-download needed.
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide Section (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Info className="size-3.5" />
                AI Background Removal Guide
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to Remove a Photo Background Automatically
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Cutting the background out of product photos for your online store, making WhatsApp stickers,
                or changing the background color on a job-application photo no longer takes Photoshop skills.
                OmniTools AI Background Remover works in 3 instant steps:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Upload Photo</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Choose a JPG, PNG, WebP, or iPhone (.HEIC) photo. The AI model scans the subject instantly.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-teal-500/20 text-xs font-bold text-teal-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Change Background Color</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Pick a pure transparent background or switch to passport red or blue in one click.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-sky-500/20 text-xs font-bold text-sky-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Download HD Image</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Download a high-quality, full-resolution PNG with no watermark — free forever.
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
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-emerald-300"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-emerald-300" : ""
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
