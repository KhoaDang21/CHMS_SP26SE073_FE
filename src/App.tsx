import { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import AiChatWidget from './components/ai/AiChatWidget';
import { WishlistProvider } from './contexts/WishlistContext';
import { useTranslation } from 'react-i18next';
import { applyGoogleTranslate } from './utils/googleTranslate';
import './utils/connectionDebugger'; // Import for console debugging

function AppContent() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const currentLang = i18n.language.startsWith('en') ? 'en' : 'vi';
    document.documentElement.lang = currentLang;
    applyGoogleTranslate(currentLang);
  }, [i18n.language, location.pathname]);

  return (
    <WishlistProvider>
      <div id="google_translate_element" className="hidden" />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppRoutes />
      <AiChatWidget />
    </WishlistProvider>
  );
}

// Main App Component - Entry point for Figma Make
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}