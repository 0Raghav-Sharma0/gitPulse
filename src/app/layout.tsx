import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import JsonLd from "./components/json-ld";
import { Providers } from "@/components/Providers";
import { getCanonicalSiteUrl } from "@/lib/site-url";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#FDFCFB",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const canonicalSiteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
  applicationName: "GitPulse",
  title: {
    default: "GitPulse - Understand any codebase in seconds",
    template: "%s | GitPulse",
  },
  description: "Agentic CAG-powered analysis for GitHub repositories and developer profiles. Chat with your codebase, generate visual flowcharts, uncover deep insights, detect vulnerabilities, and accelerate development with AI-driven repository intelligence.",
  keywords: [
    "agentic AI",
    "compositional agentic generation",
    "github repo visualizer",
    "codebase analysis",
    "ai code assistant",
    "repository flowcharts",
    "code intelligence",
    "github repo chat",
    "repository chat",
    "code understanding",
    "developer tools",
    "static analysis",
    "vulnerability detection",
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: "GitPulse",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "GitPulse - Understand any codebase in seconds",
    description: "Agentic CAG-powered analysis for GitHub repositories. Chat with your codebase, generate visual flowcharts, uncover deep insights, and accelerate development with AI-driven repository intelligence.",
    url: canonicalSiteUrl,
    siteName: "GitPulse",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "GitPulse - Understand any codebase in seconds",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitPulse - Understand any codebase in seconds",
    description: "Agentic CAG-powered analysis for GitHub repositories. Chat with your codebase, generate visual flowcharts, uncover deep insights, and accelerate development.",
    images: ["/og-image.svg"],
    creator: "@gitpulse",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "UkRCYeGXDptF64Z3y2sS0d2AUkCSuirzjRZQJUz1iEQ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable}`} suppressHydrationWarning>
      <body
        className="antialiased font-sans"
        suppressHydrationWarning
      >
        <JsonLd />
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#FEF9F2',
              border: '2px solid #000',
              color: '#1f2937',
            },
          }}
        />
      </body>
    </html>
  );
}
