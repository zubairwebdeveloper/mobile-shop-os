import { Reveal } from "@/components/animations/reveal";
import { PostCard } from "@/components/blog/post-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { getPosts } from "@/services/catalog";

export function BlogSection() {
  return (
    <section className="container-page mt-24" aria-labelledby="blog-heading">
      <Reveal>
        <SectionHeading
          id="blog-heading"
          eyebrow="Technology blog"
          title="Guides, tips and tech news"
          href="/blog"
          linkLabel="All articles"
        />
      </Reveal>
      <div className="grid gap-5 md:grid-cols-3">
        {getPosts().map((post, i) => (
          <Reveal key={post.slug} delay={i * 0.07} y={16}>
            <PostCard post={post} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
