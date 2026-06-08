import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import StoreHydrator from '@/components/StoreHydrator';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Flirtigo — Connect with India', template: '%s | Flirtigo' },
  description: 'Flirtigo is India\'s most exciting anonymous video chat platform. Meet interesting people across India through video, voice, and text.',
  keywords: ['video chat', 'random chat', 'India', 'meet people', 'anonymous chat'],
  authors: [{ name: 'Flirtigo' }],
  creator: 'Flirtigo',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Flirtigo',
    title: 'Flirtigo — Connect with India',
    description: 'India\'s most exciting anonymous video chat platform',
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f0c29',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="animated-bg min-h-screen antialiased">
        <StoreHydrator />
        <div className="relative z-10">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(15, 12, 41, 0.95)',
              color: '#fff',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#a855f7', secondary: '#fff' },
              duration: 3000,
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
              duration: 4000,
            },
          }}
        />
      </body>
    </html>
  );
}
