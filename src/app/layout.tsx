import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "댓글거울",
  description: "YouTube 댓글 감정 분석 리포트",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
