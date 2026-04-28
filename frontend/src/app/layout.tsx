import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VARR | Modern Automotive OS",
  description: "High-performance workshop management platform for modern garages.",
};

import { ToastContainer } from "@/components/ui/Toast";
import { UserProvider } from "@/hooks/useUser";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <UserProvider>
          {children}
          <ToastContainer />
        </UserProvider>
      </body>
    </html>
  );
}
