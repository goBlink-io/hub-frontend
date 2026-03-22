import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "goBlink — Cross-Chain Everything",
    template: "%s | goBlink",
  },
  description:
    "One app. Every chain. Swap, pay, and build across 26+ blockchains with goBlink.",
  metadataBase: new URL("https://goblink.io"),
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "goBlink — Cross-Chain Everything",
    description:
      "One app. Every chain. Swap, pay, and build across 26+ blockchains.",
    url: "https://goblink.io",
    siteName: "goBlink",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "goBlink — Cross-Chain Everything",
    description:
      "One app. Every chain. Swap, pay, and build across 26+ blockchains.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col antialiased noise-overlay">
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
