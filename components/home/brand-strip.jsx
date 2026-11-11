import Link from "next/link";
import { getBrands } from "@/services/catalog";
import { Reveal } from "@/components/animations/reveal";

export function BrandStrip() {
  const brands = getBrands();
  return (
    <section className="container-page mt-20" aria-labelledby="brands-heading">
      <Reveal>
        <h2 id="brands-heading" className="mb-6 text-center font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
          Trusted brands we carry
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-3">
          {brands.map((b) => (
            <li key={b.slug}>
              <Link
                href={`/brands/${b.slug}`}
                className="inline-flex h-12 items-center rounded-xl border bg-card px-6 font-display text-base font-bold tracking-wide text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground hover:shadow-soft focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {b.name}
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
