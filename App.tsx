
import React, { lazy, Suspense, useEffect, Component, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

// Fix: Make children optional in the props interface to resolve the error on line 89 when the component is used in JSX.
interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

// Fix: Use React.Component specifically to ensure state and props properties are recognized by TypeScript as being part of the class instance.
class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fix: Initializing state inherited from React.Component.
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    // Fix: Accessing state inherited from React.Component.
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-black uppercase italic mb-2">Erreur Système</h1>
          <p className="text-gray-500 mb-8 max-w-xs text-sm">Une erreur critique a interrompu JangHup.</p>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
            <RefreshCcw size={16} /> Redémarrer
          </button>
        </div>
      );
    }
    // Fix: Accessing props inherited from React.Component.
    return this.props.children;
  }
}

const Layout = lazy(() => import('./components/Layout.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Announcements = lazy(() => import('./pages/Announcements.tsx'));
const Exams = lazy(() => import('./pages/Exams.tsx'));
const Schedule = lazy(() => import('./pages/Schedule.tsx'));
const Meet = lazy(() => import('./pages/Meet.tsx'));
const Polls = lazy(() => import('./pages/Polls.tsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] w-full">
    <Loader2 className="animate-spin text-primary-500 mb-6" size={40} />
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Liaison JangHup...</p>
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="exams" element={<Exams />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="meet" element={<Meet />} />
          <Route path="polls" element={<Polls />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
