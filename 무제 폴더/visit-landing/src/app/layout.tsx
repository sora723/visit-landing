import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfig } from "@/lib/config";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";

const config = getSiteConfig();
const initialTheme = mergeSiteTheme(config.theme);

export const metadata: Metadata = {
  title: config.seo.title,
  description: config.seo.description,
  openGraph: {
    title: config.seo.title,
    description: config.seo.description,
    images: config.seo.ogImage ? [config.seo.ogImage] : [],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" style={themeStyleObject(initialTheme)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
