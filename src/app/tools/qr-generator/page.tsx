import type { Metadata } from "next";
import { QrGeneratorClient } from "./QrGeneratorClient";

export const metadata: Metadata = {
  title: "Custom QR Code Generator — Free PNG & SVG Download",
  description:
    "Design high-resolution QR codes for links, text, Wi-Fi, email, or contacts with custom colors, gradients, logos, and shapes. Export PNG, WebP, or vector SVG — no expiry and no scan limits.",
  keywords: [
    "free qr code generator",
    "wifi qr code generator",
    "whatsapp qr code",
    "custom color qr code",
    "download qr code svg",
    "high resolution qr png",
    "qr code with logo",
  ],
  alternates: { canonical: "/tools/qr-generator" },
  openGraph: {
    title: "Custom QR Code Generator — OmniTools",
    description:
      "Create branded, high-resolution QR codes for websites, Wi-Fi, and contacts, rendered entirely in your browser.",
    type: "website",
    url: "/tools/qr-generator",
  },
};

export default function QrGeneratorPage() {
  return <QrGeneratorClient />;
}
