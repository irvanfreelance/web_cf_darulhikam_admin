import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/auth-provider";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
});

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Panel administrasi donasi online.",
};

import { SWRProvider } from "@/components/providers/swr-provider";
import DynamicBranding from "@/components/admin/dynamic-branding";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sourceSans.variable} antialiased`}>
      <body className="bg-slate-50 min-h-screen font-source-sans text-slate-800">
        <AuthProvider>
          <SWRProvider>
            <DynamicBranding />
            {children}
          </SWRProvider>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

