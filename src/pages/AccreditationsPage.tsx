import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, FileCheck2, Info } from 'lucide-react';
import { AcademicImage } from '../components/AcademicImage';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { NIEM_INSTITUTIONAL_GALLERY } from '../lib/media';
import { formatVerificationStatusLabel } from '../utils/validation';

interface AccreditationRecord {
  id: number;
  code: string;
  bodyName: string;
  shortTitle: string;
  category: string;
  description: string;
  verificationStatus: string;
  verificationNote: string;
  lastReviewedAt: string;
}

export const AccreditationsPage: React.FC = () => {
  const [records, setRecords] = useState<AccreditationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ records: AccreditationRecord[] }>('/api/accreditations')
      .then((data) => setRecords(data.records || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load records'))
      .finally(() => setLoading(false));
  }, []);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'documented':
        return <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />;
      case 'pending_verification':
      case 'under_review':
        return <Clock className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
      default:
        return <Info className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <>
      <SeoHead
        title="Accreditations & Recognition"
        description="Transparent institutional recognition, membership references (ISTE Delhi, IGNOU, AIMS, UKAS, ANAB), registration details, and live verification statuses at NIEM."
      />
      <PageHeader
        breadcrumb="Accreditations & Recognition"
        title="Accreditations, Memberships & Recognition Disclosures"
        subtitle="Institutional references supplied in NIEM records, presented with explicit, administrator-maintained verification statuses."
      />

      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Institutional & University Reference Photographs */}
          <div className="mb-10">
            <h2 className="font-serif text-xl font-semibold text-[#0B2241] mb-4">
              Institutional &amp; Academic Reference Gallery
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {NIEM_INSTITUTIONAL_GALLERY.map((item) => (
                <figure
                  key={item.src}
                  className="bg-[#F8F9FB] border border-slate-200 rounded-md overflow-hidden"
                >
                  <div className="aspect-[3/2] overflow-hidden bg-slate-100">
                    <AcademicImage
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <figcaption className="p-3">
                    <div className="font-serif text-xs font-semibold text-[#0B2241]">
                      {item.title}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.caption}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {loading && (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading institutional recognition records...
            </div>
          )}

          {error && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 text-sm text-red-800 rounded">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {records.map((rec) => (
                <article
                  key={rec.id}
                  className="border border-slate-200 rounded-md p-6 sm:p-7 bg-white"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-[#8F6A24]">{rec.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.category}</span>
                      </div>
                      <h3 className="font-serif text-2xl font-semibold text-[#0B2241]">
                        {rec.bodyName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-3.5 py-2 shrink-0">
                      {renderStatusIcon(rec.verificationStatus)}
                      <span>{formatVerificationStatusLabel(rec.verificationStatus)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                      <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Supplied Reference Context
                      </h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{rec.description}</p>
                    </div>
                    <div className="lg:col-span-5 bg-[#F8F9FB] border border-slate-200 rounded p-4">
                      <h4 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#0B2241] mb-1.5 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#8F6A24]" aria-hidden="true" />
                        <span>Verification Note</span>
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{rec.verificationNote}</p>
                      <p className="mt-3 text-[11px] font-mono text-slate-400">
                        Last Administrative Review:{' '}
                        {new Date(rec.lastReviewedAt).toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-600 max-w-2xl">
              Prospective students or external verification authorities requesting copies of
              institutional registration or membership documents may contact{' '}
              <a href="mailto:info@smnie.in" className="text-[#0B2241] font-semibold underline">
                info@smnie.in
              </a>{' '}
              or{' '}
              <a
                href="mailto:studentverification@smnie.in"
                className="text-[#0B2241] font-semibold underline"
              >
                studentverification@smnie.in
              </a>
              .
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors whitespace-nowrap shrink-0"
            >
              Contact Registrar&apos;s Office
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};
