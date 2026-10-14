import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';

// Route-level code-splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const DeadlinesPage = lazy(() => import('./pages/DeadlinesPage'));
const AIChatPage = lazy(() => import('./pages/AIChatPage'));
const GitHubPage = lazy(() => import('./pages/GitHubPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function NotFound() {
  return (
    <div className="text-center py-24 space-y-2">
      <h2 className="text-5xl font-black text-text-muted">404</h2>
      <p className="text-sm text-text-secondary">Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-shell flex h-screen overflow-hidden bg-surface-base text-text-primary">
          <Sidebar />
          <main className="main-content flex-1 overflow-y-auto px-6 py-6 md:px-8">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/deadlines" element={<DeadlinesPage />} />
              <Route path="/ai" element={<AIChatPage />} />
              <Route path="/github" element={<GitHubPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
