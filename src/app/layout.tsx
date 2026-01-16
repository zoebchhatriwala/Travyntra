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
  metadataBase: new URL("https://travyntra.com"),
  title: {
    default: "Travyntra | Corporate Joy for Business Travel",
    template: "%s | Travyntra"
  },
  description: "The operating system for business travel. A multi-tenant ecosystem connecting Agencies, Companies, and Staff with joy and precision.",
  keywords: ["Corporate Travel", "Travel Management", "Business Travel", "SaaS", "Workflow Automation", "Expense Management"],
  authors: [{ name: "Travyntra Team" }],
  creator: "Travyntra",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://travyntra.com",
    title: "Travyntra | Corporate Joy for Business Travel",
    description: "The operating system for business travel. A multi-tenant ecosystem connecting Agencies, Companies, and Staff with joy and precision.",
    siteName: "Travyntra",
    images: [
      {
        url: "/og-image", // Next.js will resolve this to the generated image
        width: 1200,
        height: 630,
        alt: "Travyntra - Corporate Joy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travyntra | Corporate Joy for Business Travel",
    description: "The operating system for business travel. A multi-tenant ecosystem connecting Agencies, Companies, and Staff with joy and precision.",
    images: ["/og-image"],
    creator: "@travyntra",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};


import { DevLoginSwitcher } from "@/components/layout/dev-login-switcher";

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
          <DevLoginSwitcher />
        </AuthProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
