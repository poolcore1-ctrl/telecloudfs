'use client';

import { useState, useEffect } from "react";
import { AuthWizard } from "../components/AuthWizard";
import { useRouter } from "next/navigation";
import { telegramService } from "../services/TelegramClient";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    telegramService.setupServiceWorkerHandler();
    const checkAuth = async () => {
        const isAuth = await telegramService.checkAuthorization();
        setIsAuthenticated(isAuth);
        if (isAuth) {
            router.push('/dashboard');
        }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
      return <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">Loading session...</div>;
  }

  return (
    <main className="h-screen w-screen text-telegram-text overflow-hidden selection:bg-telegram-primary/30 relative">
      {isAuthenticated ? (
         <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-white">Redirecting to Dashboard...</div>
      ) : (
        <AuthWizard onLogin={() => router.push('/dashboard')} />
      )}
    </main>
  );
}
