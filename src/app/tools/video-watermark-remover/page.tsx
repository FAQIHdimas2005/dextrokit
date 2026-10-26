import type { Metadata } from "next";
import { VideoWatermarkRemoverClient } from "./VideoWatermarkRemoverClient";

export const metadata: Metadata = {
  title: "Blur or Censor Video Watermarks Online — Free & Private",
  description:
    "Select a logo, username stamp, or date on your video and blur or remove it with an FFmpeg Delogo filter — processed locally in your browser, with no upload.",
  keywords: [
    "blur watermark in video online",
    "censor watermark video",
    "video watermark blur",
    "remove logo from video",
    "delogo video online",
    "blur logo in video free",
    "video censor tool",
  ],
  alternates: { canonical: "/tools/video-watermark-remover" },
  openGraph: {
    title: "Video Watermark Blur & Censor — DextroKit",
    description:
      "Draw a box over any logo and blur or remove it instantly, right in your browser.",
    type: "website",
    url: "/tools/video-watermark-remover",
  },
};

export default function VideoWatermarkRemoverPage() {
  return <VideoWatermarkRemoverClient />;
}
