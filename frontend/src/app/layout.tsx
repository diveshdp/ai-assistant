import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/components/QueryProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Assistant — Divesh Patlolla',
  description: 'Full-stack AI assistant with persistent memory. Built with Next.js, FastAPI, PostgreSQL, and Redis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
