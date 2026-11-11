import { Bot, GitCompareArrows, MessageSquareText, Sparkles } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: MessageSquareText, title: "Ask in plain language", text: '"Best camera phone under Rs. 150,000?"' },
  { icon: GitCompareArrows, title: "Instant comparisons", text: "Side-by-side verdicts on any two phones." },
  { icon: Sparkles, title: "Budget advice", text: "Recommendations that respect your limit." },
];

// Promotional only: the real Gemini-powered assistant is Phase 07.
export function AiPromo() {
  return (
    <section className="container-page mt-24" aria-labelledby="ai-heading">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand-dark p-8 text-white sm:p-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(50%_70%_at_85%_20%,rgb(37_99_235/0.5),transparent),radial-gradient(40%_60%_at_10%_100%,rgb(22_160_133/0.35),transparent)]"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <Badge className="bg-white/10 text-accent">
                <Bot /> AI Shopping Assistant &middot; Coming soon
              </Badge>
              <h2 id="ai-heading" className="mt-5 text-3xl font-extrabold sm:text-4xl">
                Your personal phone expert, powered by AI
              </h2>
              <p className="mt-3 max-w-lg text-white/70">
                Get honest recommendations from our real inventory. Prices and stock always come from the store,
                never from the AI.
              </p>
            </div>
            <ul className="space-y-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-heading text-sm font-bold">{title}</p>
                    <p className="text-sm text-white/65">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
