/**
 * Client-side upload guardrails.
 *
 * Browser tools are limited by device memory, not by a server quota. These
 * helpers turn an inevitable out-of-memory crash into an actionable message
 * before a FileReader or WASM allocation is attempted.
 */

export const MB = 1024 * 1024;

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes >= 1024 * MB) return `${(bytes / (1024 * MB)).toFixed(1)} GB`;
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export interface UploadSizeValidation {
  ok: boolean;
  message?: string;
}

/**
 * Validates a file against a byte cap.
 *
 * @param file      The selected file.
 * @param maxBytes  Hard ceiling for this tool.
 * @param hint      Extra guidance appended to the error (how to fix it).
 */
export function validateUploadSize(
  file: File,
  maxBytes: number,
  hint?: string,
): UploadSizeValidation {
  if (file.size <= maxBytes) return { ok: true };

  const limitLabel = formatBytesCompact(maxBytes);
  const actualLabel = formatBytesCompact(file.size);
  return {
    ok: false,
    message: `"${file.name}" is ${actualLabel}, above the ${limitLabel} limit for this tool.${
      hint ? ` ${hint}` : ""
    }`,
  };
}

/**
 * Validates a file's MIME type or extension. Browsers sometimes report an empty
 * type for HEIC/HEIF files, so an extension fallback is allowed.
 */
export function validateUploadType(
  file: File,
  mimePrefix: string,
  extensionPattern?: RegExp,
): UploadSizeValidation {
  const typeMatches = file.type.startsWith(mimePrefix);
  const extensionMatches = extensionPattern ? extensionPattern.test(file.name) : false;

  if (typeMatches || extensionMatches) return { ok: true };

  return {
    ok: false,
    message: `"${file.name}" isn't a supported file type. Choose a ${mimePrefix.replace(
      "/",
      " ",
    )} file instead.`,
  };
}

/**
 * Runs every guard for a single upload and returns the first failure message.
 */
export function validateUpload(
  file: File,
  options: {
    maxBytes: number;
    mimePrefix: string;
    extensionPattern?: RegExp;
    hint?: string;
    label?: string;
  },
): UploadSizeValidation {
  const size = validateUploadSize(file, options.maxBytes, options.hint);
  if (!size.ok) return size;

  const type = validateUploadType(file, options.mimePrefix, options.extensionPattern);
  if (!type.ok) {
    return {
      ok: false,
      message: `"${file.name}" isn't a supported ${options.label ?? "file"} type.`,
    };
  }

  return { ok: true };
}

/** Total bytes currently queued, used to block runaway batch imports. */
export function sumFileSizes(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}
