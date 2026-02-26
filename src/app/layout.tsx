import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Panguard AI \u2014 Your AI Security Guard",
    template: "%s | Panguard AI",
  },
  description:
    "AI-powered endpoint security for developers and SMBs. One command to install. Zero configuration. Panguard detects threats, responds automatically, and explains everything in plain language.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://panguard.ai",
    siteName: "Panguard AI",
    title: "Panguard AI \u2014 Your AI Security Guard",
    description:
      "One command to install. AI protects everything. It tells you when something's wrong.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Panguard AI \u2014 Your AI Security Guard",
    description:
      "AI-powered endpoint security. One command. Full protection.",
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.png" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Panguard AI",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Linux, macOS",
  description:
    "AI-powered endpoint security for developers and SMBs. One command to install. Zero configuration.",
  url: "https://panguard.ai",
  offers: {
    "@type": "Offer",
    price: "49",
    priceCurrency: "USD",
    priceValidUntil: "2026-12-31",
  },
  publisher: {
    "@type": "Organization",
    name: "Panguard AI, Inc.",
    url: "https://panguard.ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
