"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type QRCodeStylingType from "qr-code-styling";
import type {
  DotType,
  CornerSquareType,
  CornerDotType,
  GradientType,
  Options as QRCodeOptions,
} from "qr-code-styling";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Layers,
  Mail,
  MessageCircle,
  Palette,
  QrCode,
  Shapes,
  Sliders,
  Sparkles,
  Trash2,
  UploadCloud,
  Wifi,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import {
  assertSafeSvgMarkup,
  escapeWifiValue,
  hasDangerousScheme,
  isValidEmail,
  sanitizeTextPayload,
  sanitizeUrlPayload,
  stripControlCharacters,
} from "@/lib/sanitize";

type ContentType = "url" | "text" | "wifi" | "whatsapp" | "email";
type CustomizerTab = "style" | "color" | "logo" | "background" | "export";

/**
 * Raster-only upload allowlist. SVG is intentionally excluded: uploaded files
 * become data URLs embedded in the exported SVG, and SVG can carry script.
 */
const ALLOWED_RASTER_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const BG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const DOT_STYLES: { id: DotType; label: string; desc: string }[] = [
  { id: "rounded", label: "Rounded", desc: "Smooth & modern" },
  { id: "dots", label: "Dots", desc: "Dot-matrix look" },
  { id: "classy", label: "Classy", desc: "Artistic connected corners" },
  { id: "classy-rounded", label: "Classy Rounded", desc: "Soft artistic curves" },
  { id: "extra-rounded", label: "Squircle", desc: "Ultra rounded" },
  { id: "square", label: "Square", desc: "Industry standard" },
];

const CORNER_SQUARE_STYLES: { id: CornerSquareType; label: string }[] = [
  { id: "extra-rounded", label: "Extra Rounded" },
  { id: "dot", label: "Dot" },
  { id: "square", label: "Square" },
];

const CORNER_DOT_STYLES: { id: CornerDotType; label: string }[] = [
  { id: "dot", label: "Dot" },
  { id: "square", label: "Square" },
];

const THEME_PRESETS = [
  {
    name: "Classic Onyx",
    mode: "solid" as const,
    color1: "#000000",
    color2: "#000000",
    cornerSquare: "square" as CornerSquareType,
    cornerDot: "square" as CornerDotType,
    dotType: "square" as DotType,
  },
  {
    name: "Emerald Luxe",
    mode: "gradient" as const,
    color1: "#047857",
    color2: "#10b981",
    cornerSquare: "extra-rounded" as CornerSquareType,
    cornerDot: "dot" as CornerDotType,
    dotType: "rounded" as DotType,
  },
  {
    name: "Midnight Purple",
    mode: "gradient" as const,
    color1: "#4f46e5",
    color2: "#9333ea",
    cornerSquare: "extra-rounded" as CornerSquareType,
    cornerDot: "dot" as CornerDotType,
    dotType: "classy-rounded" as DotType,
  },
  {
    name: "Sunset Coral",
    mode: "gradient" as const,
    color1: "#e11d48",
    color2: "#f97316",
    cornerSquare: "dot" as CornerSquareType,
    cornerDot: "dot" as CornerDotType,
    dotType: "dots" as DotType,
  },
  {
    name: "Electric Ocean",
    mode: "gradient" as const,
    color1: "#0284c7",
    color2: "#06b6d4",
    cornerSquare: "extra-rounded" as CornerSquareType,
    cornerDot: "dot" as CornerDotType,
    dotType: "rounded" as DotType,
  },
  {
    name: "Royal Amber",
    mode: "gradient" as const,
    color1: "#d97706",
    color2: "#fbbf24",
    cornerSquare: "square" as CornerSquareType,
    cornerDot: "square" as CornerDotType,
    dotType: "classy" as DotType,
  },
];

// Preset vector icons encoded as clean SVG data URIs
const PRESET_ICONS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="%2325D366" d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`,
  },
  {
    id: "instagram",
    label: "Instagram",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="%23E1306C" d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg>`,
  },
  {
    id: "globe",
    label: "Web / Link",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%233b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    svg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  },
];

const FAQ_ITEMS = [
  {
    q: "Do aesthetic QR codes with logos and custom shapes still scan?",
    a: "Yes. Whenever you add a logo or background image, the generator automatically locks error correction to High (H – 30%). The Reed-Solomon algorithm keeps the QR code 100% readable even when the center is covered by a logo.",
  },
  {
    q: "Do the QR codes I create expire?",
    a: "No — they never expire. Every code is a standard static ISO/IEC 18004 QR code: the data is encoded directly into the dot matrix and doesn't rely on a third-party server, so there is nothing that can expire.",
  },
  {
    q: "When should I download PNG instead of SVG?",
    a: "PNG (up to 2048px Ultra HD) is ideal for social media, websites, and digital flyers. SVG is a pixel-free mathematical vector file that never pixelates, even when printed as a street billboard or a building banner.",
  },
  {
    q: "How does a Wi-Fi QR code work?",
    a: "When a guest scans the code with a phone camera (Android or iOS), the phone detects the network name and password automatically. It then offers a 'Join Network' button, so no one has to type the password by hand.",
  },
];

