
import React, { lazy, Suspense, useEffect, ReactNode, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import { Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { UserRole } from './types.ts';

// Added explicit interfaces for ErrorBoundary props and state to fix the "Property 'props' does not exist" error
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Updated ErrorBoundary to use explicit generics and constructor for better TypeScript compatibility
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly declare state and props to resolve TypeScript errors in some environments
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, errorInfo: any) { 
    console.error("JangHup Error", error, errorInfo); 
  }
  
  render() {
    // Accessing state property on this
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center animate-fade-in">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl"><AlertTriangle size={40} /></div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic mb-4">Interruption Technique</h1>
          <button onClick={() => window.location.reload()} className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:bg-black transition-all"><RefreshCcw size={16} /> Relancer JangHup</button>
        </div>
      );
    }
    // Accessing props property on this
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
  <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-50/50 dark:bg-gray-950">
    <Loader2 className="animate-spin text-primary-500 mb-6" size={48} />
    <p className="text-sm font-black text-gray-400 animate-pulse uppercase tracking-[0.4em] italic">Chargement JangHup...</p>
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
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
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <HashRouter>
              <AppRoutes />
            </HashRouter>
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
