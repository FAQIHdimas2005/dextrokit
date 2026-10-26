import type { Metadata } from "next";
import { PdfToolsClient } from "./PdfToolsClient";

export const metadata: Metadata = {
  title: "Merge PDF & Convert Images to PDF Online Free — 100% Private",
  description:
    "Merge several PDFs into one document or turn a batch of JPG, PNG, WebP, and HEIC images into a print-ready A4 PDF. Runs entirely in your browser — nothing is uploaded.",
  keywords: [
    "merge pdf online",
    "free pdf merger",
    "images to pdf",
    "jpg to pdf",
    "photo to pdf without uploading",
    "private pdf merger",
    "image to pdf converter",
  ],
  alternates: { canonical: "/tools/pdf-tools" },
  openGraph: {
    title: "PDF Merger & Image to PDF Converter — DextroKit",
    description:
      "Combine PDFs or convert photos into a single PDF directly in your browser, free and completely private.",
    type: "website",
    url: "/tools/pdf-tools",
  },
};

export default function PdfToolsPage() {
  return <PdfToolsClient />;
}
