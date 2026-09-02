import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://possible-city.skaihai.chatgpt.site'),
  title: 'Possible City — See what a place could become',
  description:
    'Upload a public-space photo and test a grounded ecological, communal, or contemplative future with GPT Image.',
  openGraph: {
    title: 'Possible City — See what a place could become',
    description:
      'Upload a public-space photo and test a grounded ecological, communal, or contemplative future with GPT Image.',
    type: 'website',
    url: 'https://possible-city.skaihai.chatgpt.site',
    images: [
      {
        url: '/og.png',
        width: 1672,
        height: 941,
        alt: 'Possible City — See what a place could become',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Possible City — See what a place could become',
    description:
      'Upload a public-space photo and test a grounded ecological, communal, or contemplative future with GPT Image.',
    images: ['/og.png'],
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
