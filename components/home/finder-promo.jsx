import Link from "next/link";
import { ArrowRight, BatteryFull, Camera, Gamepad2, Wallet } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const POINTS = [
  { icon: Wallet, label: "Set your budget" },
  { icon: Camera, label: "Pick camera priority" },
  { icon: BatteryFull, label: "Choose battery life" },
  { icon: Gamepad2, label: "Rate gaming needs" },
];

export function FinderPromo() {
  return (
    <section className="container-page mt-24" aria-labelledby="finder-heading">
      <Reveal>
        <div className="grid items-center gap-10 rounded-3xl border bg-card p-8 shadow-soft sm:p-12 lg:grid-cols-2">
          <div>
            <p className="font-display text-sm font-semibold tracking-widest text-primary uppercase">Smart Phone Finder</p>
            <h2 id="finder-heading" className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Not sure which phone to buy?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tell us your budget and what matters most. We rank the best matches from our current catalog.
            </p>
            <Link href="/finder" className={cn(buttonVariants({ size: "lg" }), "mt-7")}>
              Find my phone <ArrowRight />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {POINTS.map(({ icon: Icon, label }, i) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-semibold">
                  <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
