import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Korean Stock News',
  description: 'AI-powered Korean stock news summarization service',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
