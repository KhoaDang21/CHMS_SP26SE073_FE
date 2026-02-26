import type { ReactNode } from 'react';
import Header from '../components/ui/header';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
      <Header />
      <main className="pt-4">
        {children}
      </main>
    </div>
  );
}