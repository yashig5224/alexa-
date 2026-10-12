import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import TasksPage    from './pages/TasksPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import TeamPage     from './pages/TeamPage';
import AIChatPage   from './pages/AIChatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s
      retry: 2,
    },
  },
});

function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <h2 style={{ fontSize: 48, fontWeight: 800, color: 'var(--text-muted)' }}>404</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/"              element={<DashboardPage />} />
              <Route path="/projects"      element={<ProjectsPage />}  />
              <Route path="/projects/:id"  element={<ProjectDetailPage />} />
              <Route path="/tasks"         element={<TasksPage />}     />
              <Route path="/team"          element={<TeamPage />}      />
              <Route path="/ai"            element={<AIChatPage />}    />
              <Route path="*"              element={<NotFound />}      />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
