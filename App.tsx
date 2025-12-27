
import React, { Component, lazy, Suspense, useEffect, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };
  constructor(props: ErrorBoundaryProps) { super(props); }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center">
          <AlertCircle size={64} className="text-red-500 mb-6" />
          <h1 className="text-2xl font-black uppercase italic mb-2 dark:text-white">Système Interrompu</h1>
          <p className="text-gray-500 mb-8 max-w-xs text-sm">Une erreur critique a été détectée sur JangHup.</p>
          <button onClick={() => window.location.reload()} className="px-10 py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl">
            <RefreshCcw size={18} /> Redémarrer le Portail
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Layout = lazy(() => import('./components/Layout.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Announcements = lazy(() => import('./pages/Announcements.tsx'));
const Exams = lazy(() => import('./pages/Exams.tsx'));
const Meet = lazy(() => import('./pages/Meet.tsx'));
const Polls = lazy(() => import('./pages/Polls.tsx'));
const Schedule = lazy(() => import('./pages/Schedule.tsx'));
const AdminPanel = lazy(() => import('./pages/AdminPanel.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const LoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] w-full bg-transparent">
    <Loader2 className="animate-spin text-brand mb-6" size={48} />
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Synchronisation JangHup...</p>
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
          <Route path="meet" element={<Meet />} />
          <Route path="polls" element={<Polls />} />
          <Route path="schedule" element={<Schedule />} />
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
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </NotificationProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
