import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { NewReviewPage } from './pages/NewReviewPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { ReviewResultsPage } from './pages/ReviewResultsPage';
import { ReviewHistoryPage } from './pages/ReviewHistoryPage';
import { ReviewerDashboardPage } from './pages/ReviewerDashboardPage';
import { PublishedContentPage } from './pages/PublishedContentPage';
import { KnowledgeSourcesPage } from './pages/KnowledgeSourcesPage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadQuestionPaperPage } from './pages/UploadQuestionPaperPage';
import { StudentOverviewPage } from './pages/StudentOverviewPage';

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/new-review" element={<NewReviewPage />} />
            <Route path="/student-overview" element={<StudentOverviewPage />} />
            <Route path="/upload-paper" element={<UploadQuestionPaperPage />} />
            <Route path="/reviews/:id/workflow" element={<WorkflowPage />} />
            <Route path="/reviews/:id/results" element={<ReviewResultsPage />} />
            <Route path="/history" element={<ReviewHistoryPage />} />
            <Route path="/reviewer" element={<ReviewerDashboardPage />} />
            <Route path="/published" element={<PublishedContentPage />} />
            <Route path="/knowledge" element={<KnowledgeSourcesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
