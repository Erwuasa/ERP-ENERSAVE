import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const SafeThemeProvider = ThemeProvider as any;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SafeThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
        <Toaster position="bottom-right" richColors theme="system" />
      </SafeThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
