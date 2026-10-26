"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  AudioLines,
  CheckCircle2,
  ChevronDown,
  Download,
  Film,
  Info,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { ProcessingModal } from "@/components/ProcessingModal";
import { formatFileSize } from "@/lib/image-converter";
import {
  extractAudioFromVideoFile,
  formatDuration,
  MAX_AUDIO_SOURCE_BYTES,
  type AudioBitrate,
  type AudioOutputFormat,
  type ExtractedAudioResult,
} from "@/lib/audio-extractor";
import { validateUploadSize } from "@/lib/limits";

const FAQ_ITEMS = [
  {
    q: "Why is audio extraction in OmniTools so fast (just 1–2 seconds)?",
    a: "OmniTools pairs the browser's native Web Audio API with a pure JavaScript LAME MP3 encoder. Instead of uploading a multi-megabyte video to a sluggish cloud server, your device's CPU splits the audio waveform instantly in local RAM.",
  },
  {
    q: "What's the difference between MP3 and WAV?",
    a: "MP3 is a highly efficient compressed format that keeps files small and plays on phones, car stereos, and virtually every music player. Choose 128 kbps for the smallest files, 192 kbps for a balance of size and clarity, or 320 kbps for the best quality, practically indistinguishable from the original recording. WAV is uncompressed lossless audio at CD quality, so files are larger but every sample is preserved, making it the better choice for professional editing.",
  },
  {
    q: "Is there a limit to the video size I can extract?",
    a: "Because all processing happens in your browser's RAM, there's no server quota. For the best experience, especially on phones and tablets, we recommend videos under 30 minutes or under 150 MB so you don't exceed your mobile browser's memory allocation.",
  },
  {
    q: "Is my video safe, or could it leak online?",
    a: "100% guaranteed. Your video is never sent to our servers. The entire audio extraction runs locally and in isolation inside your browser tab.",
  },
];

