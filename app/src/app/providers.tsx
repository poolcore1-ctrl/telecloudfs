'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../context/ThemeContext";
import { ConfirmProvider } from "../context/ConfirmContext";
import { DropZoneProvider } from "../contexts/DropZoneContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Toaster } from "sonner";
import { useTheme } from "../context/ThemeContext";
import { useState } from "react";

function ToasterWithTheme() {
  const { theme } = useTheme();
  return <Toaster theme={theme as any} position="bottom-center" />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ConfirmProvider>
            <DropZoneProvider>
              <ToasterWithTheme />
              {children}
            </DropZoneProvider>
          </ConfirmProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
