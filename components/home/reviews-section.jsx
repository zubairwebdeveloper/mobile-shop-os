import { Quote } from "lucide-react";
import { Reveal } from "@/components/animations/reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingStars } from "@/components/product/rating-stars";
import { SectionHeading } from "@/components/shared/section-heading";
import { getReviews } from "@/services/catalog";

export function ReviewsSection() {
  const reviews = getReviews().slice(0, 6);
  return (
    <section className="container-page mt-24" aria-labelledby="reviews-heading">
      <Reveal>
        <SectionHeading
          id="reviews-heading"
          eyebrow="Testimonials"
          title="Loved by customers across Pakistan"
          description="Sample reviews shown for design preview."
        />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r, i) => (
          <Reveal key={r.id} delay={(i % 3) * 0.07} y={16}>
            <Card className="h-full">
              <CardHeader>
                <Quote className="size-6 text-primary/40" />
                <CardTitle className="pt-1">{r.title}</CardTitle>
                <RatingStars rating={r.rating} />
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="leading-relaxed">{r.text}</CardDescription>
              </CardContent>
              <CardContent className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 font-heading font-bold text-primary">
                  {r.name[0]}
                </span>
                <div className="text-sm">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-muted-foreground">
                    {r.city} &middot; {r.product}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
