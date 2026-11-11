import { PageHeader } from "@/components/shared/page-header";
import { PostCard } from "@/components/blog/post-card";
import { getPosts } from "@/services/catalog";

export const metadata = {
  title: "Blog",
  description: "Smartphone buying guides, care tips and tech news.",
};

export default function BlogPage() {
  return (
    <>
      <PageHeader
        title="Technology blog"
        description="Guides and tips to help you buy, use and care for your devices."
        crumbs={[{ label: "Blog" }]}
      />
      <div className="container-page grid gap-5 py-10 md:grid-cols-2 lg:grid-cols-3">
        {getPosts().map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </>
  );
}
