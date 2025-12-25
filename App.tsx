import React, { lazy, Suspense, useEffect, ReactNode, Component } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import { Loader2, RefreshCcw, AlertTriangle, LogOut } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Added constructor to explicitly initialize and type the component's state and props
// Inheriting from Component<P, S> provides 'props' and 'state' to the class
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly defined state as a class property for better type safety and to resolve "Property 'state' does not exist" error
  state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }
  
  static getDerivedStateFromError(error: Error) { 
    return { hasError: true, error }; 
  }
  
  componentDidCatch(error: Error, errorInfo: any) { 
    console.error("[SRE Critical Crash Log]", error, errorInfo); 
  }

  handleForceReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };
  
  render() {
    // Correctly accessing state property from the Component class
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6 text-center animate-fade-in">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-red-500/10">
            <AlertTriangle size={48} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase italic mb-4">Interruption Système</h1>
          <p className="max-w-md text-gray-500 dark:text-gray-400 mb-10 font-medium italic">
            Une erreur critique a interrompu JangHup. Essayez de relancer l'application ou réinitialisez votre session.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.location.reload()} 
              className="px-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:bg-black transition-all active:scale-95"
            >
              <RefreshCcw size={16} /> Relancer
            </button>
            <button 
              onClick={this.handleForceReset}
              className="px-10 py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:bg-red-600 transition-all active:scale-95"
            >
              <LogOut size={16} /> Hard Reset
            </button>
          </div>
        </div>
      );
    }
    // Correctly accessing props property from the Component class to return children
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
    <p className="text-xs font-black text-gray-400 animate-pulse uppercase tracking-[0.4em] italic">Liaison JangHup...</p>
  </div>
);

// Changed children to optional to satisfy compiler requirements when used in Route elements
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