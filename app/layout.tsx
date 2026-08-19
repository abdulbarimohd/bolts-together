import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Fonts are self-hosted from `app/fonts/`, served from our own origin. No
 * Google Fonts CDN link, no third-party request, no build-time network
 * fetch — which also means the Cloudflare Workers build cannot fail on a
 * font download.
 *
 * Both files are the variable Geist faces (weight axis 100–900), so the whole
 * weight range costs one request each. Latin subset only; if the catalogue
 * ever needs Central European diacritics, the latin-ext files are the
 * companion subset to add.
 *
 * Geist and Geist Mono are licensed under the SIL Open Font License 1.1.
 */
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial"],
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Bolts Together",
    template: "%s · Bolts Together",
  },
  description:
    "A UK bike compatibility engine. Pick a frame and every other part list narrows to what genuinely fits it.",
};

export const viewport: Viewport = {
  // Dark only — tells the browser to paint chrome and form controls to match.
  colorScheme: "dark",
  themeColor: "#0A0C10",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Without JS the IntersectionObserver never runs, so anything waiting
          to be revealed would stay at opacity 0 forever. Content first: if
          the motion cannot run, the motion is what gets dropped.
        */}
        <noscript>
          <style>{`[data-reveal],[data-stagger]>*{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col bg-ink font-sans text-text">
        {children}
      </body>
    </html>
  );
}
