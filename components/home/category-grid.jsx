import Link from "next/link";
import { ArrowUpRight, BatteryCharging, Headphones, Smartphone, Tablet, Watch, Zap } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Foundation placeholder - real categories Phase 04 mein Firestore se aayengi.
const CATEGORIES = [
  { slug: "smartphones", name: "Smartphones", text: "Latest flagships & value picks", icon: Smartphone },
  { slug: "tablets", name: "Tablets", text: "Work and play on a bigger screen", icon: Tablet },
  { slug: "smartwatches", name: "Smartwatches", text: "Track fitness and notifications", icon: Watch },
  { slug: "audio", name: "Audio", text: "Earbuds and headphones", icon: Headphones },
  { slug: "chargers", name: "Chargers", text: "Fast, certified charging", icon: Zap },
  { slug: "power-banks", name: "Power Banks", text: "Stay powered on the go", icon: BatteryCharging },
];

export function CategoryGrid() {
  return (
    <section className="container-page mt-24" aria-labelledby="categories-heading">
      <Reveal>
        <div className="mb-10 max-w-2xl">
          <p className="font-display text-sm font-semibold tracking-widest text-primary uppercase">
            Browse
          </p>
          <h2 id="categories-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Shop by category
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you need around your phone, in one trusted place.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ slug, name, text, icon: Icon }, i) => (
          <Reveal key={slug} delay={(i % 3) * 0.07} y={16}>
            <Link
              href={`/categories/${slug}`}
              className="group block rounded-2xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Card className="h-full gap-4 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-glow">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-dark text-white transition-colors group-hover:bg-primary dark:bg-secondary">
                      <Icon className="size-6" />
                    </span>
                    <ArrowUpRight className="size-5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                  <CardTitle>{name}</CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
