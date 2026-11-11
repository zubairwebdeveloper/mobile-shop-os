import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatDate } from "@/lib/utils/format";
import { getPost, getPosts } from "@/services/catalog";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <>
      <PageHeader title={post.title} crumbs={[{ label: "Blog", href: "/blog" }, { label: post.category }]}>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{post.category}</Badge>
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-4" /> {post.readTime} min read
          </span>
        </div>
      </PageHeader>
      <article className="container-page max-w-3xl py-10">
        <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="mt-6 space-y-5 text-base leading-relaxed">
          {post.body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <Link href="/blog" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to all articles
        </Link>
      </article>
    </>
  );
}
