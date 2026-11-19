import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { adminApiDownload, adminApiFetch, adminFetchBlob } from '../../admin/adminApi';
import { validateCertificateUploadFile } from '../../utils/validation';
import { AdminCourse } from './AdminCoursesTab';
import {
  AdminCertificate,
  AdminStudent,
  AdminVerificationLog,
} from './AdminStudentsResultsTab';

interface Props {
  students: AdminStudent[];
  courses: AdminCourse[];
  certificates: AdminCertificate[];
  verifications: AdminVerificationLog[];
  onRefresh: () => Promise<void>;
}

export const AdminStudentVerificationTab: React.FC<Props> = ({
  students,
  courses,
  certificates,
  verifications,
  onRefresh,
}) => {
  const [entryMode, setEntryMode] = useState<'new_student' | 'existing_student'>('new_student');
  const [certSearch, setCertSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
    studentId?: string;
    certificateNumber?: string;
  } | null>(null);

  // Unified New Student + Official Certificate Form State
  const [studentForm, setStudentForm] = useState({
    enrollmentNumber: '',
    fullName: '',
    programmeName: courses[0]?.title || 'Diploma in Mechanical Engineering',
    admissionYear: new Date().getFullYear(),
    studyCentre: 'New Delhi Head Office (Nehru Place)',
    status: 'graduated',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  // Existing Student selection for second mode
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 0);

  // Shared Official Certificate metadata
  const [certMeta, setCertMeta] = useState({
    title: 'Official Programme Completion Certificate',
    certificateNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    verificationStatus: 'verified',
    isPublicViewable: true,
    remarks: '',
  });

  // Upload File + Live Instant Preview before saving to Hostzens DB
  const [certFile, setCertFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Saved Certificate Preview Modal (fetched directly from Hostzens DB)
  const [previewCert, setPreviewCert] = useState<AdminCertificate | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelectFile = (file: File | null) => {
    setFileError(null);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    if (!file) {
      setCertFile(null);
      return;
    }

    const check = validateCertificateUploadFile(file.type, file.size);
    if (!check.valid) {
      setCertFile(null);
      setFileError(check.error || 'Unsupported certificate file.');
      return;
    }

    setCertFile(file);
    setLocalPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    handleSelectFile(null);
    const input = document.getElementById('admin-verification-cert-file') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewCert(null);
    setPreviewError(null);
  };

  const openSavedPreview = async (cert: AdminCertificate) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewCert(cert);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const { blob } = await adminFetchBlob(`/api/admin/certificates/${cert.id}/file`);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Unable to load certificate preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setFileError(null);

    if (!certFile) {
      setFileError('Please select an official certificate image (PNG, JPG, WEBP) or PDF to upload.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('certificate', certFile);
      formData.append('issueDate', certMeta.issueDate);
      formData.append('verificationStatus', certMeta.verificationStatus);
      formData.append('isPublicViewable', String(certMeta.isPublicViewable));
      formData.append('remarks', certMeta.remarks.trim());
      if (certMeta.certificateNumber.trim()) {
        formData.append('certificateNumber', certMeta.certificateNumber.trim().toUpperCase());
      }

      if (entryMode === 'new_student') {
        if (
          !studentForm.enrollmentNumber.trim() ||
          !studentForm.fullName.trim() ||
          !studentForm.programmeName.trim()
        ) {
          setFeedback({
            type: 'err',
            text: 'Student ID, Full Name, and Programme Name are required.',
          });
          setSubmitting(false);
          return;
        }

        formData.append('enrollmentNumber', studentForm.enrollmentNumber.trim().toUpperCase());
        formData.append('fullName', studentForm.fullName.trim());
        formData.append('programmeName', studentForm.programmeName.trim());
        formData.append('admissionYear', String(studentForm.admissionYear));
        formData.append('studyCentre', studentForm.studyCentre.trim());
        formData.append('status', studentForm.status);
        if (studentForm.email.trim()) formData.append('email', studentForm.email.trim());
        if (studentForm.phone.trim()) formData.append('phone', studentForm.phone.trim());
        if (studentForm.dateOfBirth.trim()) {
          formData.append('dateOfBirth', studentForm.dateOfBirth.trim());
        }
        formData.append('certificateTitle', certMeta.title.trim());

        const res = await adminApiFetch<{
          student: { enrollmentNumber: string; fullName: string };
          certificate: { certificateNumber: string };
        }>('/api/admin/student-verification', {
          method: 'POST',
          body: formData,
        });

        setFeedback({
          type: 'ok',
          text: `Saved ${res.student.fullName} (${res.student.enrollmentNumber}) and uploaded official certificate ${res.certificate.certificateNumber} to Hostzens Storage (niem-media). It is now live on the Home Page Student ID search.`,
          studentId: res.student.enrollmentNumber,
          certificateNumber: res.certificate.certificateNumber,
        });

        setStudentForm((prev) => ({
          ...prev,
          enrollmentNumber: '',
          fullName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
        }));
      } else {
        const targetId = Number(selectedStudentId || students[0]?.id || 0);
        if (!targetId) {
          setFeedback({ type: 'err', text: 'Please select an enrolled student.' });
          setSubmitting(false);
          return;
        }
        formData.append('studentId', String(targetId));
        formData.append('title', certMeta.title.trim());

        const res = await adminApiFetch<{
          certificate: { enrollmentNumber: string; studentName: string; certificateNumber: string };
        }>('/api/admin/certificates', {
          method: 'POST',
          body: formData,
        });

        setFeedback({
          type: 'ok',
          text: `Uploaded official certificate ${res.certificate.certificateNumber} for ${res.certificate.studentName} (${res.certificate.enrollmentNumber}) to Hostzens Storage (niem-media).`,
          studentId: res.certificate.enrollmentNumber,
          certificateNumber: res.certificate.certificateNumber,
        });
      }

      handleClearFile();
      setCertMeta((prev) => ({
        ...prev,
        certificateNumber: '',
        remarks: '',
      }));
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to save student verification record.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCertificate = async (
    cert: AdminCertificate,
    patch: { verificationStatus?: string; isPublicViewable?: boolean }
  ) => {
    setFeedback(null);
    try {
      await adminApiFetch(`/api/admin/certificates/${cert.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update certificate.',
      });
    }
  };

  const handleDeleteCertificate = async (cert: AdminCertificate) => {
    setFeedback(null);
    try {
      await adminApiFetch(`/api/admin/certificates/${cert.id}`, { method: 'DELETE' });
      if (previewCert?.id === cert.id) closePreview();
      setFeedback({
        type: 'ok',
        text: `Removed certificate ${cert.certificateNumber} from Hostzens database.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to delete certificate.',
      });
    }
  };

  const filteredCertificates = certificates.filter((c) => {
    if (!certSearch.trim()) return true;
    const q = certSearch.toLowerCase();
    return `${c.enrollmentNumber} ${c.studentName} ${c.certificateNumber} ${c.title} ${c.programmeName}`
      .toLowerCase()
      .includes(q);
  });

  const isLocalPdf = certFile?.type === 'application/pdf';

  return (
    <div className="space-y-6">
      {/* Top Banner Summary */}
      <div className="bg-[#061529] text-white rounded-md p-6 border border-[#0B2241]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#CFA756] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Primary Verification Registry · Hostzens Storage (niem-media)</span>
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-white mt-1">
              Student Verification &amp; Official Certificate Publishing
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl">
              Add a student with their official certificate here. Every certificate file is uploaded
              directly into your Hostzens.com Storage bucket (niem-media) and linked in PostgreSQL
              for instant Student ID preview on the website Home Page.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-[#0B2241] border border-white/15 rounded px-4 py-2.5 text-center">
              <div className="font-mono text-xl font-semibold text-[#CFA756] tabular-nums">
                {certificates.length}
              </div>
              <div className="text-[11px] text-slate-300">Saved Certificates</div>
            </div>
            <div className="bg-[#0B2241] border border-white/15 rounded px-4 py-2.5 text-center">
              <div className="font-mono text-xl font-semibold text-white tabular-nums">
                {students.length}
              </div>
              <div className="text-[11px] text-slate-300">Verified Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-4 rounded-md border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
          {feedback.type === 'ok' && feedback.studentId && (
            <a
              href={`/?verify=${encodeURIComponent(feedback.studentId)}#student-verification`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B2241] bg-white border border-emerald-300 rounded hover:border-[#0B2241] shrink-0"
            >
              <span>Preview on Home Page</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {/* Unified Add Student + Upload & Preview Official Certificate Form */}
      <form
        onSubmit={handleSubmitVerification}
        className="bg-white border border-slate-200 rounded-md overflow-hidden shadow-xs"
      >
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#0B2241]">
              Add Student &amp; Upload Official Certificate
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload PNG, JPG, WEBP, or PDF (up to 5 MB). Preview before uploading directly to
              Hostzens Storage (`niem-media/certificates`).
            </p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded">
            <button
              type="button"
              onClick={() => setEntryMode('new_student')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                entryMode === 'new_student'
                  ? 'bg-[#0B2241] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Student + Certificate</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('existing_student')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                entryMode === 'existing_student'
                  ? 'bg-[#0B2241] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Existing Student ({students.length})</span>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          {/* Left 7 columns: Student & Certificate Fields */}
          <div className="lg:col-span-7 space-y-5">
            {entryMode === 'new_student' ? (
              <div className="space-y-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6A24] border-b border-slate-100 pb-1.5">
                  1. Student Verification Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="sv-student-id"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Student ID / Enrollment Number *
                    </label>
                    <input
                      id="sv-student-id"
                      required
                      value={studentForm.enrollmentNumber}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, enrollmentNumber: e.target.value })
                      }
                      placeholder="e.g. NIEM-2026-ENG-2001"
                      className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sv-full-name"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Student Full Name *
                    </label>
                    <input
                      id="sv-full-name"
                      required
                      value={studentForm.fullName}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, fullName: e.target.value })
                      }
                      placeholder="e.g. Rahul Kumar Sharma"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="sv-programme"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Programme / Course Name *
                    </label>
                    <input
                      id="sv-programme"
                      required
                      list="niem-course-suggestions"
                      value={studentForm.programmeName}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, programmeName: e.target.value })
                      }
                      placeholder="e.g. Diploma in Mechanical Engineering"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                    <datalist id="niem-course-suggestions">
                      {courses.map((c) => (
                        <option key={c.id} value={c.title} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label
                      htmlFor="sv-year"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Admission / Batch Year
                    </label>
                    <input
                      id="sv-year"
                      type="number"
                      min={1994}
                      max={2099}
                      value={studentForm.admissionYear}
                      onChange={(e) =>
                        setStudentForm({
                          ...studentForm,
                          admissionYear: Number(e.target.value) || new Date().getFullYear(),
                        })
                      }
                      className="w-full px-3 py-2 font-mono border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sv-standing"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Academic Standing
                    </label>
                    <select
                      id="sv-standing"
                      value={studentForm.status}
                      onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:border-[#0B2241] focus:outline-none"
                    >
                      <option value="graduated">Graduated / Completed</option>
                      <option value="active">Active Enrolled</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sv-centre"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Study Centre
                    </label>
                    <input
                      id="sv-centre"
                      value={studentForm.studyCentre}
                      onChange={(e) =>
                        setStudentForm({ ...studentForm, studyCentre: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sv-email"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Student Email (optional)
                    </label>
                    <input
                      id="sv-email"
                      type="email"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      placeholder="student@example.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6A24] border-b border-slate-100 pb-1.5">
                  1. Select Existing Enrolled Student
                </div>
                <div>
                  <label
                    htmlFor="sv-existing-student"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Enrolled Student *
                  </label>
                  <select
                    id="sv-existing-student"
                    value={selectedStudentId || students[0]?.id || 0}
                    onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded bg-white focus:border-[#0B2241] focus:outline-none"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.enrollmentNumber} — {s.fullName} ({s.programmeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Certificate Details */}
            <div className="space-y-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6A24] border-b border-slate-100 pb-1.5">
                2. Official Certificate Metadata
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="sv-cert-title"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Official Certificate Title *
                  </label>
                  <input
                    id="sv-cert-title"
                    required
                    value={certMeta.title}
                    onChange={(e) => setCertMeta({ ...certMeta, title: e.target.value })}
                    placeholder="e.g. Official Diploma Completion Certificate"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sv-cert-number"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Certificate Number (auto if blank)
                  </label>
                  <input
                    id="sv-cert-number"
                    value={certMeta.certificateNumber}
                    onChange={(e) =>
                      setCertMeta({ ...certMeta, certificateNumber: e.target.value })
                    }
                    placeholder="e.g. NIEM-CERT-2026-2001"
                    className="w-full px-3 py-2 font-mono uppercase border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sv-cert-date"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Issue Date *
                  </label>
                  <input
                    id="sv-cert-date"
                    type="date"
                    required
                    value={certMeta.issueDate}
                    onChange={(e) => setCertMeta({ ...certMeta, issueDate: e.target.value })}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sv-cert-status"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Verification Status
                  </label>
                  <select
                    id="sv-cert-status"
                    value={certMeta.verificationStatus}
                    onChange={(e) =>
                      setCertMeta({ ...certMeta, verificationStatus: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:border-[#0B2241] focus:outline-none"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="sv-cert-remarks"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Registrar Remarks (optional)
                  </label>
                  <input
                    id="sv-cert-remarks"
                    value={certMeta.remarks}
                    onChange={(e) => setCertMeta({ ...certMeta, remarks: e.target.value })}
                    placeholder="e.g. First Division with Distinction"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={certMeta.isPublicViewable}
                  onChange={(e) =>
                    setCertMeta({ ...certMeta, isPublicViewable: e.target.checked })
                  }
                />
                <span>
                  Publish for instant preview on the Website Home Page Student ID Search
                </span>
              </label>
            </div>
          </div>

          {/* Right 5 columns: Official Certificate Upload + Instant Live Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#F8F9FB] border border-slate-200 rounded-md p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8F6A24]">
                  3. Official Certificate Upload &amp; Live Preview *
                </span>
                {certFile && (
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-[11px] font-semibold text-red-700 hover:underline"
                  >
                    Remove File
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="admin-verification-cert-file"
                  className="block font-semibold text-slate-700 mb-1.5"
                >
                  Choose Official Certificate File (PNG, JPG, WEBP, or PDF — max 5 MB)
                </label>
                <input
                  id="admin-verification-cert-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-xs file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#0B2241] file:text-white hover:file:bg-[#133562]"
                />
              </div>

              {fileError && (
                <div
                  role="alert"
                  className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Live Certificate Preview Frame */}
              <div className="border-2 border-dashed border-slate-300 rounded-md bg-white min-h-[240px] flex flex-col items-center justify-center p-3 overflow-hidden">
                {localPreviewUrl && certFile ? (
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                      <span className="font-medium truncate flex items-center gap-1.5">
                        {isLocalPdf ? (
                          <FileText className="w-3.5 h-3.5 text-[#8F6A24] shrink-0" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-[#8F6A24] shrink-0" />
                        )}
                        <span className="truncate">{certFile.name}</span>
                      </span>
                      <span className="font-mono text-slate-500 shrink-0 ml-2">
                        {Math.max(1, Math.round(certFile.size / 1024))} KB
                      </span>
                    </div>
                    {isLocalPdf ? (
                      <iframe
                        src={localPreviewUrl}
                        title="Selected PDF certificate live preview"
                        className="w-full h-56 border border-slate-200 rounded bg-slate-50"
                      />
                    ) : (
                      <img
                        src={localPreviewUrl}
                        alt="Live preview of selected official student certificate"
                        data-testid="admin-cert-live-preview"
                        className="w-full max-h-60 object-contain rounded border border-slate-200 bg-slate-50"
                      />
                    )}
                    <p className="text-[11px] text-emerald-700 font-medium text-center">
                      Ready to upload to Hostzens Storage (niem-media)
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-2 py-8 px-4">
                    <Upload className="w-7 h-7 text-slate-400 mx-auto" aria-hidden="true" />
                    <p className="font-semibold text-slate-700">
                      Official Certificate Preview Area
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Select a certificate image or PDF above to see a live preview before uploading
                      it into your Hostzens.com Storage bucket.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded transition-colors"
              >
                <Database className="w-4 h-4 text-[#CFA756]" aria-hidden="true" />
                <span>
                  {submitting
                    ? 'Uploading to Hostzens Storage...'
                    : entryMode === 'new_student'
                      ? 'Save Student & Official Certificate'
                      : 'Upload Official Certificate'}
                </span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Files saved directly in Hostzens Storage (`niem-media/certificates`)
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Saved Certificates Registry Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#0B2241]">
              Published Student Certificates in Hostzens Storage ({certificates.length})
            </h2>
            <p className="text-xs text-slate-500">
              Any certificate marked <strong>Verified</strong> &amp; <strong>Home Visible</strong>{' '}
              is immediately previewable on the website Home Page.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="admin-verification-registry-search" className="sr-only">
              Search saved student certificates
            </label>
            <input
              id="admin-verification-registry-search"
              type="search"
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              placeholder="Search Student ID, name, certificate..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Student ID &amp; Certificate No.</th>
                <th className="py-3 px-4 font-semibold">Student &amp; Official Certificate</th>
                <th className="py-3 px-4 font-semibold">Verification Status</th>
                <th className="py-3 px-4 font-semibold">Home Page Preview</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCertificates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                    No certificates found in Hostzens database yet. Use the form above to add a
                    student with their official certificate.
                  </td>
                </tr>
              ) : (
                filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-[#0B2241]">
                        {cert.enrollmentNumber}
                      </div>
                      <div className="font-mono text-[11px] text-[#8F6A24]">
                        {cert.certificateNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">Issued {cert.issueDate}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{cert.studentName}</div>
                      <div className="text-slate-700">{cert.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {cert.programmeName} · {cert.originalName} (
                        {Math.max(1, Math.round(cert.sizeBytes / 1024))} KB)
                      </div>
                      {cert.storedName && cert.storedName.startsWith('hostzen://') && (
                        <div className="text-[10px] font-mono text-emerald-700 mt-0.5 truncate max-w-md">
                          Hostzens Storage: {cert.storedName.replace('hostzen://', '')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={`Verification status for ${cert.certificateNumber}`}
                        value={cert.verificationStatus}
                        onChange={(e) =>
                          handleUpdateCertificate(cert, { verificationStatus: e.target.value })
                        }
                        className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                      >
                        <option value="verified">Verified</option>
                        <option value="pending_review">Pending Review</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCertificate(cert, {
                            isPublicViewable: !cert.isPublicViewable,
                          })
                        }
                        className={`px-3 py-1 rounded font-semibold border whitespace-nowrap ${
                          cert.isPublicViewable
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-300'
                        }`}
                      >
                        {cert.isPublicViewable ? 'Visible on Home' : 'Hidden'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openSavedPreview(cert)}
                          aria-label={`Preview certificate ${cert.certificateNumber}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-white bg-[#0B2241] hover:bg-[#133562] rounded font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            adminApiDownload(
                              `/api/admin/certificates/${cert.id}/file?download=1`,
                              cert.originalName
                            )
                          }
                          aria-label={`Download certificate ${cert.certificateNumber}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[#0B2241] border border-slate-300 rounded hover:border-[#0B2241]"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCertificate(cert)}
                          aria-label={`Delete certificate ${cert.certificateNumber}`}
                          className="p-1.5 text-slate-400 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Verification Request Logs */}
      {verifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <h3 className="font-serif text-base font-semibold text-[#0B2241]">
              Recent Formal Verification Requests ({verifications.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2.5 px-4 font-semibold">Reference</th>
                  <th className="py-2.5 px-4 font-semibold">Requester</th>
                  <th className="py-2.5 px-4 font-semibold">Lookup Details</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.slice(0, 10).map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 px-4 font-mono text-[#0B2241] whitespace-nowrap">
                      {v.referenceCode}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{v.fullName}</div>
                      <div className="text-slate-500">{v.email}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">{v.subject}</div>
                      <div className="text-slate-500">{v.message}</div>
                    </td>
                    <td className="py-2.5 px-4 uppercase font-semibold text-slate-700 whitespace-nowrap">
                      {v.status.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Saved Certificate Preview Modal (Served from Hostzens DB) */}
      {previewCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Certificate preview ${previewCert.certificateNumber}`}
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-md border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#0B2241] text-white flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-[#E5C57B]">
                  {previewCert.enrollmentNumber} · {previewCert.certificateNumber}
                </p>
                <h4 className="font-serif text-base font-semibold truncate">
                  {previewCert.title} — {previewCert.studentName}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    adminApiDownload(
                      `/api/admin/certificates/${previewCert.id}/file?download=1`,
                      previewCert.originalName
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#C59B43] text-[#071830] rounded hover:bg-[#d7ae56]"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  aria-label="Close certificate preview"
                  className="p-1.5 text-slate-300 hover:text-white rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 overflow-auto p-4 flex items-center justify-center min-h-[420px]">
              {previewLoading && (
                <p className="text-sm text-slate-600">
                  Loading official certificate from Hostzens database...
                </p>
              )}
              {previewError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
                  {previewError}
                </p>
              )}
              {!previewLoading && !previewError && previewUrl && (
                <>
                  {previewCert.mimeType === 'application/pdf' ? (
                    <iframe
                      src={previewUrl}
                      title={previewCert.title}
                      className="w-full h-[68vh] bg-white border border-slate-200 rounded"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt={`${previewCert.title} (${previewCert.certificateNumber})`}
                      className="max-w-full max-h-[68vh] object-contain bg-white border border-slate-200 rounded shadow-sm"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
