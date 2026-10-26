import type { Metadata } from "next";
import { ImageWatermarkRemoverClient } from "./ImageWatermarkRemoverClient";

export const metadata: Metadata = {
  title: "AI Watermark Remover for Photos — Free, No Sign-Up",
  description:
    "Brush over watermarks, logos, dates, or distracting objects and let AI inpainting rebuild the texture behind them. Works with JPG, PNG, WebP, and HEIC images.",
  keywords: [
    "remove watermark from photo",
    "free ai watermark remover",
    "lama inpainting watermark remover",
    "remove text from image without blur",
    "ai inpainting brush",
    "object removal photo editor",
    "photo cleanup ai",
  ],
  alternates: { canonical: "/tools/image-watermark-remover" },
  openGraph: {
    title: "AI Image Watermark Remover — DextroKit",
    description:
      "Paint over the logo or text you want gone and let the LaMa inpainting model rebuild a clean, natural image.",
    type: "website",
    url: "/tools/image-watermark-remover",
  },
};

export default function ImageWatermarkRemoverPage() {
  return <ImageWatermarkRemoverClient />;
}
