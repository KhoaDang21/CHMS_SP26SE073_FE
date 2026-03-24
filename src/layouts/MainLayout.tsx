import type { ReactNode } from 'react';
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import { WishlistProvider } from '../contexts/WishlistContext';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <WishlistProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 flex flex-col">
        <Header />
        <main className="flex-1 pt-4">
          {children}
        </main>
        <Footer />
      </div>
    </WishlistProvider>
  );
}