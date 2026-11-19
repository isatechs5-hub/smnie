import React, { useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { adminApiDownload, adminApiFetch } from '../../admin/adminApi';

export interface AdminApplication {
  id: number;
  referenceNumber: string;
  fullName: string;
  email: string;
  mobile: string;
  courseName: string;
  qualification: string;
  city: string;
  message: string;
  status: string;
  internalNotes: string;
  createdAt: string;
  documents: Array<{ id: number; originalName: string; sizeBytes: number }>;
}

export interface AdminEnquiry {
  id: number;
  referenceCode: string;
  fullName: string;
  email: string;
  mobile: string;
  subject: string;
  enquiryType: string;
  courseName: string;
  city: string;
  message: string;
  status: string;
  internalNotes: string;
  createdAt: string;
}

interface Props {
  applications: AdminApplication[];
  enquiries: AdminEnquiry[];
  onRefresh: () => Promise<void>;
}

export const AdminApplicationsTab: React.FC<Props> = ({
  applications,
  enquiries,
  onRefresh,
}) => {
  const [subView, setSubView] = useState<'applications' | 'enquiries'>('applications');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingApp, setEditingApp] = useState<AdminApplication | null>(null);
  const [editStatus, setEditStatus] = useState('pending');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredApps = applications.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${a.referenceNumber} ${a.fullName} ${a.email} ${a.courseName} ${a.city}`
        .toLowerCase()
        .includes(q);
    }
    return true;
  });

  const handleSaveApp = async () => {
    if (!editingApp) return;
    setSaving(true);
    try {
      await adminApiFetch(`/api/admin/applications/${editingApp.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: editStatus, internalNotes: editNotes }),
      });
      setEditingApp(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleEnquiryStatus = async (id: number, status: string) => {
    await adminApiFetch(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded">
          <button
            type="button"
            onClick={() => setSubView('applications')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
              subView === 'applications' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Applications ({applications.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('enquiries')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors ${
              subView === 'enquiries' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Enquiries ({enquiries.length})
          </button>
        </div>

        {subView === 'applications' && (
          <button
            type="button"
            onClick={() => adminApiDownload('/api/admin/applications/export', 'niem-applications.csv')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2241] bg-white border border-slate-300 hover:border-[#0B2241] rounded whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {subView === 'applications' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="admin-app-search" className="sr-only">
                Search applications
              </label>
              <input
                id="admin-app-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by reference, applicant name, email, course, or city..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
              />
            </div>

            <label htmlFor="admin-app-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="admin-app-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Applicant</th>
                  <th className="py-3 px-4 font-semibold">Programme</th>
                  <th className="py-3 px-4 font-semibold">Documents</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-[#0B2241] whitespace-nowrap">
                      {app.referenceNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{app.fullName}</div>
                      <div className="text-slate-500">
                        {app.email} · {app.mobile}
                      </div>
                      <div className="text-slate-400">
                        {app.qualification} · {app.city}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-xs">{app.courseName}</td>
                    <td className="py-3 px-4">
                      {app.documents.length === 0 ? (
                        <span className="text-slate-400">None</span>
                      ) : (
                        <div className="space-y-1">
                          {app.documents.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => adminApiDownload(`/api/documents/${d.id}/download`, d.originalName)}
                              className="inline-flex items-center gap-1 text-[#0B2241] underline"
                            >
                              <FileText className="w-3 h-3" aria-hidden="true" />
                              <span className="truncate max-w-[140px]">{d.originalName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-semibold uppercase text-slate-800">
                      {app.status.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingApp(app);
                          setEditStatus(app.status);
                          setEditNotes(app.internalNotes || '');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[#0B2241] border border-[#0B2241] rounded hover:bg-[#0B2241] hover:text-white transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingApp && (
            <div className="bg-white border border-[#0B2241] rounded-md p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-[#8F6A24]">{editingApp.referenceNumber}</p>
                  <h3 className="font-serif text-xl font-semibold text-[#0B2241]">
                    Review Application: {editingApp.fullName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {editingApp.courseName} · {editingApp.qualification} · {editingApp.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingApp(null)}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>

              {editingApp.message && (
                <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-3">
                  <strong>Applicant Message:</strong> {editingApp.message}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="review-status"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Application Decision Status
                  </label>
                  <select
                    id="review-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  >
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="review-notes"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Internal Administrative Notes
                  </label>
                  <input
                    id="review-notes"
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Record verification remarks or study centre assignment"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveApp}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
              >
                {saving ? 'Saving Decision...' : 'Save Application Decision'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Sender</th>
                <th className="py-3 px-4 font-semibold">Department &amp; Subject</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enquiries.map((enq) => (
                <tr key={enq.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-[#0B2241] whitespace-nowrap">
                    {enq.referenceCode}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{enq.fullName}</div>
                    <div className="text-slate-500">
                      {enq.email} · {enq.mobile}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <div className="text-[11px] uppercase text-[#8F6A24] font-semibold">
                      {enq.enquiryType}
                    </div>
                    <div className="font-medium text-slate-900">{enq.subject}</div>
                    <div className="text-slate-600 mt-0.5 line-clamp-2">{enq.message}</div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      aria-label={`Status for enquiry ${enq.referenceCode}`}
                      value={enq.status}
                      onChange={(e) => handleEnquiryStatus(enq.id, e.target.value)}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
