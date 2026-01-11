import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/components/providers/session-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travyntra | Travel, Simplified at Scale",
  description: "A unified platform to manage journeys, streamline operations, and deliver seamless travel experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
