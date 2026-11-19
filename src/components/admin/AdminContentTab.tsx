import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { adminApiFetch } from '../../admin/adminApi';

export interface AdminAnnouncement {
  id: number;
  title: string;
  category: string;
  summary: string;
  publishedDate: string;
  isPinned: boolean;
}

export interface AdminAccreditation {
  id: number;
  code: string;
  bodyName: string;
  description: string;
  verificationStatus: string;
  verificationNote: string;
}

export interface AdminSettingItem {
  id: number;
  key: string;
  label: string;
  value: string;
}

interface Props {
  announcements: AdminAnnouncement[];
  accreditations: AdminAccreditation[];
  settings: AdminSettingItem[];
  onRefresh: () => Promise<void>;
}

export const AdminContentTab: React.FC<Props> = ({
  announcements,
  accreditations,
  settings,
  onRefresh,
}) => {
  const [sub, setSub] = useState<'accreditations' | 'announcements' | 'site'>('accreditations');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  const [newAnn, setNewAnn] = useState({
    title: '',
    category: 'Admissions',
    summary: '',
    publishedDate: new Date().toISOString().slice(0, 10),
    isPinned: false,
  });

  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return map;
  });

  const flashSaved = (msg: string) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleUpdateAccreditation = async (
    id: number,
    verificationStatus: string,
    verificationNote: string
  ) => {
    await adminApiFetch(`/api/admin/accreditations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ verificationStatus, verificationNote }),
    });
    await onRefresh();
    flashSaved('Accreditation verification status updated.');
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(newAnn),
    });
    setNewAnn({
      title: '',
      category: 'Admissions',
      summary: '',
      publishedDate: new Date().toISOString().slice(0, 10),
      isPinned: false,
    });
    await onRefresh();
    flashSaved('Announcement published.');
  };

  const handleDeleteAnnouncement = async (id: number) => {
    await adminApiFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminApiFetch('/api/admin/site-settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings: settingsDraft }),
    });
    await onRefresh();
    flashSaved('Institutional homepage & contact settings saved.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded">
          <button
            type="button"
            onClick={() => setSub('accreditations')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded ${
              sub === 'accreditations' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Accreditations ({accreditations.length})
          </button>
          <button
            type="button"
            onClick={() => setSub('announcements')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded ${
              sub === 'announcements' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Announcements ({announcements.length})
          </button>
          <button
            type="button"
            onClick={() => {
              const map: Record<string, string> = {};
              for (const s of settings) map[s.key] = s.value;
              setSettingsDraft(map);
              setSub('site');
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded ${
              sub === 'site' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Homepage &amp; Contact CMS
          </button>
        </div>

        {savedToast && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>{savedToast}</span>
          </span>
        )}
      </div>

      {sub === 'accreditations' && (
        <div className="space-y-4">
          {accreditations.map((acc) => (
            <div key={acc.id} className="bg-white border border-slate-200 rounded-md p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-[#8F6A24]">{acc.code}</span>
                  <h4 className="font-serif text-lg font-semibold text-[#0B2241]">
                    {acc.bodyName}
                  </h4>
                </div>
                <select
                  aria-label={`Verification status for ${acc.bodyName}`}
                  value={acc.verificationStatus}
                  onChange={(e) =>
                    handleUpdateAccreditation(acc.id, e.target.value, acc.verificationNote)
                  }
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white"
                >
                  <option value="pending_verification">
                    Institutional Claim — Independent Verification Pending
                  </option>
                  <option value="reference_only">Historical / Supplied Reference Only</option>
                  <option value="under_review">Under Administrative Review</option>
                  <option value="documented">Supporting Documentation On File</option>
                </select>
              </div>
              <p className="text-xs text-slate-600">{acc.verificationNote}</p>
            </div>
          ))}
        </div>
      )}

      {sub === 'announcements' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateAnnouncement}
            className="bg-white border border-slate-200 rounded-md p-5 space-y-3 text-xs"
          >
            <h4 className="font-serif text-lg font-semibold text-[#0B2241]">
              Publish New Institutional Announcement
            </h4>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                required
                placeholder="Announcement Title"
                value={newAnn.title}
                onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })}
                className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded"
              />
              <select
                value={newAnn.category}
                onChange={(e) => setNewAnn({ ...newAnn, category: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded bg-white"
              >
                <option value="Admissions">Admissions</option>
                <option value="Examinations">Examinations</option>
                <option value="Academic Notice">Academic Notice</option>
                <option value="Outreach">Outreach</option>
              </select>
            </div>
            <textarea
              required
              rows={2}
              placeholder="Announcement summary shown on the homepage..."
              value={newAnn.summary}
              onChange={(e) => setNewAnn({ ...newAnn, summary: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-[#0B2241] rounded"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Publish Announcement</span>
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            {announcements.map((a) => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    {a.publishedDate} · {a.category}
                  </div>
                  <div className="text-sm font-semibold text-[#0B2241]">{a.title}</div>
                  <p className="text-xs text-slate-600 mt-0.5">{a.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(a.id)}
                  aria-label={`Delete announcement ${a.title}`}
                  className="p-1.5 text-slate-400 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === 'site' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-slate-200 rounded-md p-6 space-y-4 text-xs"
        >
          <h4 className="font-serif text-xl font-semibold text-[#0B2241]">
            Homepage Copy &amp; Institutional Contact Configuration
          </h4>
          {settings.map((item) => (
            <div key={item.key}>
              <label
                htmlFor={`setting-${item.key}`}
                className="block font-semibold text-slate-700 mb-1"
              >
                {item.label}
              </label>
              {item.value.length > 90 ? (
                <textarea
                  id={`setting-${item.key}`}
                  rows={3}
                  value={settingsDraft[item.key] ?? item.value}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, [item.key]: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              ) : (
                <input
                  id={`setting-${item.key}`}
                  value={settingsDraft[item.key] ?? item.value}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, [item.key]: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              )}
            </div>
          ))}
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
          >
            Save Institutional Content
          </button>
        </form>
      )}
    </div>
  );
};
