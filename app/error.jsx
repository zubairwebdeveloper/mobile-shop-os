"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page grid min-h-[60dvh] place-items-center py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center justify-items-center">
          <span className="mb-2 grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-7" />
          </span>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again or head back to the homepage.
          </CardDescription>
        </CardHeader>
        {error?.digest && (
          <CardContent>
            <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
          </CardContent>
        )}
        <CardFooter className="justify-center gap-3">
          <Button onClick={() => reset()}>
            <RefreshCw /> Try again
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Go home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
