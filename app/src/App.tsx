import { useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import { telegramService } from './services/TelegramClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PreviewPage from './pages/PreviewPage';

function Guard({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useApp();
  if (isAuthenticated === null) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, setAuthenticated } = useApp();

  useEffect(() => {
    telegramService.setupServiceWorkerHandler();
    telegramService.checkAuthorization().then(ok => setAuthenticated(ok));
  }, [setAuthenticated]);

  if (isAuthenticated === null) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
      <Route path="/dashboard/folder/:folderId" element={<Guard><DashboardPage /></Guard>} />
      <Route path="/settings" element={<Guard><SettingsPage /></Guard>} />
      <Route path="/preview/:fileId" element={<PreviewPage />} />
      <Route path="/preview/:folderId/:fileId" element={<PreviewPage />} />
      <Route path="/s/:shareId" element={<PreviewPage />} />
      <Route path="/f/:uid" element={<PreviewPage />} />
      <Route path="/p/*" element={<PreviewPage />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
