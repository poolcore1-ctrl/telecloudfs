import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../App.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TeleCloudFS - Your Private Telegram Drive",
  description: "High-performance cloud storage using Telegram as a backend.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-telegram-bg text-telegram-text h-screen w-screen overflow-hidden`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
