import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, HardDriveUpload, Loader2, Upload, X } from 'lucide-react';
import {
  adminApiUploadWithProgress,
  type UploadProgressInfo,
} from '../../admin/adminApi';
import { CertificateFileUploader } from './CertificateFileUploader';
import type { AdminCertificate, AdminStudent } from './AdminStudentsResultsTab';

interface Props {
  student: AdminStudent | null;
  onClose: () => void;
  onUploaded: (payload: {
    student: AdminStudent;
    certificate: AdminCertificate;
    fileUrl?: string;
    storageUri?: string;
  }) => Promise<void>;
}

export const StudentCertificateUploadModal: React.FC<Props> = ({
  student,
  onClose,
  onUploaded,
}) => {
  const abortRef = useRef<AbortController | null>(null);
  const [title, setTitle] = useState('Official Programme Completion Certificate');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [verificationStatus, setVerificationStatus] = useState('verified');
  const [isPublicViewable, setIsPublicViewable] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<UploadProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!student) return;
    abortRef.current?.abort();
    setTitle(`${student.programmeName} — Official Certificate`);
    setCertificateNumber('');
    setIssueDate(new Date().toISOString().slice(0, 10));
    setVerificationStatus('verified');
    setIsPublicViewable(true);
    setRemarks('');
    setFile(null);
    setProgress(null);
    setError(null);
    setSubmitting(false);
  }, [student]);

  if (!student) return null;

  const executeUpload = async () => {
    setError(null);

    if (!file) {
      setError('Please select a certificate file (PDF, JPG, PNG, or WEBP up to 5 MB).');
      return;
    }
    if (title.trim().length < 3) {
      setError('Certificate title must be at least 3 characters.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSubmitting(true);
    setProgress({ percent: 0, loaded: 0, total: file.size, phase: 'uploading' });

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (certificateNumber.trim()) {
        formData.append('certificateNumber', certificateNumber.trim().toUpperCase());
      }
      formData.append('issueDate', issueDate);
      formData.append('verificationStatus', verificationStatus);
      formData.append('isPublicViewable', String(isPublicViewable));
      formData.append('remarks', remarks.trim());
      formData.append('certificate', file);

      const res = await adminApiUploadWithProgress<{
        student: AdminStudent;
        certificate: AdminCertificate;
        fileUrl?: string;
        storageUri?: string;
      }>(`/api/admin/students/${student.id}/certificate`, formData, {
        onProgress: (info) => setProgress(info),
        signal: controller.signal,
      });

      await onUploaded(res);
      onClose();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Upload cancelled. You can adjust the file or retry anytime.');
      } else {
        setError(err instanceof Error ? err.message : 'Unable to upload certificate.');
      }
    } finally {
      abortRef.current = null;
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeUpload();
  };

  const handleCancelActiveUpload = () => {
    abortRef.current?.abort();
  };

  const handleCloseModal = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-cert-upload-modal-title"
      data-testid="student-cert-upload-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-md border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 bg-[#0B2241] text-white flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-[#E5C57B] flex items-center gap-1.5">
              <HardDriveUpload className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Hostzens Storage (niem-media/certificates/{student.enrollmentNumber})</span>
            </p>
            <h3
              id="student-cert-upload-modal-title"
              className="font-serif text-lg font-semibold truncate mt-0.5"
            >
              Upload Certificate — {student.fullName} ({student.enrollmentNumber})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Close certificate upload modal"
            className="p-1.5 text-slate-300 hover:text-white rounded shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs" noValidate>
          {error && !file && (
            <div
              role="alert"
              className="p-3 rounded bg-red-50 border border-red-200 text-red-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Robust Certificate File Uploader */}
          <CertificateFileUploader
            inputId="student-row-cert-file"
            file={file}
            onFileChange={(nextFile) => {
              setFile(nextFile);
              setError(null);
              setProgress(null);
            }}
            required
            targetPathHint={`niem-media/certificates/${student.enrollmentNumber}`}
            helperText={`Saved directly in Hostzens Storage and linked as the official file URL on student record ${student.enrollmentNumber}.`}
            uploading={submitting}
            progress={progress}
            uploadError={file ? error : null}
            onCancelUpload={handleCancelActiveUpload}
            onRetryUpload={() => void executeUpload()}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="student-row-cert-title"
                className="block font-semibold text-slate-700 mb-1"
              >
                Certificate Title *
              </label>
              <input
                id="student-row-cert-title"
                required
                disabled={submitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Official Programme Completion Certificate"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="student-row-cert-number"
                className="block font-semibold text-slate-700 mb-1"
              >
                Certificate Number (auto-generated if blank)
              </label>
              <input
                id="student-row-cert-number"
                disabled={submitting}
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="e.g. NIEM-CERT-2026-1042"
                className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="student-row-cert-date"
                className="block font-semibold text-slate-700 mb-1"
              >
                Issue Date *
              </label>
              <input
                id="student-row-cert-date"
                type="date"
                required
                disabled={submitting}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="student-row-cert-status"
                className="block font-semibold text-slate-700 mb-1"
              >
                Verification Status *
              </label>
              <select
                id="student-row-cert-status"
                disabled={submitting}
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:border-[#0B2241] focus:outline-none disabled:bg-slate-50"
              >
                <option value="verified">Verified</option>
                <option value="pending_review">Pending Review</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="student-row-cert-remarks"
                className="block font-semibold text-slate-700 mb-1"
              >
                Registrar Remarks (optional)
              </label>
              <input
                id="student-row-cert-remarks"
                disabled={submitting}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Verified — First Division"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none disabled:bg-slate-50"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-slate-700 pt-1">
            <input
              type="checkbox"
              disabled={submitting}
              checked={isPublicViewable}
              onChange={(e) => setIsPublicViewable(e.target.checked)}
            />
            <span>Publish immediately for Student ID verification &amp; certificate preview</span>
          </label>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-500 rounded"
            >
              {submitting ? 'Cancel Upload' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !file}
              className="inline-flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>
                {submitting
                  ? progress?.phase === 'processing'
                    ? 'Linking in Hostzens DB...'
                    : `Uploading (${progress?.percent ?? 0}%)...`
                  : 'Upload to Hostzens Storage'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
