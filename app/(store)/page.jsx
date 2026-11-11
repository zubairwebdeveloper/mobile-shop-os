import { Hero } from "@/components/home/hero";
import { BrandStrip } from "@/components/home/brand-strip";
import { TrustBar } from "@/components/home/trust-bar";
import { CategoryGrid } from "@/components/home/category-grid";
import { ProductSection } from "@/components/home/product-section";
import { Offers } from "@/components/home/offers";
import { FinderPromo } from "@/components/home/finder-promo";
import { AiPromo } from "@/components/home/ai-promo";
import { ReviewsSection } from "@/components/home/reviews-section";
import { BlogSection } from "@/components/home/blog-section";
import { Newsletter } from "@/components/home/newsletter";
import { getBestSellers, getFeatured, getLatest } from "@/services/catalog";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <BrandStrip />
      <CategoryGrid />
      <ProductSection
        id="featured-heading"
        eyebrow="Handpicked"
        title="Featured products"
        description="Our team's top picks this month."
        href="/shop"
        products={getFeatured()}
      />
      <ProductSection
        id="bestsellers-heading"
        eyebrow="Most loved"
        title="Best sellers"
        href="/shop"
        products={getBestSellers()}
      />
      <Offers />
      <ProductSection
        id="latest-heading"
        eyebrow="Just landed"
        title="Latest arrivals"
        href="/shop"
        products={getLatest()}
      />
      <FinderPromo />
      <AiPromo />
      <ReviewsSection />
      <BlogSection />
      <Newsletter />
    </>
  );
}
