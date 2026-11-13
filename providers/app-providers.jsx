"use client";

import { Suspense } from "react";
import { ThemeProvider } from "@/providers/theme-provider";
import { ReduxProvider } from "@/providers/redux-provider";
import { AppShellFallback } from "@/components/layout/app-shell-fallback";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* Redux ka store banate waqt Math.random() chalta hai (combineReducers). Next 16 isse
          prerender mein block karta hai, isliye provider Suspense ke andar stream hota hai. */}
      <Suspense fallback={<AppShellFallback />}>
        <ReduxProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </ReduxProvider>
      </Suspense>
    </ThemeProvider>
  );
}
