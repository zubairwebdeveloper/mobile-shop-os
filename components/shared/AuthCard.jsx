import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import BrandMark from "@/components/shared/BrandMark";
import { cn } from "@/lib/utils";

/** Card container used by every auth/onboarding form. Presentational (works in Server Components). */
export default function AuthCard({ title, description, children, footer, className }) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="gap-2">
        <BrandMark className="mb-1 size-9" />
        <CardTitle className="font-heading text-2xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? <CardFooter className="flex-col items-start gap-2 text-sm text-muted-foreground">{footer}</CardFooter> : null}
    </Card>
  );
}
