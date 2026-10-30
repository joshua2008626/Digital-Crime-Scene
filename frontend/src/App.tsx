import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Spinner } from './components/ui';

const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cases = lazy(() => import('./pages/Cases'));
const CaseDetail = lazy(() => import('./pages/CaseDetail'));
const Workspace = lazy(() => import('./pages/Workspace'));
const GraphPage = lazy(() => import('./pages/GraphPage'));
const PhishingLab = lazy(() => import('./pages/PhishingLab'));
const LogLab = lazy(() => import('./pages/LogLab'));
const Report = lazy(() => import('./pages/Report'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Landing />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="cases" element={<Cases />} />
          <Route path="cases/:caseId" element={<CaseDetail />} />
          <Route path="case/:caseId" element={<Workspace />} />
          <Route path="case/:caseId/graph" element={<GraphPage />} />
          <Route path="case/:caseId/report" element={<Report />} />
          <Route path="phishing" element={<PhishingLab />} />
          <Route path="logs" element={<LogLab />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
