export type ToolCategory = "image" | "video-audio" | "pdf-doc" | "utility";

export type ToolBadge = "Popular" | "New" | "Instant";

export type CategoryFilterValue = ToolCategory | "all";

export interface Tool {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: string;
  href: string;
  badge?: ToolBadge;
  isAvailable: boolean;
}

export interface CategoryMeta {
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

export interface CategoryOption {
  id: CategoryFilterValue;
  label: string;
  shortLabel: string;
  icon: string;
}

export const categoryMeta: Record<ToolCategory, CategoryMeta> = {
  image: {
    label: "Image",
    shortLabel: "Image",
    description: "Convert, edit, and optimize images right in your browser.",
    icon: "Image",
  },
  "video-audio": {
    label: "Video & Audio",
    shortLabel: "Video & Audio",
    description: "Extract audio and process video without installing anything.",
    icon: "Clapperboard",
  },
  "pdf-doc": {
    label: "PDF",
    shortLabel: "PDF",
    description: "Manage PDF documents with a workflow that stays simple.",
    icon: "FileText",
  },
  utility: {
    label: "Utilities",
    shortLabel: "Utilities",
    description: "Lightweight, fast, and private tools for everyday tasks.",
    icon: "Wrench",
  },
};

export const categoryOptions: CategoryOption[] = [
  {
    id: "all",
    label: "All Tools",
    shortLabel: "All",
    icon: "LayoutGrid",
  },
  {
    id: "image",
    label: "Image",
    shortLabel: "Image",
    icon: "Image",
  },
  {
    id: "video-audio",
    label: "Video & Audio",
    shortLabel: "Video & Audio",
    icon: "Clapperboard",
  },
  {
    id: "pdf-doc",
    label: "PDF",
    shortLabel: "PDF",
    icon: "FileText",
  },
  {
    id: "utility",
    label: "Utilities",
    shortLabel: "Utilities",
    icon: "Wrench",
  },
];

export const tools: Tool[] = [
  {
    id: "image-converter",
    title: "Image Format Converter",
    description:
      "Convert JPG, PNG, WebP, and iPhone HEIC photos instantly in your browser.",
    category: "image",
    icon: "Images",
    href: "/tools/image-converter",
    badge: "Popular",
    isAvailable: true,
  },
  {
    id: "audio-extractor",
    title: "Video to Audio Extractor",
    description:
      "Pull clean MP3 or lossless WAV audio from MP4 and MKV files in seconds.",
    category: "video-audio",
    icon: "AudioLines",
    href: "/tools/audio-extractor",
    badge: "Instant",
    isAvailable: true,
  },
  {
    id: "image-watermark-remover",
    title: "Image Watermark Remover",
    description:
      "Erase logos, stamps, and scribbles with a precise AI inpainting brush.",
    category: "image",
    icon: "Eraser",
    href: "/tools/image-watermark-remover",
    badge: "New",
    isAvailable: true,
  },
  {
    id: "video-watermark-remover",
    title: "Video Watermark Blur & Censor",
    description:
      "Blur or fully censor logos and watermarks in video, directly in your browser.",
    category: "video-audio",
    icon: "EyeOff",
    href: "/tools/video-watermark-remover",
    badge: "New",
    isAvailable: true,
  },
  {
    id: "background-remover",
    title: "AI Background Remover",
    description:
      "Cut out photo backgrounds automatically and export a transparent PNG.",
    category: "image",
    icon: "WandSparkles",
    href: "/tools/background-remover",
    badge: "Popular",
    isAvailable: true,
  },
  {
    id: "pdf-tools",
    title: "PDF Merger & Converter",
    description:
      "Merge multiple PDFs or turn a folder of images into one polished PDF.",
    category: "pdf-doc",
    icon: "FileText",
    href: "/tools/pdf-tools",
    isAvailable: true,
  },
  {
    id: "video-converter",
    title: "Video Converter & Compressor",
    description:
      "Shrink video file size and convert to MP4 without uploading a single byte.",
    category: "video-audio",
    icon: "Film",
    href: "/tools/video-converter",
    isAvailable: true,
  },
  {
    id: "qr-generator",
    title: "QR Code Generator",
    description:
      "Design high-resolution custom QR codes for links, text, Wi-Fi, or contacts.",
    category: "utility",
    icon: "QrCode",
    href: "/tools/qr-generator",
    badge: "Instant",
    isAvailable: true,
  },
];

export function isToolCategory(
  value: string | null | undefined,
): value is ToolCategory {
  return value === "image" || value === "video-audio" || value === "pdf-doc" || value === "utility";
}

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.href === `/tools/${slug}`);
}

export function getCategoryCounts(): Record<CategoryFilterValue, number> {
  const counts: Record<CategoryFilterValue, number> = {
    all: tools.length,
    image: 0,
    "video-audio": 0,
    "pdf-doc": 0,
    utility: 0,
  };

  for (const tool of tools) {
    counts[tool.category] += 1;
  }

  return counts;
}

export function getCategoryHref(category: CategoryFilterValue) {
  return category === "all" ? "/#tools" : `/?category=${category}#tools`;
}
