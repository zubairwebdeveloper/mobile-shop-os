import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";

// Dev-only strip: foundation ke baad full storefront sections Phase 02 mein aayenge.
export function PhaseNote() {
  return (
    <section className="container-page mt-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand-dark px-6 py-12 text-center text-white sm:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(37_99_235/0.45),transparent)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/10">
              <Sparkles className="size-6 text-accent" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">The full storefront is on its way</h2>
            <p className="mt-3 text-white/70">
              Foundation ready hai: theme, navigation, layout aur providers. Featured products, 3D
              showcase, AI assistant aur baqi sections Phase 02 mein add honge.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
