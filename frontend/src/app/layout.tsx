import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GETDON",
  description: "나와 우리의 자산을 한눈에",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-[#F5F5F7] text-[#111111] antialiased">
        {children}
      </body>
    </html>
  );
}
