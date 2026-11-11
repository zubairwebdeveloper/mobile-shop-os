import Link from "next/link";
import { ArrowRight, Percent, RefreshCcw } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SectionHeading } from "@/components/shared/section-heading";

export function Offers() {
  return (
    <section className="container-page mt-24" aria-labelledby="offers-heading">
      <Reveal>
        <SectionHeading id="offers-heading" eyebrow="Exclusive" title="Offers you will not find elsewhere" />
      </Reveal>
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <div className="relative h-full overflow-hidden rounded-3xl bg-brand-dark p-8 text-white sm:p-10">
            <div aria-hidden="true" className="absolute -top-20 -right-20 size-72 rounded-full bg-primary/40 blur-[80px]" />
            <div className="relative">
              <Badge variant="mint" className="bg-white/10 text-accent">
                <Percent /> Limited time
              </Badge>
              <h3 className="mt-5 text-3xl font-extrabold sm:text-4xl">Flagship deals up to 15% off</h3>
              <p className="mt-3 max-w-md text-white/70">
                Save on selected flagship phones with full warranty and free nationwide delivery.
              </p>
              <Link href="/deals" className={cn(buttonVariants({ variant: "mint", size: "lg" }), "mt-7")}>
                See all deals <ArrowRight />
              </Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="relative h-full overflow-hidden rounded-3xl border bg-card p-8 sm:p-10">
            <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-64 rounded-full bg-accent/20 blur-[70px]" />
            <div className="relative">
              <Badge variant="secondary">
                <RefreshCcw /> Certified
              </Badge>
              <h3 className="mt-5 text-3xl font-extrabold sm:text-4xl">Refurbished, tested and warrantied</h3>
              <p className="mt-3 max-w-md text-muted-foreground">
                Premium phones at a friendlier price, each inspected with battery health guaranteed.
              </p>
              <Link href="/shop" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-7")}>
                Browse the shop <ArrowRight />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
