import React from 'react';
import { Award, Download, X } from 'lucide-react';

export interface PublicCertificateSummary {
  id: number;
  enrollmentNumber: string;
  certificateNumber: string;
  title: string;
  issueDate: string;
  verificationStatus: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  remarks: string;
  viewUrl: string;
  downloadUrl: string;
}

interface Props {
  certificate: PublicCertificateSummary | null;
  onClose: () => void;
  onDownload: (cert: PublicCertificateSummary) => void;
}

export const CertificatePreviewModal: React.FC<Props> = ({
  certificate,
  onClose,
  onDownload,
}) => {
  if (!certificate) return null;

  const isPdf = certificate.mimeType === 'application/pdf';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Official Certificate ${certificate.certificateNumber}`}
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-md border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-[#0B2241] text-white flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-[#E5C57B] flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                {certificate.certificateNumber} · {certificate.enrollmentNumber}
              </span>
            </p>
            <h3 className="font-serif text-base sm:text-lg font-semibold truncate">
              {certificate.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(certificate)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#C59B43] text-[#071830] rounded hover:bg-[#d7ae56]"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close certificate preview"
              className="p-1.5 text-slate-300 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center min-h-[420px]">
          {isPdf ? (
            <iframe
              src={certificate.viewUrl}
              title={certificate.title}
              className="w-full h-[68vh] bg-white border border-slate-200 rounded"
            />
          ) : (
            <img
              src={certificate.viewUrl}
              alt={`${certificate.title} (${certificate.certificateNumber})`}
              className="max-w-full max-h-[68vh] object-contain bg-white border border-slate-200 rounded shadow-sm"
            />
          )}
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Issued: <strong className="font-mono text-slate-800">{certificate.issueDate}</strong> ·
            Status:{' '}
            <strong className="uppercase text-emerald-800">
              {certificate.verificationStatus.replace('_', ' ')}
            </strong>
          </span>
          {certificate.remarks && <span className="text-slate-500">{certificate.remarks}</span>}
        </div>
      </div>
    </div>
  );
};
