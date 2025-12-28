import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Đọc Văn Bản Pro - Chuyển đổi Văn bản thành Giọng nói (TTS)",
  description: "Công cụ chuyển đổi văn bản thành giọng nói tiếng Việt miễn phí, chất lượng cao. Hỗ trợ đọc file PDF, Word, Excel, giọng đọc AI tự nhiên từ Google.",
  keywords: ["tts", "text to speech", "chuyển văn bản thành giọng nói", "đọc văn bản", "google tts", "vietnamese tts"],
  authors: [{ name: "My Team" }],
  openGraph: {
    title: "Đọc Văn Bản Pro - Vietnamese Text to Speech",
    description: "Chuyển đổi văn bản thành giọng nói tiếng Việt mượt mà, hỗ trợ nhiều định dạng file.",
    type: "website",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Đọc Văn Bản Pro",
    description: "Công cụ TTS tiếng Việt tốt nhất.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
