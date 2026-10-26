import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms of use for DextroKit, a free collection of browser-based file utilities with client-side processing.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      badge="Terms & conditions"
      title="Simple, transparent terms of use."
      description="By accessing DextroKit, you agree to use the service reasonably, responsibly, and in compliance with applicable law."
      updatedAt="October 22, 2026"
      sections={[
        {
          heading: "1. Acceptance of terms",
          paragraphs: [
            "By accessing or using DextroKit, you confirm that you have read, understood, and agree to these terms and conditions. If you do not agree, please do not use the service.",
          ],
        },
        {
          heading: "2. The service",
          paragraphs: [
            "DextroKit provides web-based tools for working with images, video, audio, PDF documents, and other everyday utilities. Most processing runs in the user's browser; the AI inpainting tool additionally uses a server-side model with immediate deletion of temporary files, as described in the Privacy Policy.",
            "Tool availability may change, be limited, or be discontinued at any time without prior notice, particularly during maintenance or feature development.",
          ],
        },
        {
          heading: "3. Acceptable use",
          bullets: [
            "You may process only files that you own or are authorized to process.",
            "You may not use DextroKit to infringe copyrights, privacy rights, or any other rights of third parties.",
            "You may not attempt to disrupt the security, integrity, or availability of the service, including by automated flooding of its endpoints.",
          ],
        },
        {
          heading: "4. Intellectual property",
          paragraphs: [
            "You retain all rights to the files you process. DextroKit claims no ownership over your content because your files are not uploaded to our servers.",
            "The DextroKit name, logo, interface, and original materials are protected by applicable intellectual property law.",
          ],
        },
        {
          heading: "5. Advertising and third-party links",
          paragraphs: [
            "This service may display advertising slots or links to third-party products. DextroKit does not control the content, policies, or practices of those third parties and is not responsible for them.",
          ],
        },
        {
          heading: "6. Disclaimer of warranties",
          paragraphs: [
            "DextroKit is provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, we make no warranty that the service will be error-free, uninterrupted, or fit for a particular purpose.",
          ],
        },
        {
          heading: "7. Limitation of liability",
          paragraphs: [
            "You are responsible for backing up important files before processing them. To the maximum extent permitted by law, DextroKit is not liable for any loss of data, loss of profit, or indirect, incidental, or consequential damages arising from your use of the service.",
          ],
        },
        {
          heading: "8. Changes and governing law",
          paragraphs: [
            "We may update these terms from time to time. Continued use of the service after an update is published constitutes acceptance of the latest version.",
            "These terms are governed by the laws of the Republic of Indonesia, without prejudice to any consumer protections that must be granted under applicable law.",
          ],
        },
      ]}
    />
  );
}
