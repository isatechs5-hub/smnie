import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { adminApiFetch } from '../../admin/adminApi';

export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
}

export interface AdminCourse {
  id: number;
  code: string;
  title: string;
  categoryId: number;
  categoryName: string;
  level: string;
  duration: string;
  learningMode: string;
  eligibility: string;
  feesNote: string;
  summary: string;
  curriculumOutline: string;
  isActive: boolean;
}

interface Props {
  categories: AdminCategory[];
  courses: AdminCourse[];
  onRefresh: () => Promise<void>;
}

const EMPTY_FORM = {
  id: 0,
  code: '',
  title: '',
  categoryId: 1,
  level: 'Diploma',
  duration: 'Confirm with Admissions Office',
  learningMode: 'Guided Study / Study Centre & Online Support',
  eligibility: 'Configurable via Admissions Office',
  feesNote: 'Available on official prospectus request',
  summary: '',
  curriculumOutline: '',
  isActive: true,
};

export const AdminCoursesTab: React.FC<Props> = ({ categories, courses, onRefresh }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || 1 });
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (c: AdminCourse) => {
    setForm({
      id: c.id,
      code: c.code,
      title: c.title,
      categoryId: c.categoryId,
      level: c.level,
      duration: c.duration,
      learningMode: c.learningMode,
      eligibility: c.eligibility,
      feesNote: c.feesNote,
      summary: c.summary,
      curriculumOutline: c.curriculumOutline,
      isActive: c.isActive,
    });
    setError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code: form.code,
        title: form.title,
        categoryId: Number(form.categoryId),
        level: form.level,
        duration: form.duration,
        learningMode: form.learningMode,
        eligibility: form.eligibility,
        feesNote: form.feesNote,
        summary: form.summary,
        curriculumOutline: form.curriculumOutline,
        isActive: form.isActive,
      };
      if (form.id > 0) {
        await adminApiFetch(`/api/admin/courses/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save course.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: number) => {
    await adminApiFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-slate-600">
          Manage academic programmes, eligibility rules, and fee descriptions displayed publicly.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Course</span>
        </button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="bg-white border border-[#0B2241] rounded-md p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-[#0B2241]">
              {form.id ? 'Edit Academic Course' : 'Create New Course'}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div role="alert" className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label htmlFor="c-code" className="block font-semibold text-slate-700 mb-1">
                Course Code *
              </label>
              <input
                id="c-code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. NIEM-ENG-110"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-title" className="block font-semibold text-slate-700 mb-1">
                Course Title *
              </label>
              <input
                id="c-title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="c-cat" className="block font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                id="c-cat"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-level" className="block font-semibold text-slate-700 mb-1">
                Level *
              </label>
              <input
                id="c-level"
                required
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label htmlFor="c-duration" className="block font-semibold text-slate-700 mb-1">
                Duration *
              </label>
              <input
                id="c-duration"
                required
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div className="sm:col-span-3 grid sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="c-mode" className="block font-semibold text-slate-700 mb-1">
                  Learning Mode *
                </label>
                <input
                  id="c-mode"
                  required
                  value={form.learningMode}
                  onChange={(e) => setForm({ ...form, learningMode: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label htmlFor="c-elig" className="block font-semibold text-slate-700 mb-1">
                  Eligibility Note *
                </label>
                <input
                  id="c-elig"
                  required
                  value={form.eligibility}
                  onChange={(e) => setForm({ ...form, eligibility: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label htmlFor="c-fees" className="block font-semibold text-slate-700 mb-1">
                  Fee Schedule Note *
                </label>
                <input
                  id="c-fees"
                  required
                  value={form.feesNote}
                  onChange={(e) => setForm({ ...form, feesNote: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded"
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="c-summary" className="block font-semibold text-slate-700 mb-1">
                Programme Summary *
              </label>
              <textarea
                id="c-summary"
                rows={2}
                required
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="c-outline" className="block font-semibold text-slate-700 mb-1">
                Curriculum Outline (semicolon-separated modules) *
              </label>
              <textarea
                id="c-outline"
                rows={2}
                required
                value={form.curriculumOutline}
                onChange={(e) => setForm({ ...form, curriculumOutline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
          >
            {saving ? 'Saving Course...' : 'Save Course'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <th className="py-3 px-4 font-semibold">Code</th>
              <th className="py-3 px-4 font-semibold">Course Title</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-mono text-[#0B2241] whitespace-nowrap">{c.code}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{c.title}</div>
                  <div className="text-slate-500">{c.level}</div>
                </td>
                <td className="py-3 px-4 text-slate-700">{c.categoryName}</td>
                <td className="py-3 px-4">
                  <span className={c.isActive ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                    {c.isActive ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="px-2.5 py-1 text-xs font-semibold text-[#0B2241] border border-slate-300 rounded hover:border-[#0B2241]"
                  >
                    Edit
                  </button>
                  {c.isActive && (
                    <button
                      type="button"
                      onClick={() => handleArchive(c.id)}
                      aria-label={`Archive ${c.title}`}
                      className="p-1.5 text-slate-500 hover:text-red-700 align-middle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
