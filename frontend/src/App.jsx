import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { message } from 'antd';

// Configure Ant Design message notifications
message.config({
  duration: 4,
  maxCount: 3,
  top: undefined,
});

import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import GoogleCallback from './pages/GoogleCallback';
import DashboardLayout from './components/common/DashboardLayout';
import DashboardHome from './components/dashboards/DashboardHome';
import NotFoundPage from './pages/NotFoundPage';
import TasksPage from './components/tasks/TasksPage';
import BacklogPage from './components/backlog/BacklogPage';
import RoadmapPage from './pages/RoadmapPage';
import MeetingsPage from './components/meetings/MeetingsPage';
import EmailGeneratorPage from './pages/apps/EmailGeneratorPage';
import PPTGeneratorPage from './pages/apps/PPTGeneratorPage';
import DocumentManager from './components/documents/DocumentManager';
import WellnessCheckin from './components/wellness/WellnessCheckin';
import ReportDashboard from './components/reports/ReportDashboard';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import { ChatProvider } from './context/ChatContext';
import { ProjectProvider } from './context/ProjectContext';
import ChatPage from './components/chat/ChatPage';
import OrgGraph from './components/org/OrgGraph';
import ProjectsListPage from './pages/ProjectsListPage';
import Spaces from './components/spaces/Spaces';
import CalendarWorkPlanner from './components/CalendarWorkPlanner';
import TeamManagement from './components/admin/TeamManagement';
import TechDebtPage from './pages/TechDebtPage';
import AIArchitectPage from './pages/AIArchitectPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Public Route Wrapper (redirect logged-in users to dashboard)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <ChatProvider>
          <ProjectProvider>
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />

                {/* Protected Dashboard Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  {/* Dashboard Main View - redirect based on role */}
                  <Route index element={<DashboardHome />} />

                  {/* Feature Routes */}
                  <Route path="tasks" element={<TasksPage />} />
                  <Route path="backlog" element={<BacklogPage />} />
                  <Route path="roadmap" element={<RoadmapPage />} />
                  <Route path="meetings" element={<MeetingsPage />} />
                  <Route path="email-generator" element={<EmailGeneratorPage />} />
                  <Route path="ppt-generator" element={<PPTGeneratorPage />} />
                  <Route path="documents" element={<DocumentManager />} />
                  <Route path="wellness" element={<WellnessCheckin />} />
                  <Route path="reports" element={<ReportDashboard />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="organization" element={<OrgGraph />} />
                  <Route path="projects" element={<ProjectsListPage />} />
                  <Route path="spaces" element={<Spaces />} />
                  <Route path="work-planner" element={<CalendarWorkPlanner />} />
                  <Route path="tech-debt" element={<TechDebtPage />} />
                  <Route path="ai-architect" element={<AIArchitectPage />} />
                  <Route path="team-management" element={
                    <ProtectedRoute roles={['admin']}>
                      <TeamManagement />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Router>
          </ProjectProvider>
        </ChatProvider>
      </AuthProvider>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </ThemeProvider>
  );
}

export default App;
