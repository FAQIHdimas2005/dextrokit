import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Absolute ceiling for the whole multipart request (image + mask + overhead). */
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_MASK_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 40 * 1024 * 1024;

const PROCESS_TIMEOUT_MS = 120_000;
const MAX_STDERR_CHARS = 4_000;

const RATE_LIMIT = { limit: 10, windowMs: 10 * 60_000 } as const;

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_MASK_TYPES = new Set(["image/png"]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

type SniffedType = "png" | "jpeg" | "webp";

/**
 * Content sniffing. File extensions and client-declared MIME types are
 * attacker-controlled, so the actual byte signature is the source of truth.
 * SVG (and every other format) is implicitly rejected.
 */
function sniffImageType(buffer: Buffer): SniffedType | null {
  if (buffer.length >= 8 && PNG_SIGNATURE.every((byte, i) => buffer[i] === byte)) {
    return "png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

function jsonError(
  message: string,
  status: number,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...headers,
      },
    },
  );
}

/** Read the request body while enforcing a hard byte ceiling (streaming). */
async function readBodyWithLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const body = request.body;
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

function resolvePythonBinary(): string {
  if (process.env.INPAINT_PYTHON_BIN) return process.env.INPAINT_PYTHON_BIN;
  return process.platform === "win32" ? "python" : "python3";
}

function runPythonInpaint(
  pythonBin: string,
  args: string[],
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROCESS_TIMEOUT_MS);

    let stderr = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(pythonBin, args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PYTHONIOENCODING: "utf-8",
          PYTHONDONTWRITEBYTECODE: "1",
          // Keep native math libraries from spawning unbounded worker threads.
          OMP_NUM_THREADS: process.env.OMP_NUM_THREADS ?? "2",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }

    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_STDERR_CHARS) {
        stderr += chunk.toString("utf8").slice(0, MAX_STDERR_CHARS - stderr.length);
      }
    });
    child.stdout?.on("data", () => {
      // Drain stdout so the pipe cannot fill up and block the child process.
    });

    child.on("error", (error) => {
      const message =
        (error as NodeJS.ErrnoException).code === "ENOENT"
          ? "Python 3 is not available on this server."
          : error.message;
      finish(new Error(message));
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        finish();
        return;
      }
      if (signal === "SIGTERM" || signal === "SIGKILL") {
        finish(new Error("Inpainting timed out."));
        return;
      }
      finish(
        new Error(
          stderr.trim() ||
            `Inpainting processor exited with code ${code ?? "unknown"}.`,
        ),
      );
    });
  });
}

