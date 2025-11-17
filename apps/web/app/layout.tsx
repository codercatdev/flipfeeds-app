import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Content } from '@/components/layout/content';
import { AuthProvider } from '@/hooks/use-auth';
import { FirebaseUIProvider } from './firebase-ui-provider';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'FlipFeeds',
    description: 'A new way to share and discover content.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <FirebaseUIProvider>
                    <AuthProvider>
                        <div className="flex h-screen bg-background text-foreground">
                            <Sidebar />
                            <div className="flex flex-col flex-1">
                                <Header />
                                <Content>{children}</Content>
                            </div>
                        </div>
                    </AuthProvider>
                </FirebaseUIProvider>
            </body>
        </html>
    );
}
