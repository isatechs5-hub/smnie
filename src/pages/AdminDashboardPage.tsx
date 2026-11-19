import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileEdit,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { adminApiFetch } from '../admin/adminApi';
import { useAdminAuth } from '../admin/AdminAuthContext';
import { SeoHead } from '../components/SeoHead';
import { NIEM_MEDIA } from '../lib/media';
import {
  AdminApplication,
  AdminApplicationsTab,
  AdminEnquiry,
} from '../components/admin/AdminApplicationsTab';
import { AdminCategory, AdminCourse, AdminCoursesTab } from '../components/admin/AdminCoursesTab';
import {
  AdminAccreditation,
  AdminAnnouncement,
  AdminContentTab,
  AdminSettingItem,
} from '../components/admin/AdminContentTab';
import {
  AdminCertificate,
  AdminResult,
  AdminStudent,
  AdminStudentsResultsTab,
  AdminVerificationLog,
} from '../components/admin/AdminStudentsResultsTab';
import { AdminStudentVerificationTab } from '../components/admin/AdminStudentVerificationTab';

type AdminTab = 'verification' | 'overview' | 'applications' | 'courses' | 'students' | 'content';

interface OverviewResponse {
  stats: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    newEnquiries: number;
    totalCourses: number;
    totalStudents: number;
  };
  recentApplications: AdminApplication[];
  recentActivities: Array<{
    id: number;
    actorEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: string;
  }>;
}

