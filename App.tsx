import React, { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { ChatProvider } from './context/ChatContext.tsx';
import { Loader2 } from 'lucide-react';

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
  <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
    <Loader2 className="animate-spin text-primary-500 mb-6" size={48} />
    <p className="text-xs font-black text-gray-400 animate-pulse uppercase tracking-widest">Liaison JangHup...</p>
  </div>
);

// Added optional children prop to resolve TypeScript error 'Property children is missing' in Route usage
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
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
