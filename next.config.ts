import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Baseline hardening applied to every response.
 *
 * Notes:
 * - `X-Frame-Options: DENY` blocks clickjacking. `frame-ancestors` in the CSP
 *   report below is the modern equivalent and is kept in sync.
 * - `Referrer-Policy` keeps full URLs (which can contain search terms) out of
 *   cross-origin requests while still allowing same-origin analytics.
 * - `Permissions-Policy` disables device capabilities no tool needs.
 * - COOP is safe site-wide: the app never relies on `window.opener` or popups.
 */
const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), midi=(), display-capture=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

/**
 * Content-Security-Policy shipped in report-only mode.
 *
 * Enforcing this today would require auditing every WASM/worker path
 * (`wasm-unsafe-eval`, `worker-src blob:`), the FFmpeg CDN fallback, and the
 * IS-Net model fetch. Report-only collects those violations in the field so the
 * policy can be tightened and then enforced without breaking tools.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data: https:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const reportOnlyHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

/**
 * FFmpeg WASM performs best (and can use SharedArrayBuffer) in a cross-origin
 * isolated document. `require-corp` is therefore scoped to the two routes that
 * actually run FFmpeg, instead of the whole site: the AI background remover
 * pulls model assets from a third-party CDN, and applying `require-corp`
 * globally would block those no-cors asset requests.
 *
 * All FFmpeg assets are self-hosted under /public/ffmpeg (same-origin), and the
 * CDN fallbacks are fetched with CORS, so neither is blocked here.
 */
const crossOriginIsolatedRoutes = [
  "/tools/video-converter",
  "/tools/video-converter/:path*",
  "/tools/video-watermark-remover",
  "/tools/video-watermark-remover/:path*",
];

const crossOriginIsolatedHeaders = [
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...baseSecurityHeaders, ...reportOnlyHeaders],
      },
      {
        // Immutable, content-hashed build assets.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Self-hosted FFmpeg core assets. `.wasm` is already served with
        // `application/wasm` by Next, so only caching and CORP are added here
        // (forcing a content type would break the sibling .js loader).
        source: "/ffmpeg/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      ...crossOriginIsolatedRoutes.map((source) => ({
        source,
        headers: crossOriginIsolatedHeaders,
      })),
    ];
  },
};

export default nextConfig;
