import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, Megaphone, Search, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface SearchResultPayload {
  courses: Array<{ id: number; slug: string; code: string; title: string; level: string; summary: string }>;
  announcements: Array<{ id: number; title: string; category: string; publishedDate: string; summary: string }>;
  pages: Array<{ title: string; path: string }>;
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultPayload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch<SearchResultPayload>(
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );
        setResults(data);
      } catch {
        setResults({ courses: [], announcements: [], pages: [] });
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const totalCount = results
    ? results.courses.length + results.announcements.length + results.pages.length
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search NIEM programmes, notices, and pages"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#061529]/60 backdrop-blur-[2px] p-4 pt-16 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
          <label htmlFor="global-search-input" className="sr-only">
            Search NIEM courses, announcements, and pages
          </label>
          <input
            ref={inputRef}
            id="global-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses (e.g. Mechanical, Management, OSHA), notices, or pages..."
            className="w-full text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-5">
          {query.trim().length < 2 && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-500">Quick Academic Shortcuts</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: 'Explore Academic Courses', to: '/courses' },
                  { label: 'Online Admission Application', to: '/admissions' },
                  { label: 'Results & Student Verification', to: '/results' },
                  { label: 'Accreditations & Recognition', to: '/accreditations' },
                  { label: 'Examination Procedure', to: '/examinations' },
                  { label: 'International Safety Outreach', to: '/international-outreach' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className="flex items-center justify-between px-3.5 py-2.5 text-sm text-slate-700 border border-slate-200 rounded hover:border-[#0B2241] hover:text-[#0B2241] transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <p className="text-sm text-slate-500 py-6 text-center">Searching institutional catalogue...</p>
          )}

          {!loading && results && totalCount === 0 && (
            <p className="text-sm text-slate-600 py-8 text-center">
              No programmes, announcements, or pages matched &ldquo;{query}&rdquo;.
            </p>
          )}

          {!loading && results && totalCount > 0 && (
            <div className="space-y-6">
              {results.courses.length > 0 && (
                <div>
                  <h3 className="font-sans text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    Academic Programmes ({results.courses.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded">
                    {results.courses.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/courses?q=${encodeURIComponent(c.title)}`}
                          onClick={onClose}
                          className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm font-semibold text-[#0B2241]">{c.title}</span>
                            <span className="text-xs font-mono text-slate-500 shrink-0">{c.code}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{c.summary}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.announcements.length > 0 && (
                <div>
                  <h3 className="font-sans text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                    Institutional Announcements ({results.announcements.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded">
                    {results.announcements.map((a) => (
                      <li key={a.id}>
                        <Link
                          to="/#announcements"
                          onClick={onClose}
                          className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="text-xs text-slate-500 mb-0.5">
                            {a.category} · {a.publishedDate}
                          </div>
                          <div className="text-sm font-medium text-slate-900">{a.title}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.pages.length > 0 && (
                <div>
                  <h3 className="font-sans text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    Pages ({results.pages.length})
                  </h3>
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded">
                    {results.pages.map((p) => (
                      <li key={p.path}>
                        <Link
                          to={p.path}
                          onClick={onClose}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50"
                        >
                          <span>{p.title}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
