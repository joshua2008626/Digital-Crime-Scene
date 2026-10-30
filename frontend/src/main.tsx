import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/index.css';
import App from './App';
import { ToastProvider } from './components/Toast';
import { AppProvider } from './store/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <ToastProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
