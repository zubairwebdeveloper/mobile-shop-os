import { Reveal } from "@/components/animations/reveal";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/shared/section-heading";

export function ProductSection({ id, eyebrow, title, description, href, products, limit = 4 }) {
  return (
    <section className="container-page mt-24" aria-labelledby={id}>
      <Reveal>
        <SectionHeading id={id} eyebrow={eyebrow} title={title} description={description} href={href} />
      </Reveal>
      <Reveal delay={0.08} y={16}>
        <ProductGrid products={products.slice(0, limit)} columns="lg:grid-cols-4" />
      </Reveal>
    </section>
  );
}
