import type { Metadata } from "next";
import { IBM_Plex_Mono, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DomainCheckr — Bulk Availability Research",
  description:
    "A local utility for bulk domain name availability checking with RDAP and Namecheap support. Test domain combinations for product naming research.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${ibmPlexMono.variable} ${geist.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
