import { AdSlot } from "@/components/AdSlot";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { ToolsExplorer } from "@/components/ToolsExplorer";
import { WhyChooseSection } from "@/components/WhyChooseSection";
import {
  isToolCategory,
  type CategoryFilterValue,
} from "@/data/tools";

interface HomePageProps {
  searchParams: Promise<{
    category?: string | string[];
  }>;
}

function resolveCategory(
  category: string | string[] | undefined,
): CategoryFilterValue {
  const value = Array.isArray(category) ? category[0] : category;
  return isToolCategory(value) ? value : "all";
}

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialCategory = resolveCategory(params.category);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <AdSlot type="banner-728" />
        </div>

        <ToolsExplorer
          key={initialCategory}
          initialCategory={initialCategory}
        />

        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
          <AdSlot type="responsive" />
        </div>

        <WhyChooseSection />
      </main>

      <Footer />
    </div>
  );
}
