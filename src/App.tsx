import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminAuthProvider } from './admin/AdminAuthContext';
import { AdminLoginPage } from './admin/AdminLoginPage';
import { AdminRouteGuard } from './admin/AdminRouteGuard';
import { Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';

const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const AccreditationsPage = lazy(() =>
  import('./pages/AccreditationsPage').then((m) => ({ default: m.AccreditationsPage }))
);
const CoursesPage = lazy(() =>
  import('./pages/CoursesPage').then((m) => ({ default: m.CoursesPage }))
);
const AdmissionsPage = lazy(() =>
  import('./pages/AdmissionsPage').then((m) => ({ default: m.AdmissionsPage }))
);
const ExaminationsPage = lazy(() =>
  import('./pages/ExaminationsPage').then((m) => ({ default: m.ExaminationsPage }))
);
const PlacementsPage = lazy(() =>
  import('./pages/PlacementsPage').then((m) => ({ default: m.PlacementsPage }))
);
const OutreachPage = lazy(() =>
  import('./pages/OutreachPage').then((m) => ({ default: m.OutreachPage }))
);
const ResultsPage = lazy(() =>
  import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const StudentPortalPage = lazy(() =>
  import('./pages/StudentPortalPage').then((m) => ({ default: m.StudentPortalPage }))
);
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const PageLoader: React.FC = () => (
  <div className="py-24 text-center text-sm text-slate-500">Loading page...</div>
);

const NotFoundPage: React.FC = () => (
  <div className="max-w-xl mx-auto px-6 py-24 text-center space-y-4">
    <p className="font-mono text-xs text-[#8F6A24]">404</p>
    <h1 className="font-serif text-3xl font-semibold text-[#0B2241]">Page Not Found</h1>
    <p className="text-sm text-slate-600">
      The institutional page you requested could not be found.
    </p>
    <Link
      to="/"
      className="inline-flex px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] rounded"
    >
      Return to NIEM Home
    </Link>
  </div>
);

const PublicWebsiteRoutes: React.FC = () => (
  <AuthProvider>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/accreditations" element={<AccreditationsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/examinations" element={<ExaminationsPage />} />
        <Route path="/placements" element={<PlacementsPage />} />
        <Route path="/international-outreach" element={<OutreachPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/portal" element={<StudentPortalPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </AuthProvider>
);

const IsolatedAdminRoutes: React.FC = () => (
  <AdminAuthProvider>
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route
        path="dashboard"
        element={
          <AdminRouteGuard>
            <AdminDashboardPage />
          </AdminRouteGuard>
        }
      />
      <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  </AdminAuthProvider>
);

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />

      {/* Mandatory Google Maps Platform Demo Key Quota Banner (only rendered if quota fires) */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/*" element={<IsolatedAdminRoutes />} />
          <Route path="/*" element={<PublicWebsiteRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
