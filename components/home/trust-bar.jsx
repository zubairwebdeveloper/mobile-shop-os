import { Headset, ShieldCheck, Truck, Wrench } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";

const ITEMS = [
  { icon: ShieldCheck, title: "100% Genuine", text: "Sealed, verified and PTA-approved devices." },
  { icon: Truck, title: "Fast Delivery", text: "Tracked shipping across Pakistan." },
  { icon: Wrench, title: "Repair & Warranty", text: "In-house repairs with warranty tracking." },
  { icon: Headset, title: "Expert Support", text: "Real people on call and WhatsApp." },
];

export function TrustBar() {
  return (
    <section aria-label="Why shop with us" className="container-page">
      <ul className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="bg-card">
            <Reveal delay={i * 0.06} y={12} className="flex items-start gap-4 p-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <h3 className="font-heading text-[15px] font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
