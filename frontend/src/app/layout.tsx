import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asset Snap",
  description: "월간 자산 스냅샷 네비게이터",
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
