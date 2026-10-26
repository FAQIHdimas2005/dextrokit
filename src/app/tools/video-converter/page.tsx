import type { Metadata } from "next";
import { VideoConverterClient } from "./VideoConverterClient";

export const metadata: Metadata = {
  title: "Free Video Converter & Compressor (MP4, WebM, GIF)",
  description:
    "Convert MKV, MOV, AVI, or WebM to MP4 and shrink video size by up to 80% with FFmpeg running in your browser. No uploads, no quotas, no watermark.",
  keywords: [
    "free online video converter",
    "compress video without losing quality",
    "mkv to mp4 online",
    "mov to mp4 converter",
    "video to gif",
    "video compressor no upload",
    "ffmpeg wasm video converter",
  ],
  alternates: { canonical: "/tools/video-converter" },
  openGraph: {
    title: "Video Converter & Compressor — OmniTools",
    description:
      "Change video format and cut file size with no quotas, straight from your browser.",
    type: "website",
    url: "/tools/video-converter",
  },
};

export default function VideoConverterPage() {
  return <VideoConverterClient />;
}
