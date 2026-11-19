import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  ImageOff,
  Loader2,
  Maximize2,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { apiDownload, apiFetch } from '../lib/api';
import { validateStudentLookupId } from '../utils/validation';
import {
  CertificatePreviewModal,
  PublicCertificateSummary,
} from './CertificatePreviewModal';

export interface VerifiedStudentDetails {
  enrollmentNumber: string;
  fullName: string;
  programmeName: string;
  admissionYear: number;
  studyCentre: string;
  city: string;
  academicStanding: string;
  verificationStatus: string;
}

export interface StudentVerificationApiResponse {
  found: boolean;
  query: string;
  student: VerifiedStudentDetails | null;
  certificates: PublicCertificateSummary[];
  message: string;
}

export interface StudentVerificationFormProps {
  /** Optional initial Student ID (e.g. from ?verify= query parameter) to look up automatically. */
  initialStudentId?: string;
  /** Visual container mode: full home-page section or compact embedded card. */
  variant?: 'section' | 'embedded';
  /** Show helper link to the Examinations & Employer Verification page. */
  showResultsLink?: boolean;
  /** Unique HTML id for the search input element. */
  inputId?: string;
}

export const StudentVerificationForm: React.FC<StudentVerificationFormProps> = ({
  initialStudentId = '',
  variant = 'section',
  showResultsLink = true,
  inputId = 'student-verification-id-input',
}) => {
  const [studentIdInput, setStudentIdInput] = useState(initialStudentId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentVerificationApiResponse | null>(null);
  const [selectedCertIndex, setSelectedCertIndex] = useState(0);
  const [modalCert, setModalCert] = useState<PublicCertificateSummary | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  const performLookup = useCallback(async (rawId: string) => {
    const check = validateStudentLookupId(rawId);
    setError(null);
    setImageLoadFailed(false);

    if (!check.valid) {
      setError(check.error || 'Please enter a valid Student ID.');
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<StudentVerificationApiResponse>(
        `/api/students/verify/${encodeURIComponent(check.normalized)}`
      );
      setResult(data);
      setSelectedCertIndex(0);
    } catch (err) {
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to retrieve student record from the verification registry.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = initialStudentId.trim();
    if (trimmed.length >= 3) {
      setStudentIdInput(trimmed.toUpperCase());
      performLookup(trimmed);
    }
  }, [initialStudentId, performLookup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLookup(studentIdInput);
  };

  const handleClear = () => {
    setStudentIdInput('');
    setResult(null);
    setError(null);
    setSelectedCertIndex(0);
    setImageLoadFailed(false);
  };

  const handleDownloadCertificate = async (cert: PublicCertificateSummary) => {
    try {
      await apiDownload(cert.downloadUrl, cert.originalName);
    } catch {
      window.location.href = cert.downloadUrl;
    }
  };

  const activeCert =
    result && result.certificates.length > 0
      ? result.certificates[selectedCertIndex] || result.certificates[0]
      : null;

  const formCard = (
    <div
      data-testid="student-verification-form"
      className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden"
    >
      {/* Header & Student ID Search Input Bar */}
      <div className="p-6 sm:p-8 lg:p-10 bg-white border-b border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
              <span>Instant Credential Registry</span>
            </p>
            <h2
              id={`${inputId}-heading`}
              className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B2241] leading-tight"
            >
              Official Student Verification
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Enter a Student ID (Enrollment Number) or Certificate Number to verify enrollment
              details and preview official NIEM certificate images.
            </p>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate className="space-y-2.5">
              <label
                htmlFor={inputId}
                className="block text-xs font-semibold text-slate-700"
              >
                Search by Student ID or Certificate Number
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={inputId}
                    name="studentId"
                    type="search"
                    autoComplete="off"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    placeholder="Enter Student ID (e.g. NIEM-2024-ENG-1042)"
                    aria-invalid={error ? 'true' : 'false'}
                    className="w-full pl-10 pr-9 py-3 text-sm font-mono uppercase bg-[#F8F9FB] border border-slate-300 rounded focus:bg-white focus:border-[#0B2241] focus:outline-none"
                  />
                  {studentIdInput && (
                    <button
                      type="button"
                      onClick={handleClear}
                      aria-label="Clear student ID search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-[#CFA756] animate-spin" aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#CFA756]" aria-hidden="true" />
                  )}
                  <span>{loading ? 'Verifying...' : 'Verify Student ID'}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  Secured lookup directly connected to the official NIEM Hostzens database.
                </span>
                {showResultsLink && (
                  <Link
                    to="/results"
                    className="font-semibold text-[#0B2241] hover:text-[#8F6A24] underline"
                  >
                    Exam Results &amp; Employer Verification Form →
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Verified Record Details & Certificate Image Preview */}
      {result && (
        <div
          data-testid="student-verification-result"
          className="p-6 sm:p-8 lg:p-10 bg-[#F8F9FB]"
        >
          {!result.found || !result.student ? (
            <div
              role="status"
              className="bg-white border border-amber-200 rounded-md p-6 flex items-start gap-3.5"
            >
              <AlertCircle
                className="w-5 h-5 text-amber-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-serif text-lg font-semibold text-[#0B2241]">
                  No Verified Record Found for &ldquo;{result.query}&rdquo;
                </h3>
                <p className="text-sm text-slate-600 mt-1">{result.message}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Student Profile Details Card */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md overflow-hidden">
                <div className="px-5 py-4 bg-[#0B2241] text-white flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-[#CFA756]">
                      {result.student.enrollmentNumber}
                    </p>
                    <h3 className="font-serif text-xl font-semibold mt-0.5 truncate">
                      {result.student.fullName}
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{result.student.verificationStatus.replace('_', ' ')}</span>
                  </span>
                </div>

                <dl className="p-5 divide-y divide-slate-100 text-sm">
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-xs text-slate-500">Student ID</dt>
                    <dd className="font-mono font-semibold text-[#0B2241] text-right">
                      {result.student.enrollmentNumber}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-xs text-slate-500">Programme</dt>
                    <dd className="font-medium text-slate-900 text-right">
                      {result.student.programmeName}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-xs text-slate-500">Admission Year</dt>
                    <dd className="font-mono text-slate-800 text-right tabular-nums">
                      {result.student.admissionYear}
                    </dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-xs text-slate-500">Study Centre</dt>
                    <dd className="text-slate-800 text-right">{result.student.studyCentre}</dd>
                  </div>
                  {result.student.city && (
                    <div className="py-2.5 flex justify-between gap-4">
                      <dt className="text-xs text-slate-500">Location</dt>
                      <dd className="text-slate-800 text-right">{result.student.city}</dd>
                    </div>
                  )}
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-xs text-slate-500">Academic Standing</dt>
                    <dd className="font-semibold capitalize text-emerald-800 text-right">
                      {result.student.academicStanding}
                    </dd>
                  </div>
                </dl>

                {result.certificates.length > 1 && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 mb-2">
                      Verified Official Certificates ({result.certificates.length})
                    </p>
                    <div className="space-y-1.5">
                      {result.certificates.map((cert, idx) => (
                        <button
                          key={cert.id}
                          type="button"
                          onClick={() => {
                            setSelectedCertIndex(idx);
                            setImageLoadFailed(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${
                            idx === selectedCertIndex
                              ? 'bg-[#0B2241] text-white border-[#0B2241]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-[#0B2241]'
                          }`}
                        >
                          <div className="font-semibold truncate">{cert.title}</div>
                          <div
                            className={`font-mono text-[11px] ${
                              idx === selectedCertIndex ? 'text-[#CFA756]' : 'text-slate-500'
                            }`}
                          >
                            {cert.certificateNumber} · {cert.issueDate}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Official Certificate Image / PDF Preview Stage */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
                {activeCert ? (
                  <>
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-mono text-[#8F6A24] flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>
                            {activeCert.certificateNumber} · Issued {activeCert.issueDate}
                          </span>
                        </p>
                        <h4 className="font-serif text-base font-semibold text-[#0B2241] truncate">
                          {activeCert.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setModalCert(activeCert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B2241] bg-white border border-slate-300 hover:border-[#0B2241] rounded"
                        >
                          <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Full Screen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCertificate(activeCert)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#061529] bg-[#CFA756] hover:bg-[#dfb96c] rounded"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-slate-100/80 flex items-center justify-center min-h-[320px]">
                      {activeCert.mimeType === 'application/pdf' ? (
                        <iframe
                          src={activeCert.viewUrl}
                          title={`Official certificate ${activeCert.certificateNumber}`}
                          data-testid="home-certificate-preview-pdf"
                          className="w-full h-[460px] bg-white border border-slate-200 rounded shadow-sm"
                        />
                      ) : imageLoadFailed ? (
                        <div className="text-center space-y-2 py-8 px-4">
                          <ImageOff className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                          <p className="text-sm font-semibold text-[#0B2241]">
                            Certificate Preview Unavailable
                          </p>
                          <p className="text-xs text-slate-600 max-w-sm mx-auto">
                            Unable to render the certificate image inline. Use the Download button
                            above to open the official file directly.
                          </p>
                        </div>
                      ) : (
                        <img
                          src={activeCert.viewUrl}
                          alt={`Official NIEM Certificate for ${result.student.fullName} (${activeCert.certificateNumber})`}
                          data-testid="home-certificate-preview-img"
                          onError={() => setImageLoadFailed(true)}
                          className="max-w-full max-h-[460px] object-contain bg-white border-4 border-white rounded shadow-md ring-1 ring-slate-200"
                        />
                      )}
                    </div>

                    {activeCert.remarks && (
                      <div className="px-5 py-3 bg-white border-t border-slate-200 text-xs text-slate-600">
                        <strong className="text-[#0B2241]">Registrar Note:</strong>{' '}
                        {activeCert.remarks}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-10 text-center space-y-2">
                    <Award className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                    <h4 className="font-serif text-lg font-semibold text-[#0B2241]">
                      Student Record Verified — Certificate Pending Upload
                    </h4>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">{result.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <CertificatePreviewModal
        certificate={modalCert}
        onClose={() => setModalCert(null)}
        onDownload={handleDownloadCertificate}
      />
    </div>
  );

  if (variant === 'embedded') {
    return formCard;
  }

  return (
    <section
      id="student-verification"
      aria-labelledby={`${inputId}-heading`}
      className="py-14 lg:py-20 bg-[#F8F9FB] border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">{formCard}</div>
    </section>
  );
};
