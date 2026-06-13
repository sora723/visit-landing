import type { Metadata } from "next";
import { Noto_Sans_KR, Playfair_Display } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "VIDAD 분양 랜딩",
  description: "프리미엄 분양 홈페이지",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${noto.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
