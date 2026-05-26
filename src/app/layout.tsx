import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Header } from "@/components/header/Header";

export const metadata: Metadata = {
  title: "댓글거울 (Comment Mirror)",
  description:
    "YouTube 영상 댓글을 분석해 크리에이터 피드백 리포트를 만드는 클라이언트 전용 웹앱",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <LocaleProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
              {children}
            </main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
