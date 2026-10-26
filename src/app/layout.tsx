import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteTitle =
  "OmniTools — Free Online Image Converter, Background Remover & PDF Tools";
const siteDescription =
  "Free online tools to convert images, remove backgrounds, compress video, extract audio, merge PDFs, and design QR codes. Everything runs in your browser — 100% client-side privacy, no uploads, no server storage.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteTitle} — 100% Private`,
    template: "%s — OmniTools",
  },
  description: siteDescription,
  applicationName: siteConfig.name,
  keywords: [
    "free online image converter",
    "remove background from image",
    "video compressor online",
    "video to mp3 converter",
    "merge pdf online free",
    "image to pdf converter",
    "qr code generator",
    "heic to jpg",
    "watermark remover",
    "private file tools",
    "client-side processing",
    "no upload file converter",
  ],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: siteTitle,
    description:
      "Convert, compress, and edit files right in your browser. Free, fast, and 100% private — your files never leave your device.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description:
      "Convert, compress, and edit files right in your browser. Free, fast, and 100% private — your files never leave your device.",
    images: ["/og-image.png"],
    creator: "@omnitools",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#05070c",
  width: "device-width",
  initialScale: 1,
};

/**
 * Structured data for rich results. Static, developer-authored JSON only — never
 * interpolate user input here. `<` is escaped so the payload cannot break out of
 * the script element.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteDescription,
      inLanguage: "en-US",
      publisher: { "@id": `${siteConfig.url}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteConfig.url}/?q={search_term_string}#tools`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      description:
        "OmniTools builds free, privacy-first web utilities that process files entirely in the browser.",
    },
    {
      "@type": "WebApplication",
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (modern web browser)",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList:
        "Image format conversion, AI background removal, AI watermark removal, video compression, video watermark blur, audio extraction, PDF merging, QR code design",
    },
  ],
} as const;

const serializedStructuredData = JSON.stringify(structuredData).replace(
  /</g,
  "\\u003c",
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only z-[200] rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to main content
        </a>
        {children}
        <script
          type="application/ld+json"
          // Static, build-time JSON with `<` escaped above — no user input involved.
          dangerouslySetInnerHTML={{ __html: serializedStructuredData }}
        />
      </body>
    </html>
  );
}
