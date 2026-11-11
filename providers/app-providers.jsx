"use client";

import { ThemeProvider } from "@/providers/theme-provider";
import { ReduxProvider } from "@/providers/redux-provider";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ReduxProvider>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </ReduxProvider>
    </ThemeProvider>
  );
}
