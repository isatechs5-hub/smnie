import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Bell,
  BookOpen,
  Download,
  Eye,
  FileText,
  GraduationCap,
  LogOut,
  User,
} from 'lucide-react';
import {
  CertificatePreviewModal,
  PublicCertificateSummary,
} from '../components/CertificatePreviewModal';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { apiDownload, apiFetch } from '../lib/api';

interface StudentDashboardData {
  profile: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
  student: {
    enrollmentNumber: string;
    fullName: string;
    programmeName: string;
    admissionYear: number;
    status: string;
    verificationStatus: string;
    studyCentre: string;
    city: string;
    dateOfBirth: string;
  } | null;
  applications: Array<{
    id: number;
    referenceNumber: string;
    courseName: string;
    status: string;
    createdAt: string;
  }>;
  results: Array<{
    id: number;
    termLabel: string;
    programmeName: string;
    examMode: string;
    gradeOrStatus: string;
    percentageOrScore: string;
    allowDownload: boolean;
    publishedAt: string | null;
  }>;
  certificates?: PublicCertificateSummary[];
  documents: Array<{
    id: number;
    originalName: string;
    sizeBytes: number;
    category: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: number;
    title: string;
    body: string;
    createdAt: string;
  }>;
}

export const StudentPortalPage: React.FC = () => {
  const { user, loading: authLoading, signInWithCredentials, registerStudent, logout } =
    useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<PublicCertificateSummary | null>(null);

  useEffect(() => {
    if (!user) {
      setDashboard(null);
      return;
    }
    setDashLoading(true);
    apiFetch<StudentDashboardData>('/api/student/dashboard')
      .then((data) => setDashboard(data))
      .catch(() => {})
      .finally(() => setDashLoading(false));
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signInWithCredentials(email, password);
      } else {
        await registerStudent(fullName, email, password);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Student Portal"
        description="Secure NIEM Student Portal for accessing personal profiles, online admission statuses, authorized examination results, and private document downloads."
      />
      <PageHeader
        breadcrumb="Student Portal"
        title="NIEM Student Portal"
        subtitle="Secure access to your academic profile, online admission applications, published results, and uploaded documents."
      />

      <section className="py-14 bg-[#F8F9FB] min-h-[60vh]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {authLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Checking portal session...
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-md p-6 sm:p-8">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
                    mode === 'login' ? 'bg-[#0B2241] text-white' : 'text-slate-600'
                  }`}
                >
                  Student Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${
                    mode === 'register' ? 'bg-[#0B2241] text-white' : 'text-slate-600'
                  }`}
                >
                  Create Student Account
                </button>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label
                      htmlFor="portal-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="portal-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="portal-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    id="portal-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@smnie.in"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="portal-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="portal-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] disabled:opacity-60 rounded transition-colors"
                >
                  {submitting
                    ? 'Please wait...'
                    : mode === 'login'
                      ? 'Sign In to Student Portal'
                      : 'Create Account'}
                </button>
              </form>

              {mode === 'login' && (
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
                  <p className="font-medium text-slate-700">Sample Enrolled Student Account:</p>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('student@smnie.in');
                      setPassword('NiemStudent@2026');
                    }}
                    className="font-mono text-[#0B2241] underline"
                  >
                    Fill student@smnie.in / NiemStudent@2026
                  </button>
                </div>
              )}
            </div>
          ) : dashLoading || !dashboard ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading your student dashboard...
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header Bar */}
              <div className="bg-white border border-slate-200 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded bg-[#0B2241] text-[#CFA756] flex items-center justify-center font-serif text-xl font-bold">
                    {dashboard.profile.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-[#0B2241]">
                      {dashboard.profile.fullName}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {dashboard.profile.email} · Role:{' '}
                      <span className="capitalize font-medium">{dashboard.profile.role}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded hover:border-[#0B2241]"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Academic Enrollment Profile */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6">
                  <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                    <span>Enrollment Profile</span>
                  </h3>
                  {dashboard.student ? (
                    <dl className="divide-y divide-slate-100 text-sm">
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500">Enrollment No.</dt>
                        <dd className="font-mono font-semibold text-[#0B2241]">
                          {dashboard.student.enrollmentNumber}
                        </dd>
                      </div>
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500">Programme</dt>
                        <dd className="text-right font-medium text-slate-800">
                          {dashboard.student.programmeName}
                        </dd>
                      </div>
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500">Admission Year</dt>
                        <dd className="font-mono tabular-nums">{dashboard.student.admissionYear}</dd>
                      </div>
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500">Study Centre</dt>
                        <dd className="text-right text-slate-700">
                          {dashboard.student.studyCentre}
                        </dd>
                      </div>
                      <div className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500">Standing</dt>
                        <dd className="capitalize font-semibold text-emerald-800">
                          {dashboard.student.status}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <div className="text-sm text-slate-600 space-y-3">
                      <p>
                        Your account is not yet linked to an active enrollment number. Once an
                        admission application is approved, your enrollment record appears here.
                      </p>
                      <Link
                        to="/admissions"
                        className="inline-flex text-xs font-semibold text-[#0B2241] underline"
                      >
                        Submit Online Admission Application →
                      </Link>
                    </div>
                  )}
                </div>

                {/* Applications */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                      <span>Your Applications</span>
                    </h3>
                    <Link
                      to="/admissions"
                      className="text-xs font-semibold text-[#0B2241] hover:text-[#8F6A24]"
                    >
                      New Application →
                    </Link>
                  </div>
                  {dashboard.applications.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No online applications linked to {dashboard.profile.email} yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {dashboard.applications.map((a) => (
                        <div
                          key={a.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-mono text-xs text-[#8F6A24]">
                              {a.referenceNumber}
                            </div>
                            <div className="text-sm font-semibold text-slate-900">
                              {a.courseName}
                            </div>
                          </div>
                          <div className="text-xs font-semibold uppercase text-[#0B2241]">
                            {a.status.replace('_', ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Authorized Examination Results */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6">
                  <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-4 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                    <span>Authorized Examination Results</span>
                  </h3>
                  {dashboard.results.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No published examination results available for your account.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.results.map((r) => (
                        <div
                          key={r.id}
                          className="border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs text-slate-500">
                              {r.termLabel} · {r.examMode}
                            </div>
                            <div className="font-semibold text-sm text-[#0B2241] mt-0.5">
                              {r.gradeOrStatus} ({r.percentageOrScore})
                            </div>
                          </div>
                          {r.allowDownload && dashboard.student && (
                            <Link
                              to="/results"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B2241] underline"
                            >
                              <Download className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Result Statement</span>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents, Certificates & Notifications */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-200 rounded-md p-6">
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                      <span>Official Verified Certificates</span>
                    </h3>
                    {!dashboard.certificates || dashboard.certificates.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No official verification certificates have been published for your
                        enrollment yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs">
                        {dashboard.certificates.map((cert) => (
                          <li key={cert.id} className="py-3 space-y-1.5">
                            <div className="font-mono text-[11px] text-[#8F6A24]">
                              {cert.certificateNumber} · {cert.issueDate}
                            </div>
                            <div className="font-semibold text-[#0B2241]">{cert.title}</div>
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveCertificate(cert)}
                                className="inline-flex items-center gap-1 font-semibold text-[#0B2241] hover:underline"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => apiDownload(cert.downloadUrl, cert.originalName)}
                                className="inline-flex items-center gap-1 font-semibold text-[#8F6A24] hover:underline"
                              >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Download</span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-6">
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                      <span>Private Documents</span>
                    </h3>
                    {dashboard.documents.length === 0 ? (
                      <p className="text-xs text-slate-500">No documents uploaded yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs">
                        {dashboard.documents.map((doc) => (
                          <li key={doc.id} className="py-2.5 flex items-center justify-between gap-2">
                            <span className="truncate text-slate-700">{doc.originalName}</span>
                            <button
                              type="button"
                              onClick={() => apiDownload(`/api/documents/${doc.id}/download`, doc.originalName)}
                              className="text-[#0B2241] font-semibold hover:underline shrink-0"
                            >
                              Download
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-md p-6">
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                      <span>Notifications</span>
                    </h3>
                    {dashboard.notifications.length === 0 ? (
                      <p className="text-xs text-slate-500">No recent notifications.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 space-y-2 text-xs">
                        {dashboard.notifications.map((n) => (
                          <li key={n.id} className="pt-2 first:pt-0">
                            <div className="font-semibold text-slate-800">{n.title}</div>
                            <div className="text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <CertificatePreviewModal
        certificate={activeCertificate}
        onClose={() => setActiveCertificate(null)}
        onDownload={(cert) => apiDownload(cert.downloadUrl, cert.originalName)}
      />
    </>
  );
};
