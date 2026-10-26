import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How DextroKit processes your files locally in the browser, what we never collect, and the limited role of third-party services.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      badge="Privacy policy"
      title="Your privacy isn't an add-on. It's the foundation."
      description="DextroKit is built on a zero-server-storage principle. This page explains what we never collect, how local processing works, and the narrow role of third-party services."
      updatedAt="October 22, 2026"
      sections={[
        {
          heading: "1. How your files are processed",
          paragraphs: [
            "Every file you select is processed with the APIs and memory of your own device. For browser-based tools, files are not transmitted, uploaded, or stored on DextroKit servers.",
            "When you close the tab or browser, the file data held in session memory is released according to your device's normal behavior. DextroKit keeps no copy of your files, no converted output, and no usage history.",
            "The LaMa AI Inpainting engine is the single exception, and it is described in section 3 below.",
          ],
        },
        {
          heading: "2. Data we do not collect",
          bullets: [
            "We do not require an account, phone number, or email address to use any tool.",
            "We do not store your original files, output files, file names, or file metadata on a server.",
            "We do not sell usage data to third parties.",
          ],
          paragraphs: [
            "Technical information that your browser sends automatically when loading a page — such as IP address, device type, and requested URL — may be recorded by our hosting provider for security and operational purposes.",
          ],
        },
        {
          heading: "3. AI inpainting requests",
          paragraphs: [
            "The Image Watermark Remover runs on our LaMa inpainting engine. Brush strokes, previews, and masking happen locally in your browser. When you press the button to remove a watermark, the marked image and its mask are sent to our own processing endpoint at /api/inpaint.",
            "For those requests, the image and mask are written to a randomly named temporary directory on the server, processed once, and permanently deleted immediately afterward — including when processing fails. We do not log, index, retain, or share the contents of those files, and request-size limits, strict file-type validation, rate limiting, and a processing timeout are enforced on the endpoint.",
          ],
        },
        {
          heading: "4. Cookies and advertising",
          paragraphs: [
            "The current version of this site does not enable advertising or analytics cookies. The ad slots you see are placeholders without tracking scripts.",
            "If advertising services such as Google AdSense, Adsterra, or Monetag are enabled in the future, those partners may use cookies or similar technologies under their own privacy policies. This page will be updated before that happens.",
          ],
        },
        {
          heading: "5. Security",
          paragraphs: [
            "Because files are processed on your device, the risks associated with transferring them across a network are avoided entirely. You remain responsible for the security of your device, browser, and internet connection.",
            "We recommend using a current browser so you benefit from the latest processing APIs and security protections. Our API endpoints enforce request-size limits, strict content-type validation, and rate limiting.",
          ],
        },
        {
          heading: "6. Children's privacy",
          paragraphs: [
            "DextroKit is not directed specifically at children and does not knowingly collect personal data from children. Every tool can be used without creating an account or providing personal information.",
          ],
        },
        {
          heading: "7. Changes to this policy",
          paragraphs: [
            "This policy may be updated as features, technology, or legal obligations change. The latest version is always published on this page together with its revision date.",
          ],
        },
      ]}
    />
  );
}
