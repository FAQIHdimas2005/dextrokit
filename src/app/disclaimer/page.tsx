import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Important information about the limits, processing results, and responsibilities of using DextroKit.",
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <LegalPage
      badge="Disclaimer"
      title="Use it deliberately. Keep a backup of your files."
      description="DextroKit aims to be fast and dependable, but processing results can vary with the file, format, device, and browser you use."
      updatedAt="October 22, 2026"
      sections={[
        {
          heading: "1. General information",
          paragraphs: [
            "All content and tools on DextroKit are provided for general informational purposes. We do not guarantee that any processing result will be accurate, complete, or suitable for your specific requirements.",
          ],
        },
        {
          heading: "2. Your responsibility for files",
          paragraphs: [
            "Make sure you have the right to process any file you upload to a tool. You are solely responsible for the contents of your files, including compliance with copyrights, trademarks, and the privacy rights of others.",
            "Always keep a backup of the original file before converting, compressing, removing a background, or making any other modification. Processing can alter both quality and metadata.",
          ],
        },
        {
          heading: "3. Processing results",
          bullets: [
            "Output quality can be affected by the resolution, codec, compression, and source format of your file.",
            "Format support can differ between browsers and devices.",
            "Some demanding operations may require more memory and time on certain devices.",
            "AI-based tools such as background removal and inpainting produce an approximation, not a guaranteed reconstruction of the original scene.",
          ],
        },
        {
          heading: "4. Service availability",
          paragraphs: [
            "We do not guarantee that the service will always be available without interruption. Maintenance, browser updates, or device conditions may affect your use of the tools.",
          ],
        },
        {
          heading: "5. Third-party links and advertising",
          paragraphs: [
            "This site may contain advertising slots or external links. The presence of an advertisement or link is not an endorsement of any third-party product, service, or claim. We are not responsible for transactions or losses arising from interactions with those third parties.",
          ],
        },
        {
          heading: "6. Not professional advice",
          paragraphs: [
            "Information on DextroKit is not legal, financial, medical, or other professional advice. Consult a qualified professional before making important decisions.",
          ],
        },
        {
          heading: "7. Acceptance of risk",
          paragraphs: [
            "By using DextroKit, you understand and accept that your use of the service, and any risk associated with it, is entirely your responsibility.",
          ],
        },
      ]}
    />
  );
}
