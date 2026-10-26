import type { Metadata } from "next";
import { AudioExtractorClient } from "./AudioExtractorClient";

export const metadata: Metadata = {
  title: "Video to MP3 & WAV Audio Extractor — Free, No Upload",
  description:
    "Extract sound, music, or voice-overs from MP4, MKV, MOV, or WebM video as MP3 up to 320 kbps or lossless WAV in seconds. Decoded 100% in your browser.",
  keywords: [
    "extract audio from video",
    "mp4 to mp3 online",
    "free video to audio converter",
    "get song from video",
    "audio extractor no upload",
    "convert video to mp3 320kbps",
    "mp4 to lossless wav",
  ],
  alternates: { canonical: "/tools/audio-extractor" },
  openGraph: {
    title: "Video to Audio Extractor (MP3 / WAV) — OmniTools",
    description:
      "Pull crisp MP3 or lossless WAV audio out of any video, straight from browser memory. Free and private.",
    type: "website",
    url: "/tools/audio-extractor",
  },
};

export default function AudioExtractorPage() {
  return <AudioExtractorClient />;
}