export function AudioExtractorClient() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Settings
  const [format, setFormat] = useState<AudioOutputFormat>("mp3");
  const [bitrate, setBitrate] = useState<AudioBitrate>(320);

  // Modal & Processing State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalProgress, setModalProgress] = useState<number>(0);
  const [modalStatus, setModalStatus] = useState<string>("");

  // Result State
  const [result, setResult] = useState<ExtractedAudioResult | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Guardrail state
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  useEffect(() => {
    previewUrlRef.current = videoPreviewUrl;
  }, [videoPreviewUrl]);

  useEffect(() => {
    resultUrlRef.current = result?.url ?? null;
  }, [result]);

  // Revoke object URLs only when the component unmounts. Revoking on every
  // dependency change used to break the still-visible preview.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mkv|mov|webm|avi|flv|m4v)$/i)) {
      setErrorBanner("Choose a valid video file (MP4, MKV, MOV, WebM, AVI).");
      return;
    }

    const sizeCheck = validateUploadSize(
      file,
      MAX_AUDIO_SOURCE_BYTES,
      "Audio is decoded in browser memory, so trim or compress the video first.",
    );
    if (!sizeCheck.ok) {
      setErrorBanner(sizeCheck.message ?? "That video is too large.");
      return;
    }

    setErrorBanner(null);

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setVideoPreviewUrl(url);
    setResult(null);
    setVideoDuration(0);
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setSelectedFile(null);
    setVideoPreviewUrl(null);
    setResult(null);
    setVideoDuration(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExtractAudio = async () => {
    if (!selectedFile) return;

    setIsModalOpen(true);
    setModalProgress(5);
    setModalStatus("Initializing the Web Audio player...");

    try {
      const extracted = await extractAudioFromVideoFile(
        selectedFile,
        { format, bitrate },
        (progress, status) => {
          setModalProgress(progress);
          setModalStatus(status);
        }
      );

      setResult(extracted);
      setModalProgress(100);
      setModalStatus("Audio extracted successfully!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Something went wrong while extracting the audio.";
      setErrorBanner(msg);
      setIsModalOpen(false);
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

              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300">
                <span className="size-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Web Audio Engine • 1–2 Seconds Flat
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-indigo-300">
                <AudioLines className="size-4 text-indigo-400" />
                Video to Audio Converter
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Extract Audio from Video{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-purple-200 to-sky-300 bg-clip-text text-transparent">
                  Super Fast &amp; Private
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Turn the music, podcast, or voice track inside any video (MP4, MKV, MOV, WebM, AVI) into
                studio-quality MP3 (320 kbps) or lossless WAV — in seconds, fully offline in your browser.
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

            {/* Dropzone Area (Shown if no file selected) */}
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
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
                    e.target.value = "";
                  }}
                  className="hidden"
                  aria-label="Choose a video to extract audio from"
                />

                <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-indigo-300 shadow-xl shadow-indigo-500/10 transition-transform duration-300 group-hover:scale-110 group-hover:border-indigo-400/40">
                  <Film className="size-8" />
                </div>

                <h2 className="mt-5 text-base font-semibold text-white sm:text-lg">
                  Drag &amp; drop your video here, or{" "}
                  <span className="text-indigo-300 underline underline-offset-4">
                    choose a file from your device
                  </span>
                </h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  Supports MP4, MKV, MOV, WebM, and AVI. Everything is processed instantly in browser memory, with no uploads.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {["MP4", "MKV", "MOV", "WebM", "AVI", "MP3 320kbps", "WAV Lossless"].map(
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
              /* Video Loaded & Workspace Area */
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

                  {/* Video Player Preview */}
                  <div className="p-5 sm:p-8">
                    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
                      <video
                        ref={videoRef}
                        src={videoPreviewUrl || ""}
                        controls
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            setVideoDuration(videoRef.current.duration);
                          }
                        }}
                        className="max-h-[300px] w-full object-contain"
                      />
                    </div>

                    {/* Extraction Settings Toolbar */}
                    <div className="mt-8 rounded-2xl border border-white/10 bg-[#0b0e17]/80 p-5">
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        {/* Format Selection */}
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Output Audio Format:
                          </label>
                          <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
                            <button
                              type="button"
                              onClick={() => setFormat("mp3")}
                              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all ${
                                format === "mp3"
                                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              MP3 (Universal)
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormat("wav")}
                              className={`rounded-lg px-4 py-2 text-xs font-semibold uppercase transition-all ${
                                format === "wav"
                                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              WAV (Lossless CD)
                            </button>
                          </div>
                        </div>

                        {/* Bitrate Selection (For MP3) */}
                        {format === "mp3" && (
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                              MP3 Bitrate:
                            </label>
                            <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
                              {([128, 192, 320] as AudioBitrate[]).map((br) => (
                                <button
                                  key={br}
                                  type="button"
                                  onClick={() => setBitrate(br)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                    bitrate === br
                                      ? "bg-purple-500 text-white shadow-md shadow-purple-500/30"
                                      : "text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {br} kbps
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extract Button */}
                        <div className="sm:self-end">
                          <button
                            type="button"
                            onClick={handleExtractAudio}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:opacity-95 sm:w-auto"
                          >
                            <Sparkles className="size-4" />
                            Extract Audio Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Result Card with Audio Player */}
                {result && (
                  <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-300">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white sm:text-lg">
                          Audio extracted successfully
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {result.fileName} • Duration: {formatDuration(result.duration)} • Size:{" "}
                          {formatFileSize(result.size)}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Audio Player */}
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/50 p-4">
                      <audio
                        src={result.url}
                        controls
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs text-emerald-300/80">
                        ✓ Processed in ~1 second, entirely in your browser
                      </span>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                        >
                          Extract Another Video
                        </button>

                        <a
                          href={result.url}
                          download={result.fileName}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-emerald-400/25 transition-all hover:bg-emerald-300"
                        >
                          <Download className="size-4" />
                          Download {result.format.toUpperCase()}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RAM Guardrail Alert for Mobile */}
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-400">
              <span className="font-semibold text-indigo-300">💡 Performance Tip:</span> Audio extraction
              runs entirely in your device&apos;s RAM. For instant results (1–2 seconds) and to keep a mobile
              browser tab from running out of memory, we recommend videos under 30 minutes or under 150 MB.
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-12">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide (300+ Words) */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Info className="size-3.5" />
                Guide &amp; Audio Details
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to Extract Audio from Video Without Extra Software
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Often you only need the background music, voiceover, podcast, or speech from a YouTube
                video, TikTok clip, or camera recording — without keeping the video file that eats up
                storage. Here&apos;s how to do it in OmniTools:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-500/20 text-xs font-bold text-indigo-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Choose a video</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Add an MP4, MKV, MOV, or WebM file. You can play it right in the preview
                    to confirm it has the audio you want.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-purple-500/20 text-xs font-bold text-purple-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Pick a format &amp; bitrate</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Choose MP3 at up to 320 kbps for studio-quality clarity, or uncompressed WAV
                    if you need the original quality.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Listen &amp; download</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Listen in the built-in player, then download the MP3 or WAV file to your
                    device for free.
                  </p>
                </div>
              </div>

              <div className="mt-10 space-y-5 text-sm leading-relaxed text-zinc-400 border-t border-white/[0.06] pt-8">
                <h3 className="text-lg font-semibold text-zinc-200">
                  Why use a Web Audio API extractor?
                </h3>
                <p>
                  Most online converters require you to upload your video to their servers first. With a
                  100 MB file, that means burning data on the upload, waiting in a slow server queue, then
                  downloading the audio you wanted all along.
                </p>
                <p>
                  With OmniTools, that 100 MB video <strong className="text-white">never leaves your device</strong>.
                  The Web Audio API engine in your browser reads the audio track directly from the local file and
                  extracts it in under 2 seconds. There&apos;s no upload queue and no cap on how many videos you
                  process. Choose MP3 for everyday listening and sharing, or WAV when you plan to edit, mix, or
                  archive the audio. That saves your data and keeps personal audio secure.
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
      />

      <Footer />
    </div>
  );
}
