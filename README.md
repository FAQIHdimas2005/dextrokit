# DextroKit

A privacy-first platform of browser-based file utilities built with **Next.js 15 (App Router)**,
**React 19**, **TypeScript**, and **Tailwind CSS v4**.

Every conversion, edit, and export runs on the visitor's device using WebAssembly, WebGL, Canvas,
and ONNX. Files are never uploaded for the client-side tools, so there is no server copy to leak,
no upload queue, and no quota.

## Tools

| Tool | Route | Engine |
| --- | --- | --- |
| Image Format Converter | `/tools/image-converter` | Canvas + `heic2any` |
| PDF Merger & Converter | `/tools/pdf-tools` | `pdf-lib` |
| Video to Audio Extractor | `/tools/audio-extractor` | Web Audio API + LAME |
| Video Converter & Compressor | `/tools/video-converter` | FFmpeg WASM |
| Video Watermark Blur & Censor | `/tools/video-watermark-remover` | FFmpeg WASM (`delogo` / `boxblur`) |
| AI Background Remover | `/tools/background-remover` | IS-Net via `@imgly/background-removal` |
| AI Image Watermark Remover | `/tools/image-watermark-remover` | LaMa inpainting (`/api/inpaint`) |
| QR Code Generator | `/tools/qr-generator` | `qr-code-styling` |

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000 (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (next/core-web-vitals + next/typescript)
```

### Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used for metadata, `sitemap.xml`, and `robots.txt` | `https://dextrokit.vercel.app` |
| `INPAINT_PYTHON_BIN` | Python 3 interpreter used by the LaMa endpoint | `python` (Windows) / `python3` |

The AI inpainting endpoint additionally needs `scripts/inpaint_lama.py` plus
`models/inpainting_lama.onnx` (and `onnxruntime`, `numpy`, `Pillow`). Without them the endpoint
returns a clear `503` and the rest of the platform keeps working.

## Architecture notes

- `src/app/tools/**/<Tool>Client.tsx` — interactive tool UI, all state kept client-side.
- `src/lib/*` — processing engines and shared helpers (`image-converter`, `pdf-tools`,
  `audio-extractor`, `video-ffmpeg`, `bg-remover`, `image-inpainting`).
- `src/lib/sanitize.ts` — URI-scheme allowlists, Wi-Fi/vCard escaping, and SVG output checks for
  the QR generator.
- `src/lib/limits.ts` — upload guardrails that turn out-of-memory crashes into readable warnings.
- `public/ffmpeg/**` — self-hosted single-thread FFmpeg core (with CDN fallbacks in
  `src/lib/video-ffmpeg.ts`).

## Security posture

- `next.config.ts` sets clickjacking, MIME-sniffing, referrer, and permissions headers on every
  response, plus COOP site-wide. COEP `require-corp` is scoped to the two FFmpeg routes so the
  AI background remover can still fetch its model assets from a CDN. A CSP is shipped in
  report-only mode pending a field audit of `wasm-unsafe-eval` and blob worker usage.
- `/api/inpaint` enforces a 25 MB streaming body cap, PNG/JPEG/WebP magic-byte validation, a
  PNG-only mask, per-IP rate limiting, UUID temp directories, a 120 s process timeout, and
  `try/finally` cleanup of every temporary file.
- Object URLs are tracked in refs and revoked on replacement and unmount; FFmpeg is terminated
  when leaving a video tool.

## Documentation

- [Next.js documentation](https://nextjs.org/docs)
- [FFmpeg.wasm](https://ffmpegwasm.netlify.app/)
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)
