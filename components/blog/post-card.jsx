import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/format";

export function PostCard({ post }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block h-full rounded-2xl focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="h-full gap-4 transition-all group-hover:-translate-y-1 group-hover:shadow-glow">
        <div className="mx-6 grid aspect-[16/9] place-items-center rounded-xl bg-[linear-gradient(135deg,#2563eb,#16a085)] font-display text-2xl font-bold tracking-widest text-white/90">
          {post.category.toUpperCase()}
        </div>
        <CardHeader>
          <Badge variant="secondary">{post.category}</Badge>
          <CardTitle className="pt-1 text-xl leading-snug group-hover:text-primary">{post.title}</CardTitle>
          <CardDescription>{post.excerpt}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {post.readTime} min read
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