export async function POST(req: NextRequest) {
  const requestId = randomUUID();
  const ip = getClientIp(req);

  const rate = checkRateLimit(`inpaint:${ip}`, RATE_LIMIT);
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(rate.limit),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rate.resetAt / 1000)),
  };

  if (!rate.allowed) {
    return jsonError(
      "Too many inpainting requests. Please wait a few minutes and try again.",
      429,
      { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) },
    );
  }

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return jsonError(
      "That image is too large for the AI engine. The maximum request size is 25 MB.",
      413,
      rateHeaders,
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonError("Expected a multipart/form-data request.", 415, rateHeaders);
  }

  const rawBody = await readBodyWithLimit(req, MAX_REQUEST_BYTES);
  if (rawBody === null) {
    return jsonError(
      "That image is too large for the AI engine. The maximum request size is 25 MB.",
      413,
      rateHeaders,
    );
  }

  let formData: FormData;
  try {
    formData = await new Response(rawBody.buffer as ArrayBuffer, {
      headers: { "content-type": contentType },
    }).formData();
  } catch {
    return jsonError("The upload could not be read. Please try again.", 400, rateHeaders);
  }

  const imageEntry = formData.get("image");
  const maskEntry = formData.get("mask");

  if (!(imageEntry instanceof Blob) || !(maskEntry instanceof Blob)) {
    return jsonError("Both an image and a mask are required.", 400, rateHeaders);
  }

  const imageFile = imageEntry;
  const maskFile = maskEntry;

  if (imageFile.size === 0 || maskFile.size === 0) {
    return jsonError("The image and mask must not be empty.", 400, rateHeaders);
  }

  if (imageFile.size > MAX_IMAGE_BYTES) {
    return jsonError("The image exceeds the 20 MB limit for AI inpainting.", 413, rateHeaders);
  }

  if (maskFile.size > MAX_MASK_BYTES) {
    return jsonError("The mask exceeds the 5 MB limit.", 413, rateHeaders);
  }

  const imageType = imageFile.type.toLowerCase();
  const maskType = maskFile.type.toLowerCase();

  if (imageType && !ALLOWED_IMAGE_TYPES.has(imageType)) {
    return jsonError("Unsupported image format. Use PNG, JPEG, or WebP.", 415, rateHeaders);
  }

  if (maskType && !ALLOWED_MASK_TYPES.has(maskType)) {
    return jsonError("Unsupported mask format. The mask must be a PNG.", 415, rateHeaders);
  }

  const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
  const maskBuffer = Buffer.from(await maskFile.arrayBuffer());

  const sniffedImage = sniffImageType(imageBuffer);
  const sniffedMask = sniffImageType(maskBuffer);

  if (!sniffedImage || !ALLOWED_IMAGE_TYPES.has(`image/${sniffedImage}`)) {
    return jsonError(
      "The uploaded file is not a valid PNG, JPEG, or WebP image.",
      415,
      rateHeaders,
    );
  }

  if (sniffedMask !== "png") {
    return jsonError("The mask must be a valid PNG image.", 415, rateHeaders);
  }

  const scriptPath = path.join(process.cwd(), "scripts", "inpaint_lama.py");
  const modelPath = path.join(process.cwd(), "models", "inpainting_lama.onnx");

  if (!fs.existsSync(scriptPath) || !fs.existsSync(modelPath)) {
    console.error("[api/inpaint] AI assets missing", { requestId, scriptPath, modelPath });
    return jsonError(
      "The AI inpainting engine is not available on this server. Try the browser engine instead.",
      503,
      rateHeaders,
    );
  }

  // Random, unguessable job directory. No client-supplied filename is ever used
  // on disk, so path traversal is structurally impossible; the prefix assertion
  // below is an additional invariant check.
  const tempRoot = path.join(os.tmpdir(), "dextrokit-inpaint");
  const jobDir = path.join(tempRoot, randomUUID());
  const resolvedRoot = path.resolve(tempRoot);
  const resolvedJob = path.resolve(jobDir);

  if (!resolvedJob.startsWith(resolvedRoot + path.sep)) {
    return jsonError("The request could not be processed safely.", 400, rateHeaders);
  }

  const inputImagePath = path.join(jobDir, "input.png");
  const inputMaskPath = path.join(jobDir, "mask.png");
  const outputImagePath = path.join(jobDir, "output.png");

  try {
    await fsp.mkdir(jobDir, { recursive: true, mode: 0o700 });
    await fsp.writeFile(inputImagePath, imageBuffer, { mode: 0o600 });
    await fsp.writeFile(inputMaskPath, maskBuffer, { mode: 0o600 });

    await runPythonInpaint(resolvePythonBinary(), [
      "-B",
      "-u",
      scriptPath,
      inputImagePath,
      inputMaskPath,
      outputImagePath,
      modelPath,
    ]);

    if (!fs.existsSync(outputImagePath)) {
      throw new Error("The inpainting engine produced no output.");
    }

    const outputStat = await fsp.stat(outputImagePath);
    if (outputStat.size === 0 || outputStat.size > MAX_OUTPUT_BYTES) {
      throw new Error("The inpainting engine produced an invalid output size.");
    }

    const resultBuffer = await fsp.readFile(outputImagePath);

    return new Response(resultBuffer.buffer.slice(resultBuffer.byteOffset, resultBuffer.byteOffset + resultBuffer.byteLength) as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(resultBuffer.byteLength),
        "Content-Disposition": 'inline; filename="inpainted.png"',
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
        ...rateHeaders,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/inpaint] processing failed", { requestId, message });

    if (message.includes("Python 3 is not available")) {
      return jsonError(
        "The AI inpainting engine is not available on this server. Try the browser engine instead.",
        503,
        { ...rateHeaders, "X-Request-Id": requestId },
      );
    }

    if (message.includes("timed out")) {
      return jsonError(
        "The AI engine took too long to respond. Try a smaller image or the browser engine.",
        504,
        { ...rateHeaders, "X-Request-Id": requestId },
      );
    }

    return jsonError(
      "The AI engine could not process this image. Try a smaller image, a PNG mask matching the image size, or the browser engine.",
      500,
      { ...rateHeaders, "X-Request-Id": requestId },
    );
  } finally {
    // Always remove temporary files, even when processing throws or times out.
    await fsp.rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
