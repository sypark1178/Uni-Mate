import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uni-Mate",
  description: "AI admission strategy service scaffold"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
