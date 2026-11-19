import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Download,
  Eye,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  CertificatePreviewModal,
  PublicCertificateSummary,
} from '../components/CertificatePreviewModal';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { StudentVerificationForm } from '../components/StudentVerificationForm';
import { apiDownload, apiFetch } from '../lib/api';

interface LookupResponse {
  student: {
    enrollmentNumber: string;
    fullName: string;
    programmeName: string;
    admissionYear: number;
    studyCentre: string;
    status: string;
  };
  results: Array<{
    id: number;
    enrollmentNumber: string;
    termLabel: string;
    programmeName: string;
    examMode: string;
    gradeOrStatus: string;
    percentageOrScore: string;
    remarks: string;
    allowDownload: boolean;
    publishedAt: string | null;
  }>;
  certificates?: PublicCertificateSummary[];
}

interface VerificationResponse {
  found: boolean;
  referenceCode: string;
  verificationStatus?: string;
  record?: {
    enrollmentNumber: string;
    maskedName: string;
    programmeName: string;
    admissionYear: number;
    academicStanding: string;
    verificationStatus: string;
  };
  certificates?: PublicCertificateSummary[];
  message: string;
}

export const ResultsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'results' | 'verification'>('results');

  // Result lookup state
  const [enrNum, setEnrNum] = useState('');
  const [dob, setDob] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupData, setLookupData] = useState<LookupResponse | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Verification state
  const [verEnr, setVerEnr] = useState('');
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [purpose, setPurpose] = useState('Employment Credential Verification');
  const [verLoading, setVerLoading] = useState(false);
  const [verError, setVerError] = useState<string | null>(null);
  const [verResult, setVerResult] = useState<VerificationResponse | null>(null);
  const [activeCertificate, setActiveCertificate] = useState<PublicCertificateSummary | null>(null);

  const handleDownloadCertificate = async (cert: PublicCertificateSummary) => {
    try {
      await apiDownload(cert.downloadUrl, cert.originalName);
    } catch {
      window.location.href = cert.downloadUrl;
    }
  };

  const handleResultLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookupData(null);

    if (!enrNum.trim() || !dob.trim()) {
      setLookupError('Please enter both your Enrollment Number and Date of Birth.');
      return;
    }

    setLookupLoading(true);
    try {
      const data = await apiFetch<LookupResponse>('/api/results/lookup', {
        method: 'POST',
        body: JSON.stringify({
          enrollmentNumber: enrNum.trim(),
          dateOfBirth: dob.trim(),
        }),
      });
      setLookupData(data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Unable to retrieve examination results.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleDownloadStatement = async (resultId: number) => {
    setDownloadingId(resultId);
    try {
      const res = await fetch(`/api/results/${resultId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentNumber: enrNum.trim(),
          dateOfBirth: dob.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download not authorized.' }));
        throw new Error(err.error || 'Download failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NIEM-Result-${enrNum.trim().toUpperCase()}-${resultId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Unable to download statement.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerError(null);
    setVerResult(null);

    if (!verEnr.trim() || !reqName.trim() || !reqEmail.trim() || !purpose.trim()) {
      setVerError('All verification request fields are required.');
      return;
    }

    setVerLoading(true);
    try {
      const data = await apiFetch<VerificationResponse>('/api/verification/request', {
        method: 'POST',
        body: JSON.stringify({
          enrollmentNumber: verEnr.trim(),
          requesterName: reqName.trim(),
          requesterEmail: reqEmail.trim(),
          purpose: purpose.trim(),
        }),
      });
      setVerResult(data);
    } catch (err) {
      setVerError(err instanceof Error ? err.message : 'Verification request failed.');
    } finally {
      setVerLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Results & Student Verification"
        description="Secure NIEM examination result retrieval and privacy-protected student credential verification portal."
      />
      <PageHeader
        breadcrumb="Results & Verification"
        title="Examination Results & Student Verification"
        subtitle="Authorized student result lookup using Enrollment Number and Date of Birth, alongside privacy-protected external verification requests."
      />

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Privacy Assurance Notice */}
          <div className="bg-[#F8F9FB] border border-slate-200 rounded-md p-4 mb-8 flex items-start gap-3 text-xs sm:text-sm text-slate-700">
            <Lock className="w-4 h-4 text-[#0B2241] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>Student Privacy Safeguard:</strong> Confidential student details, contact
              records, and marksheets are never exposed through public search queries. Result access
              requires verified student credentials, and third-party verification displays masked
              registry standing only.
            </p>
          </div>

          {/* Interactive Mode Tabs */}
          <div
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-md mb-8"
            role="tablist"
            aria-label="Results and Verification Services"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'results'}
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                activeTab === 'results'
                  ? 'bg-[#0B2241] text-white'
                  : 'text-slate-700 hover:text-[#0B2241]'
              }`}
            >
              Student Result Lookup
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'verification'}
              onClick={() => setActiveTab('verification')}
              className={`px-4 py-2 text-sm font-semibold rounded transition-colors whitespace-nowrap ${
                activeTab === 'verification'
                  ? 'bg-[#0B2241] text-white'
                  : 'text-slate-700 hover:text-[#0B2241]'
              }`}
            >
              Student Verification Request
            </button>
          </div>

          {/* TAB 1: STUDENT RESULT LOOKUP */}
          {activeTab === 'results' && (
            <div className="space-y-8">
              <div className="border border-slate-200 rounded-md p-6 sm:p-8 bg-white">
                <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-2">
                  Retrieve Published Examination Results
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Enter your official NIEM Enrollment Number and Date of Birth exactly as recorded
                  with the Examination Office.
                </p>

                <form onSubmit={handleResultLookup} noValidate className="space-y-4">
                  {lookupError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{lookupError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="res-enr"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Enrollment Number *
                      </label>
                      <input
                        id="res-enr"
                        type="text"
                        required
                        value={enrNum}
                        onChange={(e) => setEnrNum(e.target.value)}
                        placeholder="e.g. NIEM-2024-ENG-1042"
                        className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="res-dob"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Date of Birth (YYYY-MM-DD) *
                      </label>
                      <input
                        id="res-dob"
                        type="date"
                        required
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] disabled:opacity-60 rounded transition-colors"
                    >
                      <Search className="w-4 h-4" aria-hidden="true" />
                      <span>{lookupLoading ? 'Verifying Credentials...' : 'Retrieve Result'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnrNum('NIEM-2024-ENG-1042');
                        setDob('1999-04-15');
                      }}
                      className="text-xs font-medium text-[#8F6A24] hover:text-[#0B2241] underline"
                    >
                      Fill Sample Record (NIEM-2024-ENG-1042)
                    </button>
                  </div>
                </form>
              </div>

              {lookupData && (
                <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <div className="bg-[#0B2241] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-[#CFA756]">
                        {lookupData.student.enrollmentNumber}
                      </p>
                      <h3 className="font-serif text-xl font-semibold">
                        {lookupData.student.fullName}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-200 sm:text-right">
                      <div>{lookupData.student.programmeName}</div>
                      <div className="text-slate-400">{lookupData.student.studyCentre}</div>
                    </div>
                  </div>

                  <div className="p-6">
                    {lookupData.results.length === 0 ? (
                      <p className="text-sm text-slate-600">
                        No published examination results are currently available for this enrollment
                        number. Please contact{' '}
                        <a href="mailto:Exam@smnie.in" className="text-[#0B2241] underline">
                          Exam@smnie.in
                        </a>
                        .
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {lookupData.results.map((r) => (
                          <div
                            key={r.id}
                            className="border border-slate-200 rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="text-xs text-slate-500">
                                {r.termLabel} · {r.examMode}
                              </div>
                              <div className="font-serif text-lg font-semibold text-[#0B2241]">
                                {r.gradeOrStatus} —{' '}
                                <span className="font-mono text-base tabular-nums">
                                  {r.percentageOrScore}
                                </span>
                              </div>
                              {r.remarks && <p className="text-xs text-slate-600">{r.remarks}</p>}
                            </div>

                            {r.allowDownload ? (
                              <button
                                type="button"
                                disabled={downloadingId === r.id}
                                onClick={() => handleDownloadStatement(r.id)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0B2241] bg-[#F7F0DF] border border-[#B68B3A] hover:bg-[#efe3c6] rounded transition-colors whitespace-nowrap shrink-0"
                              >
                                <Download className="w-4 h-4" aria-hidden="true" />
                                <span>
                                  {downloadingId === r.id
                                    ? 'Preparing Statement...'
                                    : 'Download Result Statement'}
                                </span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">
                                Download pending controller authorization
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {lookupData.certificates && lookupData.certificates.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                        <h4 className="font-serif text-lg font-semibold text-[#0B2241] flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                          <span>Verified Official Certificates</span>
                        </h4>
                        <div className="space-y-3">
                          {lookupData.certificates.map((cert) => (
                            <div
                              key={cert.id}
                              className="border border-slate-200 rounded-md p-4 bg-[#F8F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div>
                                <div className="font-mono text-xs text-[#8F6A24]">
                                  {cert.certificateNumber} · Issued {cert.issueDate}
                                </div>
                                <div className="font-semibold text-sm text-[#0B2241]">
                                  {cert.title}
                                </div>
                                {cert.remarks && (
                                  <p className="text-xs text-slate-600 mt-0.5">{cert.remarks}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setActiveCertificate(cert)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
                                >
                                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>View Certificate</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadCertificate(cert)}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2241] bg-white border border-slate-300 hover:border-[#0B2241] rounded"
                                >
                                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDENT VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="space-y-8">
              <StudentVerificationForm
                variant="embedded"
                showResultsLink={false}
                inputId="results-student-id-search"
              />

              <div className="border border-slate-200 rounded-md p-6 sm:p-8 bg-white">
                <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-2">
                  Employer &amp; Agency Verification Audit Request
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Employers, agencies, and academic institutions may verify enrollment standing by
                  submitting the candidate&apos;s enrollment number. All queries are logged for audit
                  and forwarded to{' '}
                  <a
                    href="mailto:studentverification@smnie.in"
                    className="font-mono text-[#0B2241] underline"
                  >
                    studentverification@smnie.in
                  </a>
                  .
                </p>

                <form onSubmit={handleVerificationSubmit} noValidate className="space-y-4">
                  {verError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{verError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="ver-enr"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Enrollment Number or Certificate Number *
                      </label>
                      <input
                        id="ver-enr"
                        type="text"
                        required
                        value={verEnr}
                        onChange={(e) => setVerEnr(e.target.value)}
                        placeholder="e.g. NIEM-2024-ENG-1042 or NIEM-CERT-2026-..."
                        className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ver-org"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Requester Name / Organization *
                      </label>
                      <input
                        id="ver-org"
                        type="text"
                        required
                        value={reqName}
                        onChange={(e) => setReqName(e.target.value)}
                        placeholder="e.g. HR Verification Desk, Organization Name"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ver-email"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Official Requester Email *
                      </label>
                      <input
                        id="ver-email"
                        type="email"
                        required
                        value={reqEmail}
                        onChange={(e) => setReqEmail(e.target.value)}
                        placeholder="verification@organization.com"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="ver-purpose"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Purpose of Verification *
                      </label>
                      <input
                        id="ver-purpose"
                        type="text"
                        required
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verLoading}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] disabled:opacity-60 rounded transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>{verLoading ? 'Verifying Registry...' : 'Submit Verification Request'}</span>
                  </button>
                </form>
              </div>

              {verResult && (
                <div className="border border-slate-200 rounded-md p-6 bg-[#F8F9FB] space-y-4">
                  <div className="flex items-start gap-3">
                    {verResult.found ? (
                      <CheckCircle2
                        className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    ) : (
                      <AlertCircle
                        className="w-5 h-5 text-amber-700 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-[#0B2241]">
                        {verResult.found
                          ? 'Enrollment Record Located (Privacy-Protected Summary)'
                          : 'Enrollment Number Not Found in Automated Registry'}
                      </h3>
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        Verification Request Code: {verResult.referenceCode}
                      </p>
                    </div>
                  </div>

                  {verResult.record && (
                    <dl className="grid sm:grid-cols-3 gap-4 bg-white border border-slate-200 rounded p-4 text-sm">
                      <div>
                        <dt className="text-xs text-slate-500">Enrollment Number</dt>
                        <dd className="font-mono font-semibold text-[#0B2241] mt-0.5">
                          {verResult.record.enrollmentNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Masked Holder Name</dt>
                        <dd className="font-mono text-slate-800 mt-0.5">
                          {verResult.record.maskedName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Verification Standing</dt>
                        <dd className="font-semibold capitalize text-emerald-800 mt-0.5">
                          {verResult.record.verificationStatus.replace('_', ' ')}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-slate-500">Programme</dt>
                        <dd className="text-slate-800 mt-0.5">{verResult.record.programmeName}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Admission Year</dt>
                        <dd className="font-mono text-slate-800 mt-0.5 tabular-nums">
                          {verResult.record.admissionYear}
                        </dd>
                      </div>
                    </dl>
                  )}

                  {verResult.certificates && verResult.certificates.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="font-serif text-lg font-semibold text-[#0B2241] flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#8F6A24]" aria-hidden="true" />
                        <span>Official Verified Certificates</span>
                      </h4>
                      <div className="space-y-3">
                        {verResult.certificates.map((cert) => (
                          <div
                            key={cert.id}
                            className="bg-white border border-slate-200 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="font-mono text-xs text-[#8F6A24]">
                                {cert.certificateNumber} · Issued {cert.issueDate}
                              </div>
                              <div className="font-semibold text-sm text-[#0B2241]">
                                {cert.title}
                              </div>
                              {cert.remarks && (
                                <p className="text-xs text-slate-600 mt-0.5">{cert.remarks}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveCertificate(cert)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>View Certificate</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadCertificate(cert)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0B2241] bg-[#F7F0DF] border border-[#B68B3A] hover:bg-[#efe3c6] rounded"
                              >
                                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 leading-relaxed">{verResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <CertificatePreviewModal
        certificate={activeCertificate}
        onClose={() => setActiveCertificate(null)}
        onDownload={handleDownloadCertificate}
      />
    </>
  );
};
