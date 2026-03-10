import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './components/common/ToastProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { LoadingProvider } from './hooks/useLoading';
import LoadingOverlay from './components/common/LoadingOverlay';
import AuthPage from './components/auth/AuthPage';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import BoardPage from './components/board/BoardPage';
import SummaryPage from './components/summary/SummaryPage';
import ReportPage from './components/report/ReportPage';

function RequireAuth() {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ToastProvider>
      <LoadingProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<AuthPage />} />
              <Route element={<RequireAuth />}>
                <Route path="/todos/:todoId/summary" element={<SummaryPage />} />
                <Route element={<ProjectProvider><AppLayout /></ProjectProvider>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="/report" element={<ReportPage />} />
                  <Route path="/projects/:projectId" element={<BoardPage />} />
                </Route>
              </Route>
            </Routes>
          </Router>
          <LoadingOverlay />
        </AuthProvider>
      </LoadingProvider>
    </ToastProvider>
  );
}
