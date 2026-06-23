import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Canary — Know before it moves",
  description:
    "Canary watches your portfolio and warns you before earnings, crashes, and key events — so you never miss what matters.",
  keywords: ["stock portfolio", "AI trading coach", "earnings alerts", "retail investor"],
  openGraph: {
    title: "Canary — Know before it moves",
    description:
      "Canary watches your portfolio and warns you before earnings, crashes, and key events.",
    siteName: "Canary",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} antialiased bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
