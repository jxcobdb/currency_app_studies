"use client";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { AuthProvider } from "@/lib/supabase/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <NextUIProvider navigate={router.push}>{children}</NextUIProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
