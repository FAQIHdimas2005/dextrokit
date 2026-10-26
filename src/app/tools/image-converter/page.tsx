import type { Metadata } from "next";
import { ImageConverterClient } from "./ImageConverterClient";

export const metadata: Metadata = {
  title: "Free Image Converter Online (JPG, PNG, WebP, HEIC)",
  description:
    "Convert images between JPG, PNG, WebP, GIF, BMP, and iPhone HEIC instantly in your browser. Batch conversion with quality control — no uploads, no watermarks, 100% private.",
  keywords: [
    "free image converter",
    "heic to jpg",
    "png to webp",
    "jpg to png",
    "batch image converter",
    "convert iphone photos",
    "image converter without uploading",
  ],
  alternates: { canonical: "/tools/image-converter" },
  openGraph: {
    title: "Free Image Converter — JPG, PNG, WebP & HEIC — DextroKit",
    description:
      "Batch-convert photos and graphics at native speed without uploading them to a server.",
    type: "website",
    url: "/tools/image-converter",
  },
};

export default function ImageConverterPage() {
  return <ImageConverterClient />;
}