export const AdminDashboardPage: React.FC = () => {
  const { admin, logoutAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('verification');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [enquiries, setEnquiries] = useState<AdminEnquiry[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [results, setResults] = useState<AdminResult[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [verifications, setVerifications] = useState<AdminVerificationLog[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [accreditations, setAccreditations] = useState<AdminAccreditation[]>([]);
  const [settings, setSettings] = useState<AdminSettingItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadAllAdminData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [ov, apps, enqs, crs, sts, res, certs, anns, accs, sets] = await Promise.all([
        adminApiFetch<OverviewResponse>('/api/admin/overview'),
        adminApiFetch<{ applications: AdminApplication[] }>('/api/admin/applications'),
        adminApiFetch<{ enquiries: AdminEnquiry[] }>('/api/admin/enquiries'),
        adminApiFetch<{ categories: AdminCategory[]; courses: AdminCourse[] }>('/api/admin/courses'),
        adminApiFetch<{ students: AdminStudent[] }>('/api/admin/students'),
        adminApiFetch<{ results: AdminResult[] }>('/api/admin/results'),
        adminApiFetch<{
          certificates: AdminCertificate[];
          verifications: AdminVerificationLog[];
        }>('/api/admin/certificates'),
        adminApiFetch<{ announcements: AdminAnnouncement[] }>('/api/admin/announcements'),
        adminApiFetch<{ records: AdminAccreditation[] }>('/api/accreditations'),
        adminApiFetch<{ items: AdminSettingItem[] }>('/api/site-settings'),
      ]);
      setOverview(ov);
      setApplications(apps.applications);
      setEnquiries(enqs.enquiries);
      setCategories(crs.categories);
      setCourses(crs.courses);
      setStudents(sts.students);
      setResults(res.results);
      setCertificates(certs.certificates);
      setVerifications(certs.verifications);
      setAnnouncements(anns.announcements);
      setAccreditations(accs.records);
      setSettings(sets.items);
    } catch (err) {
      console.error('Admin data load failed:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) {
      loadAllAdminData();
    }
  }, [admin, loadAllAdminData]);

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login', { replace: true });
  };

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'verification',
      label: 'Student Verification',
      icon: ShieldCheck,
      badge: certificates.length,
    },
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications & Enquiries', icon: ClipboardList },
    { id: 'courses', label: 'Course Management', icon: BookOpen },
    { id: 'students', label: 'Students & Exam Results', icon: GraduationCap },
    { id: 'content', label: 'Content & Accreditations', icon: FileEdit },
  ];

  return (
    <>
      <SeoHead
        title="Administration Dashboard"
        description="NIEM isolated administration dashboard for applications, courses, students, results, certificates, and institutional content."
      />

      <div className="min-h-screen bg-[#F8F9FB] flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-[#061529] text-slate-200 flex flex-col shrink-0">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={NIEM_MEDIA.logo}
                alt="National Institute of Engineering official emblem"
                className="w-9 h-9 rounded bg-white p-0.5 object-contain border border-[#B68B3A]/40 shrink-0"
              />
              <div>
                <span className="font-serif font-bold text-white block leading-tight">
                  NIEM Admin
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#CFA756]">
                  {admin?.roleCode || 'SUPER_ADMIN'}
                </span>
              </div>
            </div>
            <ShieldCheck className="w-4 h-4 text-[#CFA756]" aria-hidden="true" />
          </div>

          <nav aria-label="Administration sections" className="p-3 space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold rounded transition-colors text-left ${
                    tab === item.id
                      ? 'bg-[#0B2241] text-[#CFA756] border border-[#B68B3A]/40'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#CFA756]/20 text-[#CFA756] tabular-nums shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2 text-xs">
            <div className="font-semibold text-white truncate">{admin?.roleTitle}</div>
            <div className="truncate text-slate-400">{admin?.email}</div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <a href="/" className="text-[#CFA756] hover:underline">
                Public Site
              </a>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-4">
            <div className="text-sm font-semibold text-[#0B2241]">
              NIEM Administration /{' '}
              <span className="text-[#8F6A24]">
                {navItems.find((n) => n.id === tab)?.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-600">
                Signed in as <strong className="text-[#0B2241]">{admin?.roleTitle}</strong> (
                {admin?.roleCode})
              </span>
              <button
                type="button"
                onClick={loadAllAdminData}
                className="px-3 py-1.5 text-xs font-semibold text-[#0B2241] border border-slate-300 rounded hover:border-[#0B2241] whitespace-nowrap"
              >
                {dataLoading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </header>

          <main className="p-6 max-w-6xl w-full space-y-6">
            {tab === 'verification' && (
              <AdminStudentVerificationTab
                students={students}
                courses={courses}
                certificates={certificates}
                verifications={verifications}
                onRefresh={loadAllAdminData}
              />
            )}

            {tab === 'overview' && overview && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Applications', value: overview.stats.totalApplications },
                    { label: 'Pending / Review', value: overview.stats.pendingApplications },
                    { label: 'Approved', value: overview.stats.approvedApplications },
                    { label: 'New Enquiries', value: overview.stats.newEnquiries },
                    { label: 'Enrolled Students', value: overview.stats.totalStudents },
                    { label: 'Certificates', value: certificates.length },
                  ].map((kpi) => (
                    <div
                      key={kpi.label}
                      className="bg-white border border-slate-200 rounded-md p-4"
                    >
                      <div className="text-xs text-slate-500">{kpi.label}</div>
                      <div className="font-mono text-2xl font-semibold text-[#0B2241] mt-1 tabular-nums">
                        {kpi.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-serif text-lg font-semibold text-[#0B2241]">
                        Recent Applications
                      </h2>
                      <button
                        type="button"
                        onClick={() => setTab('applications')}
                        className="text-xs font-semibold text-[#8F6A24] hover:underline"
                      >
                        Manage All →
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      {overview.recentApplications.map((a) => (
                        <div
                          key={a.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="font-mono text-[#0B2241]">{a.referenceNumber}</div>
                            <div className="font-semibold text-slate-900">
                              {a.fullName} —{' '}
                              <span className="font-normal text-slate-600">{a.courseName}</span>
                            </div>
                          </div>
                          <span className="uppercase font-semibold text-slate-700 shrink-0">
                            {a.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-5">
                    <h2 className="font-serif text-lg font-semibold text-[#0B2241] mb-4">
                      Recent Administrative Audit Activity
                    </h2>
                    {overview.recentActivities.length === 0 ? (
                      <p className="text-xs text-slate-500">No audit events recorded yet.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100 text-xs">
                        {overview.recentActivities.map((log) => (
                          <li key={log.id} className="py-2.5">
                            <div className="font-semibold text-slate-800">{log.action}</div>
                            <div className="text-slate-500">
                              {log.actorEmail} · {log.details || log.entityId}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'applications' && (
              <AdminApplicationsTab
                applications={applications}
                enquiries={enquiries}
                onRefresh={loadAllAdminData}
              />
            )}

            {tab === 'courses' && (
              <AdminCoursesTab
                categories={categories}
                courses={courses}
                onRefresh={loadAllAdminData}
              />
            )}

            {tab === 'students' && (
              <AdminStudentsResultsTab
                students={students}
                results={results}
                certificates={certificates}
                verifications={verifications}
                onRefresh={loadAllAdminData}
              />
            )}

            {tab === 'content' && (
              <AdminContentTab
                announcements={announcements}
                accreditations={accreditations}
                settings={settings}
                onRefresh={loadAllAdminData}
              />
            )}
          </main>
        </div>
      </div>
    </>
  );
};
