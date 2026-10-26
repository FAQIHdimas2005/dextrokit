import {
  AudioLines,
  Clapperboard,
  Eraser,
  EyeOff,
  FileText,
  Film,
  Image,
  Images,
  LayoutGrid,
  QrCode,
  WandSparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  AudioLines,
  Clapperboard,
  Eraser,
  EyeOff,
  FileText,
  Film,
  Image,
  Images,
  LayoutGrid,
  QrCode,
  WandSparkles,
  Wrench,
};

export function getIcon(name: string): LucideIcon {
  return icons[name] ?? Wrench;
}
