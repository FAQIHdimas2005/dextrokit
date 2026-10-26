import type { Metadata } from "next";
import { BackgroundRemoverClient } from "./BackgroundRemoverClient";

export const metadata: Metadata = {
  title: "Free AI Background Remover — Transparent PNG, No Upload",
  description:
    "Remove photo backgrounds automatically with on-device AI, then export a transparent PNG or a passport-style solid background. Free, no sign-up, and your images never leave your browser.",
  keywords: [
    "remove background from photo",
    "free background remover",
    "transparent png maker",
    "background remover no upload",
    "passport photo background",
    "change photo background color",
    "ai cutout tool",
  ],
  alternates: { canonical: "/tools/background-remover" },
  openGraph: {
    title: "AI Background Remover — DextroKit",
    description:
      "Cut out any subject with AI that runs in your browser. Free, unlimited, and fully private.",
    type: "website",
    url: "/tools/background-remover",
  },
};

export default function BackgroundRemoverPage() {
  return <BackgroundRemoverClient />;
}