export function QrGeneratorClient() {
  const [contentType, setContentType] = useState<ContentType>("url");
  const [customizerTab, setCustomizerTab] = useState<CustomizerTab>("style");

  // Form Content Fields
  const [urlInput, setUrlInput] = useState<string>("https://dextrokit.app");
  const [textInput, setTextInput] = useState<string>("Hello from DextroKit!");
  const [wifiSsid, setWifiSsid] = useState<string>("");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [wifiEncryption, setWifiEncryption] = useState<string>("WPA");
  const [wifiHidden, setWifiHidden] = useState<boolean>(false);
  const [waPhone, setWaPhone] = useState<string>("628123456789");
  const [waMessage, setWaMessage] = useState<string>("Hi, I'm interested in learning more about this.");
  const [emailTo, setEmailTo] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  // Shape & Dots Styling
  const [dotType, setDotType] = useState<DotType>("rounded");
  const [cornerSquareType, setCornerSquareType] = useState<CornerSquareType>("extra-rounded");
  const [cornerDotType, setCornerDotType] = useState<CornerDotType>("dot");

  // Color & Gradient Styling
  const [colorMode, setColorMode] = useState<"solid" | "gradient">("gradient");
  const [solidColor, setSolidColor] = useState<string>("#047857");
  const [gradientColor1, setGradientColor1] = useState<string>("#047857");
  const [gradientColor2, setGradientColor2] = useState<string>("#10b981");
  const [gradientType, setGradientType] = useState<GradientType>("linear");
  const [gradientRotation, setGradientRotation] = useState<number>(45);

  // Background Options
  const [bgColor, setBgColor] = useState<string>("#ffffff");
  const [isTransparentBg, setIsTransparentBg] = useState<boolean>(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(0.20);
  const [showOpacityWarningModal, setShowOpacityWarningModal] = useState<boolean>(false);
  const [warnedForHighOpacity, setWarnedForHighOpacity] = useState<boolean>(false);

  // Center Logo Options
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(0.25);
  const [logoMargin, setLogoMargin] = useState<number>(4);
  const [hideBackgroundDots, setHideBackgroundDots] = useState<boolean>(true);

  // Export & Quality
  const [qrSize, setQrSize] = useState<number>(1024);
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("H");

  // Status
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // References
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const qrCodeInstanceRef = useRef<QRCodeStylingType | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const logoUrlRef = useRef<string | null>(null);
  const bgImageUrlRef = useRef<string | null>(null);

  // Cleanup object URLs and the QR renderer on unmount
  useEffect(() => {
    const container = qrContainerRef.current;

    return () => {
      if (logoUrlRef.current && logoUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(logoUrlRef.current);
      }
      if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(bgImageUrlRef.current);
      }
      // Drop the qr-code-styling instance and the DOM it rendered.
      container?.replaceChildren();
      qrCodeInstanceRef.current = null;
    };
  }, []);

  /**
   * The payload is validated before it reaches the QR encoder. Dangerous URI
   * schemes (`javascript:`, `data:`, `vbscript:`) are never encoded, and Wi-Fi
   * values are escaped so a stray `;` or `:` cannot inject extra fields.
   */
  const getPayload = (): string => {
    switch (contentType) {
      case "url":
        return sanitizeUrlPayload(urlInput).value || "https://dextrokit.app";
      case "text": {
        if (hasDangerousScheme(textInput)) return "DextroKit";
        return sanitizeTextPayload(textInput).value || "DextroKit";
      }
      case "wifi": {
        const encryption = ["WPA", "WEP", "nopass"].includes(wifiEncryption)
          ? wifiEncryption
          : "WPA";
        return `WIFI:S:${escapeWifiValue(wifiSsid)};T:${encryption};P:${escapeWifiValue(
          wifiPassword,
        )};H:${wifiHidden ? "true" : "false"};;`;
      }
      case "whatsapp": {
        const cleanPhone = waPhone.replace(/\D/g, "").slice(0, 15);
        const encodedMsg = encodeURIComponent(stripControlCharacters(waMessage));
        return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
      }
      case "email": {
        const address = isValidEmail(emailTo) ? emailTo.trim() : "hello@example.com";
        const encodedSubject = encodeURIComponent(stripControlCharacters(emailSubject));
        const encodedBody = encodeURIComponent(stripControlCharacters(emailBody));
        return `mailto:${address}?subject=${encodedSubject}&body=${encodedBody}`;
      }
    }
  };

  /** Human-readable reason the current payload can't be exported yet. */
  const payloadValidation = useMemo<{ valid: boolean; message?: string }>(() => {
    switch (contentType) {
      case "url": {
        const result = sanitizeUrlPayload(urlInput);
        return { valid: result.ok, message: result.error };
      }
      case "text": {
        if (hasDangerousScheme(textInput)) {
          return {
            valid: false,
            message:
              "Script and data links can't be encoded. Use plain text or a normal https link instead.",
          };
        }
        const result = sanitizeTextPayload(textInput);
        return { valid: result.ok, message: result.error };
      }
      case "wifi":
        return wifiSsid.trim()
          ? { valid: true }
          : { valid: false, message: "Enter your Wi-Fi network name (SSID) to finish the code." };
      case "whatsapp": {
        const digits = waPhone.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15
          ? { valid: true }
          : { valid: false, message: "Enter a WhatsApp number with country code (7–15 digits)." };
      }
      case "email":
        return isValidEmail(emailTo)
          ? { valid: true }
          : { valid: false, message: "Enter a valid email address, for example name@example.com." };
    }
  }, [contentType, urlInput, textInput, wifiSsid, waPhone, emailTo]);

  const guardPayload = (): boolean => {
    if (payloadValidation.valid) return true;
    setErrorBanner(payloadValidation.message ?? "Complete the content fields before downloading.");
    return false;
  };

  // Build QRCodeStyling options
  const buildOptions = (): QRCodeOptions => {
    const payload = getPayload();
    const effectiveBgColor = isTransparentBg ? "transparent" : bgColor;
    // Automatically raise error correction to H when a logo or background image is set
    const effectiveEc = logoUrl || bgImageUrl ? "H" : errorCorrection;

    const options: QRCodeOptions = {
      width: 320,
      height: 320,
      data: payload,
      margin: 10,
      qrOptions: {
        errorCorrectionLevel: effectiveEc,
      },
      image: logoUrl || undefined,
      imageOptions: {
        hideBackgroundDots: hideBackgroundDots,
        imageSize: logoSize,
        margin: logoMargin,
        crossOrigin: "anonymous",
      },
      dotsOptions: {
        type: dotType,
        color: colorMode === "solid" ? solidColor : undefined,
        gradient:
          colorMode === "gradient"
            ? {
                type: gradientType,
                rotation: (gradientRotation * Math.PI) / 180,
                colorStops: [
                  { offset: 0, color: gradientColor1 },
                  { offset: 1, color: gradientColor2 },
                ],
              }
            : undefined,
      },
      cornersSquareOptions: {
        type: cornerSquareType,
        color: colorMode === "solid" ? solidColor : gradientColor1,
      },
      cornersDotOptions: {
        type: cornerDotType,
        color: colorMode === "solid" ? solidColor : gradientColor2,
      },
      backgroundOptions: {
        color: effectiveBgColor,
      },
    };

    return options;
  };

  // Initialize and update QRCodeStyling instance dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (!isMounted) return;

      const opts = buildOptions();
      if (!qrCodeInstanceRef.current) {
        const instance = new QRCodeStyling(opts);
        qrCodeInstanceRef.current = instance;
        if (qrContainerRef.current) {
          qrContainerRef.current.replaceChildren();
          instance.append(qrContainerRef.current);
        }
      } else {
        qrCodeInstanceRef.current.update(opts);
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contentType,
    urlInput,
    textInput,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    wifiHidden,
    waPhone,
    waMessage,
    emailTo,
    emailSubject,
    emailBody,
    dotType,
    cornerSquareType,
    cornerDotType,
    colorMode,
    solidColor,
    gradientColor1,
    gradientColor2,
    gradientType,
    gradientRotation,
    bgColor,
    isTransparentBg,
    logoUrl,
    logoSize,
    logoMargin,
    hideBackgroundDots,
    errorCorrection,
  ]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_RASTER_TYPES.includes(file.type)) {
        setErrorBanner(
          "Use a PNG, JPG, or WebP logo. SVG uploads are blocked because the export is also an SVG.",
        );
        e.target.value = "";
        return;
      }
      if (file.size > LOGO_MAX_BYTES) {
        setErrorBanner("Keep the logo under 2 MB so the QR code stays fast to render.");
        e.target.value = "";
        return;
      }
      setErrorBanner(null);
      if (logoUrlRef.current && logoUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(logoUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      logoUrlRef.current = url;
      setLogoUrl(url);
      setErrorCorrection("H"); // Auto protect scanability
      e.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    if (logoUrlRef.current && logoUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(logoUrlRef.current);
    }
    logoUrlRef.current = null;
    setLogoUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Handle Background Image Upload
  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!ALLOWED_RASTER_TYPES.includes(file.type)) {
        setErrorBanner(
          "Use a PNG, JPG, or WebP background image. SVG uploads are blocked.",
        );
        e.target.value = "";
        return;
      }
      if (file.size > BG_IMAGE_MAX_BYTES) {
        setErrorBanner("Keep the background image under 5 MB.");
        e.target.value = "";
        return;
      }
      setErrorBanner(null);
      if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(bgImageUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      bgImageUrlRef.current = url;
      setBgImageUrl(url);
      setBgImageOpacity(0.20); // Default to a safe 20%
      setWarnedForHighOpacity(false);
      setIsTransparentBg(true); // make QR background transparent so image shows
      setErrorCorrection("H");
      e.target.value = "";
    }
  };

  const handleOpacityChange = (val: number) => {
    setBgImageOpacity(val);
    if (val >= 0.30) {
      if (!warnedForHighOpacity) {
        setShowOpacityWarningModal(true);
        setWarnedForHighOpacity(true);
      }
    } else {
      setWarnedForHighOpacity(false);
    }
  };

  const handleRemoveBgImage = () => {
    if (bgImageUrlRef.current && bgImageUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(bgImageUrlRef.current);
    }
    bgImageUrlRef.current = null;
    setBgImageUrl(null);
    if (bgImageInputRef.current) bgImageInputRef.current.value = "";
  };

  // Apply Theme Preset
  const handleApplyPreset = (preset: (typeof THEME_PRESETS)[0]) => {
    setColorMode(preset.mode);
    setSolidColor(preset.color1);
    setGradientColor1(preset.color1);
    setGradientColor2(preset.color2);
    setDotType(preset.dotType);
    setCornerSquareType(preset.cornerSquare);
    setCornerDotType(preset.cornerDot);
  };

  // Generate composite high-resolution canvas for download
  const generateExportBlob = async (format: "image/png" | "image/webp"): Promise<Blob | null> => {
    const { default: QRCodeStyling } = await import("qr-code-styling");
    const exportOpts = {
      ...buildOptions(),
      width: qrSize,
      height: qrSize,
      margin: Math.round(qrSize * 0.04),
    };

    const exportInstance = new QRCodeStyling(exportOpts);
    const rawData = await exportInstance.getRawData("png");
    if (!rawData) return null;

    const qrBlob: Blob =
      rawData instanceof Blob
        ? rawData
        : new Blob([new Uint8Array(rawData)], { type: "image/png" });

    // If no background image, return direct qr blob
    if (!bgImageUrl) {
      if (format === "image/png") return qrBlob;
      // Convert to webp via canvas
      return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(qrBlob);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const c = document.createElement("canvas");
          c.width = qrSize;
          c.height = qrSize;
          const ctx = c.getContext("2d");
          if (!ctx) return resolve(qrBlob);
          if (!isTransparentBg) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, qrSize, qrSize);
          }
          ctx.drawImage(img, 0, 0, qrSize, qrSize);
          c.toBlob((b) => resolve(b), format, 0.95);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        img.src = objectUrl;
      });
    }

    // Composite Background Image + QR Code
    return new Promise((resolve) => {
      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      bgImg.onload = () => {
        const qrImg = new Image();
        const qrObjectUrl = URL.createObjectURL(qrBlob);
        qrImg.onload = () => {
          URL.revokeObjectURL(qrObjectUrl);
          const canvas = document.createElement("canvas");
          canvas.width = qrSize;
          canvas.height = qrSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(qrBlob);

          // 1. Draw base background color
          ctx.fillStyle = isTransparentBg ? "#ffffff" : bgColor;
          ctx.fillRect(0, 0, qrSize, qrSize);

          // 2. Draw background image with opacity
          ctx.save();
          ctx.globalAlpha = bgImageOpacity;
          // Cover center crop
          const scale = Math.max(qrSize / bgImg.naturalWidth, qrSize / bgImg.naturalHeight);
          const x = (qrSize - bgImg.naturalWidth * scale) / 2;
          const y = (qrSize - bgImg.naturalHeight * scale) / 2;
          ctx.drawImage(bgImg, x, y, bgImg.naturalWidth * scale, bgImg.naturalHeight * scale);
          ctx.restore();

          // 3. Draw QR code on top
          ctx.drawImage(qrImg, 0, 0, qrSize, qrSize);

          canvas.toBlob((blob) => resolve(blob), format, 0.95);
        };
        qrImg.onerror = () => {
          URL.revokeObjectURL(qrObjectUrl);
          resolve(null);
        };
        qrImg.src = qrObjectUrl;
      };
      bgImg.onerror = () => resolve(null);
      bgImg.src = bgImageUrl;
    });
  };

  // Download Handlers
  const handleDownloadPng = async () => {
    if (!guardPayload()) return;
    setIsDownloading(true);
    try {
      const blob = await generateExportBlob("image/png");
      if (!blob) throw new Error("Couldn't generate the PNG file.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `dextrokit-qrcode-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorBanner("Couldn't generate the PNG file. Try again with a smaller export size.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWebp = async () => {
    if (!guardPayload()) return;
    setIsDownloading(true);
    try {
      const blob = await generateExportBlob("image/webp");
      if (!blob) throw new Error("Couldn't generate the WebP file.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `dextrokit-qrcode-${Date.now()}.webp`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorBanner("Couldn't generate the WebP file. Try the PNG export instead.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSvg = async () => {
    if (!qrCodeInstanceRef.current) return;
    if (!guardPayload()) return;
    try {
      const raw = await qrCodeInstanceRef.current.getRawData("svg");
      if (!raw) throw new Error("Empty SVG payload.");

      const svgText =
        raw instanceof Blob
          ? await raw.text()
          : typeof raw === "string"
            ? raw
            : new TextDecoder().decode(raw as unknown as Uint8Array);

      // Reject any script/event-handler markup before writing to disk.
      assertSafeSvgMarkup(svgText);

      const url = URL.createObjectURL(
        new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.download = `dextrokit-qrcode-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorBanner("Couldn't export the SVG file. Try downloading the PNG instead.");
    }
  };

  const handleCopyImage = async () => {
    if (!guardPayload()) return;
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setErrorBanner("Your browser doesn't support copying images to the clipboard yet.");
      return;
    }
    try {
      const blob = await generateExportBlob("image/png");
      if (!blob) throw new Error("Couldn't generate the image.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setErrorBanner("Your browser doesn't support copying images to the clipboard yet.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#05070c] text-slate-100">
      <Navbar />

      <main id="main-content" className="flex-1">
        {/* Background Grid Pattern */}
        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
            aria-hidden="true"
          />

          <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
                Back to Home
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                Custom Styling &amp; Art Engine
              </div>
            </div>

            {/* Header Section */}
            <div className="mt-8 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-amber-300">
                <QrCode className="size-4 text-amber-400" />
                Aesthetic QR Code Designer
              </div>

              <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Design a QR code{" "}
                <span className="bg-gradient-to-r from-amber-300 via-orange-200 to-rose-300 bg-clip-text text-transparent">
                  that matches your brand
                </span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                Fully customizable dot shapes, corner frames, gradients, logos, and backgrounds.
                Download high-resolution PNGs or vector SVGs — generated in your browser, with no
                tracking redirects and unlimited scans.
              </p>
            </div>

            {/* Top Leaderboard Ad */}
            <div className="mt-8">
              <AdSlot type="banner-728" />
            </div>

            {/* Main Interactive Generator Grid */}
            <div className="mt-8 grid gap-8 lg:grid-cols-12">
              {/* Left Column: Content Inputs & Customizer Tabs (7 cols) */}
              <div className="space-y-6 lg:col-span-7">
                {/* Content Type Selector */}
                <div className="rounded-2xl border border-white/10 bg-[#080b13]/90 p-2 backdrop-blur-xl">
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: "url", label: "URL", icon: Globe },
                      { id: "wifi", label: "Wi-Fi", icon: Wifi },
                      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                      { id: "text", label: "Text", icon: FileText },
                      { id: "email", label: "Email", icon: Mail },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = contentType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setContentType(tab.id as ContentType)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <Icon className="size-4" />
                          <span className="text-[11px]">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content Form Fields */}
                <div className="rounded-3xl border border-white/10 bg-[#080b13]/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
                  {contentType === "url" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Website URL:
                      </label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://yourwebsite.com/promo"
                        className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  )}

                  {contentType === "text" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Plain text:
                      </label>
                      <textarea
                        rows={3}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type your message or note here..."
                        className="w-full rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      />
                    </div>
                  )}

                  {contentType === "wifi" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                          Network name (SSID):
                        </label>
                        <input
                          type="text"
                          value={wifiSsid}
                          onChange={(e) => setWifiSsid(e.target.value)}
                          placeholder="Cafe or home Wi-Fi name"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                          Password:
                        </label>
                        <input
                          type="text"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          placeholder="Wi-Fi password..."
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">Encryption:</span>
                          <select
                            value={wifiEncryption}
                            onChange={(e) => setWifiEncryption(e.target.value)}
                            className="rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-xs text-zinc-200"
                          >
                            <option value="WPA">WPA / WPA2 / WPA3</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">No password (open)</option>
                          </select>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wifiHidden}
                            onChange={(e) => setWifiHidden(e.target.checked)}
                            className="size-4 rounded border-zinc-700 bg-zinc-800 text-amber-500"
                          />
                          Hidden network
                        </label>
                      </div>
                    </div>
                  )}

                  {contentType === "whatsapp" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                          WhatsApp number (with country code):
                        </label>
                        <input
                          type="text"
                          value={waPhone}
                          onChange={(e) => setWaPhone(e.target.value)}
                          placeholder="628123456789"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                          Prefilled message:
                        </label>
                        <textarea
                          rows={2}
                          value={waMessage}
                          onChange={(e) => setWaMessage(e.target.value)}
                          placeholder="Hi, I'd like to ask about..."
                          className="w-full rounded-xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {contentType === "email" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-zinc-300">Email address:</label>
                        <input
                          type="email"
                          value={emailTo}
                          onChange={(e) => setEmailTo(e.target.value)}
                          placeholder="hello@company.com"
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-zinc-300">Subject:</label>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            placeholder="Quick question"
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-zinc-300">Message:</label>
                          <input
                            type="text"
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            placeholder="Your message..."
                            className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced Customizer Panel */}
                <div className="rounded-3xl border border-white/10 bg-[#080b13]/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-5">
                  {/* Customizer Sub-Tabs Navigation */}
                  <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] pb-3 text-xs font-medium scrollbar-none">
                    {[
                      { id: "style", label: "Pattern", icon: Shapes },
                      { id: "color", label: "Color & Gradient", icon: Palette },
                      { id: "logo", label: "Center Logo", icon: Layers },
                      { id: "background", label: "Background", icon: ImageIcon },
                      { id: "export", label: "Quality & Print", icon: Sliders },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = customizerTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCustomizerTab(tab.id as CustomizerTab)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 font-semibold transition-all ${
                            isActive
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <Icon className="size-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB 1: PATTERN SHAPE (DOTS & CORNERS) */}
                  {customizerTab === "style" && (
                    <div className="space-y-5">
                      {/* Dots Style */}
                      <div className="space-y-2">
                        <span className="block text-xs font-semibold text-zinc-300">
                          Dot style:
                        </span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {DOT_STYLES.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setDotType(style.id)}
                              className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                                dotType === style.id
                                  ? "border-amber-400 bg-amber-500/10 text-amber-200"
                                  : "border-white/10 bg-black/40 text-zinc-400 hover:border-white/20 hover:text-white"
                              }`}
                            >
                              <span className="text-xs font-bold text-zinc-100">{style.label}</span>
                              <span className="text-[10px] text-zinc-500">{style.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Corner Square & Dot Style */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/[0.06]">
                        <div className="space-y-2">
                          <span className="block text-xs font-semibold text-zinc-300">
                            Corner style:
                          </span>
                          <div className="grid grid-cols-3 gap-1.5">
                            {CORNER_SQUARE_STYLES.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setCornerSquareType(c.id)}
                                className={`rounded-xl border py-2 text-center text-xs font-semibold transition-all ${
                                  cornerSquareType === c.id
                                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                                    : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="block text-xs font-semibold text-zinc-300">
                            Corner dot:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {CORNER_DOT_STYLES.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => setCornerDotType(d.id)}
                                className={`rounded-xl border py-2 text-center text-xs font-semibold transition-all ${
                                  cornerDotType === d.id
                                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                                    : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: COLOR & GRADIENT */}
                  {customizerTab === "color" && (
                    <div className="space-y-5">
                      {/* Theme Presets */}
                      <div className="space-y-2">
                        <span className="block text-xs font-semibold text-zinc-300">
                          Theme presets:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {THEME_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleApplyPreset(preset)}
                              className="group flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:border-amber-400/40 hover:bg-white/[0.04]"
                            >
                              <span
                                className="size-3.5 rounded-full border border-white/20"
                                style={{
                                  background:
                                    preset.mode === "gradient"
                                      ? `linear-gradient(135deg, ${preset.color1}, ${preset.color2})`
                                      : preset.color1,
                                }}
                              />
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Mode Switcher */}
                      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-400">Color mode:</span>
                        <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
                          <button
                            type="button"
                            onClick={() => setColorMode("solid")}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                              colorMode === "solid"
                                ? "bg-amber-400 text-slate-950 shadow-sm"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Solid
                          </button>
                          <button
                            type="button"
                            onClick={() => setColorMode("gradient")}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                              colorMode === "gradient"
                                ? "bg-amber-400 text-slate-950 shadow-sm"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Gradient
                          </button>
                        </div>
                      </div>

                      {/* Color Pickers */}
                      {colorMode === "solid" ? (
                        <div className="flex items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-xs font-medium text-zinc-200">
                            <input
                              type="color"
                              value={solidColor}
                              onChange={(e) => setSolidColor(e.target.value)}
                              className="size-6 cursor-pointer appearance-none rounded border-0 bg-transparent"
                            />
                            <span>Foreground color: <strong className="text-amber-300">{solidColor}</strong></span>
                          </label>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200">
                            <input
                              type="color"
                              value={gradientColor1}
                              onChange={(e) => setGradientColor1(e.target.value)}
                              className="size-5 cursor-pointer appearance-none rounded border-0 bg-transparent"
                            />
                            <span>Gradient start</span>
                          </label>

                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200">
                            <input
                              type="color"
                              value={gradientColor2}
                              onChange={(e) => setGradientColor2(e.target.value)}
                              className="size-5 cursor-pointer appearance-none rounded border-0 bg-transparent"
                            />
                            <span>Gradient end</span>
                          </label>

                          <select
                            value={gradientType}
                            onChange={(e) => setGradientType(e.target.value as GradientType)}
                            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200"
                          >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                          </select>

                          <select
                            value={gradientRotation}
                            onChange={(e) => setGradientRotation(Number(e.target.value))}
                            className="rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200"
                          >
                            <option value={0}>Horizontal (0°)</option>
                            <option value={45}>Diagonal (45°)</option>
                            <option value={90}>Vertical (90°)</option>
                            <option value={135}>Diagonal (135°)</option>
                          </select>
                        </div>
                      )}

                      {/* Background Settings */}
                      <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                        <span className="block text-xs font-semibold text-zinc-300">
                          Background color:
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsTransparentBg(false);
                              setBgColor("#ffffff");
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              !isTransparentBg && bgColor === "#ffffff"
                                ? "border-amber-400 bg-amber-400/20 text-amber-300"
                                : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Standard white
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsTransparentBg(true)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                              isTransparentBg
                                ? "border-amber-400 bg-amber-400/20 text-amber-300"
                                : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                            }`}
                          >
                            Transparent (PNG)
                          </button>

                          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
                            <input
                              type="color"
                              value={bgColor}
                              onChange={(e) => {
                                setIsTransparentBg(false);
                                setBgColor(e.target.value);
                              }}
                              className="size-4 cursor-pointer appearance-none rounded border-0 bg-transparent"
                            />
                            Custom background color
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CENTER LOGO */}
                  {customizerTab === "logo" && (
                    <div className="space-y-5">
                      {/* Logo Upload & Remove */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-zinc-300">Logo or icon:</span>
                        {logoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="size-3" />
                            Remove logo
                          </button>
                        )}
                      </div>

                      {/* Upload Button */}
                      <div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-4 text-xs font-semibold text-zinc-300 transition-all hover:border-amber-400/40 hover:bg-white/[0.04]"
                        >
                          <UploadCloud className="size-4 text-amber-400" />
                          Upload your logo (PNG, JPG, SVG)
                        </button>
                      </div>

                      {/* Preset Icons */}
                      <div className="space-y-2">
                        <span className="block text-xs font-semibold text-zinc-400">Or pick a popular icon:</span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {PRESET_ICONS.map((icon) => (
                            <button
                              key={icon.id}
                              type="button"
                              onClick={() => {
                                setLogoUrl(icon.svg);
                                setErrorCorrection("H");
                              }}
                              className={`flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition-all ${
                                logoUrl === icon.svg
                                  ? "border-amber-400 bg-amber-500/15 text-amber-200"
                                  : "border-white/10 bg-black/40 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={icon.svg} alt={icon.label} className="size-5 object-contain" />
                              <span>{icon.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Logo Controls */}
                      {logoUrl && (
                        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-white/[0.06]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-zinc-400">
                              <span>Logo size:</span>
                              <strong className="text-zinc-200">{Math.round(logoSize * 100)}%</strong>
                            </div>
                            <input
                              type="range"
                              min={0.15}
                              max={0.35}
                              step={0.02}
                              value={logoSize}
                              onChange={(e) => setLogoSize(Number(e.target.value))}
                              className="w-full accent-amber-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-zinc-400">
                              <span>Logo margin:</span>
                              <strong className="text-zinc-200">{logoMargin} px</strong>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={12}
                              step={1}
                              value={logoMargin}
                              onChange={(e) => setLogoMargin(Number(e.target.value))}
                              className="w-full accent-amber-400"
                            />
                          </div>

                          <div className="sm:col-span-2 pt-1">
                            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hideBackgroundDots}
                                onChange={(e) => setHideBackgroundDots(e.target.checked)}
                                className="size-4 rounded border-zinc-700 bg-zinc-800 text-amber-500"
                              />
                              Clear the QR dots behind the logo (recommended)
                            </label>
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] leading-relaxed text-zinc-400">
                        💡 <strong>Note:</strong> When a logo is active, error correction is automatically raised to <strong>High (H – 30%)</strong> so the QR code stays fully readable on any phone camera.
                      </p>
                    </div>
                  )}

                  {/* TAB 4: BACKGROUND IMAGE */}
                  {customizerTab === "background" && (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-zinc-300">
                          Background image:
                        </span>
                        {bgImageUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveBgImage}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 hover:bg-red-500/20"
                          >
                            <Trash2 className="size-3" />
                            Remove background
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          ref={bgImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleBgImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => bgImageInputRef.current?.click()}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] p-4 text-xs font-semibold text-zinc-300 transition-all hover:border-amber-400/40 hover:bg-white/[0.04]"
                        >
                          <ImageIcon className="size-4 text-amber-400" />
                          Upload a background photo or graphic
                        </button>
                      </div>

                      {bgImageUrl && (
                        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                          <div className="flex justify-between items-center text-xs text-zinc-400">
                            <span>Background opacity:</span>
                            <div className="flex items-center gap-2">
                              {bgImageOpacity >= 0.30 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                  <AlertTriangle className="size-3" />
                                  Scan risk
                                </span>
                              )}
                              <strong className={`font-semibold ${bgImageOpacity >= 0.30 ? "text-amber-300" : "text-zinc-200"}`}>
                                {Math.round(bgImageOpacity * 100)}%
                              </strong>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={0.8}
                            step={0.05}
                            value={bgImageOpacity}
                            onChange={(e) => handleOpacityChange(Number(e.target.value))}
                            className="w-full accent-amber-400"
                          />
                          
                          {bgImageOpacity >= 0.30 ? (
                            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                              <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
                              <div className="leading-relaxed">
                                <span className="font-semibold text-amber-300">This QR code may fail to scan:</span>{" "}
                                Opacity above 30% can cause phone cameras (especially Samsung, Xiaomi, and iPhone) to miss the code. Stay within the <strong>15% – 25%</strong> range.
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-zinc-400">
                              ✓ Safe range: <strong>15% – 25%</strong> — enough background detail without hurting scanability.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: QUALITY & PRINT */}
                  {customizerTab === "export" && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <span className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Download size (px):
                        </span>
                        <select
                          value={qrSize}
                          onChange={(e) => setQrSize(Number(e.target.value))}
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200 focus:border-amber-400 focus:outline-none"
                        >
                          <option value={512}>512 x 512 px (Screen standard)</option>
                          <option value={1024}>1024 x 1024 px (Sharp HD)</option>
                          <option value={2048}>2048 x 2048 px (Ultra HD banner print)</option>
                        </select>
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-zinc-400 mb-1.5">
                          Error correction:
                        </span>
                        <select
                          value={errorCorrection}
                          disabled={Boolean(logoUrl || bgImageUrl)}
                          onChange={(e) => setErrorCorrection(e.target.value as "L" | "M" | "Q" | "H")}
                          className="w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-xs text-zinc-200 focus:border-amber-400 focus:outline-none disabled:opacity-50"
                        >
                          <option value="L">Low (L – 7%)</option>
                          <option value="M">Medium (M – 15%, recommended)</option>
                          <option value="Q">Quartile (Q – 25%)</option>
                          <option value="H">High (H – 30%, print)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live QR Preview & Actions (5 cols) */}
              <div className="space-y-6 lg:col-span-5">
                <div className="sticky top-28 rounded-3xl border border-white/10 bg-[#080b13]/90 p-6 shadow-2xl backdrop-blur-xl text-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-300">
                    <Sparkles className="size-3" />
                    Live Preview
                  </div>

                  {/* QR Canvas Display */}
                  <div className="mt-6 flex items-center justify-center">
                    <div
                      className={`relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 p-4 shadow-2xl transition-all ${
                        isTransparentBg
                          ? "bg-[linear-gradient(45deg,#18181b_25%,transparent_25%),linear-gradient(-45deg,#18181b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#18181b_75%),linear-gradient(-45deg,transparent_75%,#18181b_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px] bg-zinc-900"
                          : ""
                      }`}
                      style={{ backgroundColor: isTransparentBg ? undefined : bgColor }}
                    >
                      {/* Background Image Layer if set */}
                      {bgImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bgImageUrl}
                          alt="QR code background"
                          style={{ opacity: bgImageOpacity }}
                          className="pointer-events-none absolute inset-0 size-full object-cover"
                        />
                      )}

                      {/* Main Dynamic QR Container */}
                      <div ref={qrContainerRef} className="relative z-10 flex items-center justify-center" />
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-zinc-400">
                    Export resolution: <strong className="text-zinc-200">{qrSize} x {qrSize} px</strong> • Permanent static QR
                  </p>

                  {errorBanner ? (
                    <div
                      role="alert"
                      className="mt-3 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/[0.09] px-3 py-2 text-left text-[11px] leading-5 text-red-200"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-red-300" aria-hidden="true" />
                      <p className="flex-1">{errorBanner}</p>
                      <button
                        type="button"
                        onClick={() => setErrorBanner(null)}
                        aria-label="Dismiss warning"
                        className="rounded p-0.5 text-red-300/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  {!payloadValidation.valid ? (
                    <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-3 py-2 text-left text-[11px] leading-5 text-amber-200">
                      {payloadValidation.message}
                    </p>
                  ) : null}

                  {bgImageUrl && bgImageOpacity >= 0.30 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-300">
                      <AlertTriangle className="size-3 shrink-0" />
                      <span>Opacity {Math.round(bgImageOpacity * 100)}%: may be hard to scan</span>
                    </div>
                  )}

                  {/* Download Action Buttons */}
                  <div className="mt-6 space-y-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadPng}
                      disabled={isDownloading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-400/25 transition-all hover:bg-amber-300 hover:scale-[1.01] disabled:opacity-50"
                    >
                      <Download className="size-4" />
                      {isDownloading ? "Generating image..." : "Download PNG"}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      >
                        <FileCode className="size-3.5 text-amber-300" />
                        Download SVG
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadWebp}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                      >
                        <Download className="size-3.5 text-orange-300" />
                        Download WebP
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyImage}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/10"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Image copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy image
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Responsive Ad */}
            <div className="mt-14">
              <AdSlot type="responsive" />
            </div>

            {/* SEO & Educational Guide Section */}
            <article className="mt-16 rounded-3xl border border-white/10 bg-[#080b13]/60 p-6 sm:p-10 backdrop-blur-md">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Info className="size-3.5" />
                Aesthetic QR Code Design Guide
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                How to design a custom QR code for your brand
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                QR codes don&apos;t have to look generic. With DextroKit&apos; aesthetic QR generator, you can tune
                every graphic detail to match your brand identity without sacrificing scanability. Every code
                is rendered locally in your browser — nothing is uploaded, and no tracking redirect sits
                between the scan and your destination:
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-amber-500/20 text-xs font-bold text-amber-300">
                    01
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Distinctive dot patterns</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Swap rigid square dots for rounded edges, soft dots, or the ornate classy style. Match the
                    outer corner frames and inner dots, and keep strong contrast between the pattern and the
                    background.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-orange-500/20 text-xs font-bold text-orange-300">
                    02
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Gradients &amp; logos</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Apply a rich color gradient and place your business logo in the center with an automatic
                    safe margin. Error correction is locked to High (H – 30%), and the quiet zone around the code
                    is preserved.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/20 text-xs font-bold text-emerald-300">
                    03
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-white">Print-ready exports</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Download PNG files up to 2048px or vector SVG files ready for billboards, cafe menus, or
                    business cards. Print a proof at its final size, keep it wide enough to scan comfortably,
                    and test it with two or three phones before the full run.
                  </p>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="mt-12 border-t border-white/[0.06] pt-8">
                <h3 className="text-xl font-bold text-white">Frequently Asked Questions</h3>
                <div className="mt-6 divide-y divide-white/[0.06]">
                  {FAQ_ITEMS.map((faq, idx) => (
                    <div key={idx} className="py-4">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                        className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-200 transition-colors hover:text-amber-300"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-zinc-500 transition-transform duration-200 ${
                            openFaq === idx ? "rotate-180 text-amber-300" : ""
                          }`}
                        />
                      </button>
                      {openFaq === idx && (
                        <p className="mt-3 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </div>

        {/* Opacity warning modal (triggered when opacity >= 30%) */}
        {showOpacityWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="warning-modal-title"
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/30 bg-[#0d111c] p-6 shadow-2xl shadow-amber-500/10 sm:p-7"
            >
              {/* Decorative Glow */}
              <div className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full bg-amber-500/20 blur-3xl" />

              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-400 shadow-inner">
                  <AlertTriangle className="size-6 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Scanner readability warning
                  </span>
                  <h3 id="warning-modal-title" className="text-lg font-bold text-white">
                    This QR code may not scan
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs leading-relaxed text-zinc-300">
                <p>
                  Background image opacity is set to{" "}
                  <strong className="text-amber-300 font-semibold">{Math.round(bgImageOpacity * 100)}%</strong>.
                  Opacity above <strong>30%</strong> can make phone cameras (such as Samsung, Xiaomi, and iPhone) fail to detect the QR code, because the dot pattern competes with the contrast of the image behind it.
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-zinc-400">
                  💡 <strong className="text-zinc-200">Optimal tip:</strong> Keep opacity in the{" "}
                  <strong className="text-amber-300">15% – 25%</strong> range so the code scans quickly and reliably on every phone.
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowOpacityWarningModal(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Continue anyway ({Math.round(bgImageOpacity * 100)}%)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBgImageOpacity(0.20);
                    setWarnedForHighOpacity(false);
                    setShowOpacityWarningModal(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-amber-400/25 transition-all hover:bg-amber-300 hover:scale-[1.01]"
                >
                  Apply safe value (20%)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
