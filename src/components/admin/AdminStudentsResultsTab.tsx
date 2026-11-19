import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  adminApiDownload,
  adminApiFetch,
  adminApiUploadWithProgress,
  adminFetchBlob,
  type UploadProgressInfo,
} from '../../admin/adminApi';
import { validateCertificateUploadFile } from '../../utils/validation';
import { CertificateFileUploader } from './CertificateFileUploader';
import { StudentCertificateUploadModal } from './StudentCertificateUploadModal';

export interface AdminStudent {
  id: number;
  enrollmentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  programmeName: string;
  admissionYear: number;
  status: string;
  verificationStatus: string;
  studyCentre: string;
  city: string;
  certificateStorageUri?: string;
  certificateFileUrl?: string;
}

export interface AdminResult {
  id: number;
  studentId: number;
  enrollmentNumber: string;
  studentName: string;
  termLabel: string;
  programmeName: string;
  examMode: string;
  gradeOrStatus: string;
  percentageOrScore: string;
  remarks: string;
  isPublished: boolean;
  allowDownload: boolean;
}

export interface AdminCertificate {
  id: number;
  studentId: number;
  enrollmentNumber: string;
  studentName: string;
  programmeName: string;
  certificateNumber: string;
  title: string;
  issueDate: string;
  verificationStatus: 'verified' | 'pending_review' | 'revoked' | string;
  originalName: string;
  storedName?: string;
  mimeType: string;
  sizeBytes: number;
  isPublicViewable: boolean;
  uploadedByAdminEmail: string;
  remarks: string;
  createdAt: string;
}

export interface AdminVerificationLog {
  id: number;
  referenceCode: string;
  fullName: string;
  email: string;
  subject: string;
  courseName: string;
  message: string;
  status: string;
  internalNotes: string;
  createdAt: string;
}

interface Props {
  students: AdminStudent[];
  results: AdminResult[];
  certificates: AdminCertificate[];
  verifications: AdminVerificationLog[];
  onRefresh: () => Promise<void>;
}

export const AdminStudentsResultsTab: React.FC<Props> = ({
  students,
  results,
  certificates,
  verifications,
  onRefresh,
}) => {
  const [view, setView] = useState<'students' | 'results' | 'certificates'>('students');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddResult, setShowAddResult] = useState(false);
  const [showUploadCert, setShowUploadCert] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [certSearch, setCertSearch] = useState('');
  const [uploadTargetStudent, setUploadTargetStudent] = useState<AdminStudent | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [newStudent, setNewStudent] = useState({
    enrollmentNumber: '',
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '1999-01-01',
    programmeName: 'Diploma in Mechanical Engineering',
    admissionYear: 2026,
    studyCentre: 'New Delhi Head Office (Nehru Place)',
    city: 'New Delhi',
    certificateTitle: 'Official Programme Completion Certificate',
    certificateNumber: '',
  });
  const [newStudentCertFile, setNewStudentCertFile] = useState<File | null>(null);
  const [newStudentProgress, setNewStudentProgress] = useState<UploadProgressInfo | null>(null);
  const [savingStudent, setSavingStudent] = useState(false);
  const newStudentAbortRef = useRef<AbortController | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<number | null>(null);

  const [newResult, setNewResult] = useState({
    studentId: students[0]?.id || 0,
    termLabel: 'Semester I — Autumn 2026',
    examMode: 'Study Centre Supervised Examination',
    gradeOrStatus: 'Passed — First Division',
    percentageOrScore: '74.5%',
    remarks: '',
    isPublished: true,
    allowDownload: true,
  });

  const [certForm, setCertForm] = useState({
    studentId: students[0]?.id || 0,
    certificateNumber: '',
    title: 'Official Programme Completion Certificate',
    issueDate: new Date().toISOString().slice(0, 10),
    verificationStatus: 'verified',
    isPublicViewable: true,
    remarks: '',
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certProgress, setCertProgress] = useState<UploadProgressInfo | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certUploadAbortRef = useRef<AbortController | null>(null);

  // Inline Certificate Preview Modal State
  const [previewCert, setPreviewCert] = useState<AdminCertificate | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (students.length > 0) {
      setCertForm((prev) => (prev.studentId ? prev : { ...prev, studentId: students[0].id }));
      setNewResult((prev) => (prev.studentId ? prev : { ...prev, studentId: students[0].id }));
    }
  }, [students]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewCert(null);
    setPreviewError(null);
  };

  const openPreview = async (cert: AdminCertificate) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewCert(cert);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const { blob } = await adminFetchBlob(`/api/admin/certificates/${cert.id}/file`);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Unable to preview certificate.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newStudentCertFile) {
      const fileCheck = validateCertificateUploadFile(
        newStudentCertFile.type,
        newStudentCertFile.size
      );
      if (!fileCheck.valid) {
        setFeedback({ type: 'err', text: fileCheck.error || 'Unsupported certificate file.' });
        return;
      }
    }

    setSavingStudent(true);
    setNewStudentProgress(null);
    try {
      if (newStudentCertFile) {
        const controller = new AbortController();
        newStudentAbortRef.current = controller;
        setNewStudentProgress({
          percent: 0,
          loaded: 0,
          total: newStudentCertFile.size,
          phase: 'uploading',
        });

        const formData = new FormData();
        formData.append('enrollmentNumber', newStudent.enrollmentNumber);
        formData.append('fullName', newStudent.fullName);
        formData.append('email', newStudent.email);
        formData.append('phone', newStudent.phone);
        formData.append('dateOfBirth', newStudent.dateOfBirth);
        formData.append('programmeName', newStudent.programmeName);
        formData.append('admissionYear', String(newStudent.admissionYear));
        formData.append('studyCentre', newStudent.studyCentre);
        formData.append('city', newStudent.city);
        formData.append('certificateTitle', newStudent.certificateTitle);
        if (newStudent.certificateNumber.trim()) {
          formData.append('certificateNumber', newStudent.certificateNumber.trim().toUpperCase());
        }
        formData.append('certificate', newStudentCertFile);

        const res = await adminApiUploadWithProgress<{
          student: AdminStudent;
          fileUrl?: string;
        }>('/api/admin/students', formData, {
          onProgress: (info) => setNewStudentProgress(info),
          signal: controller.signal,
        });
        setFeedback({
          type: 'ok',
          text: `Student ${res.student.enrollmentNumber} saved and certificate uploaded to Hostzens Storage (${(res.student.certificateStorageUri || '').replace(/^hostzen:\/\//, '')}) with linked URL ${res.fileUrl || res.student.certificateFileUrl || ''}.`,
        });
      } else {
        await adminApiFetch('/api/admin/students', {
          method: 'POST',
          body: JSON.stringify(newStudent),
        });
        setFeedback({ type: 'ok', text: 'Student enrollment record saved.' });
      }
      setShowAddStudent(false);
      setNewStudentCertFile(null);
      setNewStudentProgress(null);
      setNewStudent({
        ...newStudent,
        enrollmentNumber: '',
        fullName: '',
        email: '',
        certificateNumber: '',
      });
      await onRefresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setFeedback({ type: 'err', text: 'Student certificate upload was cancelled.' });
      } else {
        setFeedback({
          type: 'err',
          text: err instanceof Error ? err.message : 'Failed to save student.',
        });
      }
    } finally {
      newStudentAbortRef.current = null;
      setSavingStudent(false);
    }
  };

  const handleUpdateStudent = async (id: number, status: string, verificationStatus: string) => {
    await adminApiFetch(`/api/admin/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, verificationStatus }),
    });
    await onRefresh();
  };

  const handleCreateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await adminApiFetch('/api/admin/results', {
        method: 'POST',
        body: JSON.stringify({
          ...newResult,
          studentId: Number(newResult.studentId || students[0]?.id),
        }),
      });
      setShowAddResult(false);
      setFeedback({ type: 'ok', text: 'Examination result record saved.' });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save result.',
      });
    }
  };

  const handleToggleResult = async (r: AdminResult, field: 'isPublished' | 'allowDownload') => {
    await adminApiFetch(`/api/admin/results/${r.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        isPublished: field === 'isPublished' ? !r.isPublished : r.isPublished,
        allowDownload: field === 'allowDownload' ? !r.allowDownload : r.allowDownload,
      }),
    });
    await onRefresh();
  };

  const handleUploadCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const targetStudentId = Number(certForm.studentId || students[0]?.id || 0);
    if (!targetStudentId) {
      setFeedback({ type: 'err', text: 'Please select an enrolled student.' });
      return;
    }
    if (!certFile) {
      setFeedback({
        type: 'err',
        text: 'Please choose a certificate file (PDF, JPG, PNG, or WEBP up to 5 MB).',
      });
      return;
    }

    const controller = new AbortController();
    certUploadAbortRef.current = controller;
    setUploadingCert(true);
    setCertProgress({ percent: 0, loaded: 0, total: certFile.size, phase: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('studentId', String(targetStudentId));
      formData.append('title', certForm.title.trim());
      if (certForm.certificateNumber.trim()) {
        formData.append('certificateNumber', certForm.certificateNumber.trim().toUpperCase());
      }
      formData.append('issueDate', certForm.issueDate);
      formData.append('verificationStatus', certForm.verificationStatus);
      formData.append('isPublicViewable', String(certForm.isPublicViewable));
      formData.append('remarks', certForm.remarks.trim());
      formData.append('certificate', certFile);

      await adminApiUploadWithProgress('/api/admin/certificates', formData, {
        onProgress: (info) => setCertProgress(info),
        signal: controller.signal,
      });

      setShowUploadCert(false);
      setCertFile(null);
      setCertProgress(null);
      setCertForm({
        studentId: students[0]?.id || 0,
        certificateNumber: '',
        title: 'Official Programme Completion Certificate',
        issueDate: new Date().toISOString().slice(0, 10),
        verificationStatus: 'verified',
        isPublicViewable: true,
        remarks: '',
      });
      setFeedback({
        type: 'ok',
        text: 'Official student certificate uploaded to Hostzens Storage and linked on the student record.',
      });
      await onRefresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setFeedback({ type: 'err', text: 'Certificate upload cancelled.' });
      } else {
        setFeedback({
          type: 'err',
          text: err instanceof Error ? err.message : 'Unable to upload certificate.',
        });
      }
    } finally {
      certUploadAbortRef.current = null;
      setUploadingCert(false);
    }
  };

  const handleCopyFileUrl = async (studentId: number, relativeFileUrl: string) => {
    try {
      const fullUrl = relativeFileUrl.startsWith('http')
        ? relativeFileUrl
        : `${window.location.origin}${relativeFileUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedStudentId(studentId);
      window.setTimeout(() => {
        setCopiedStudentId((prev) => (prev === studentId ? null : prev));
      }, 2000);
    } catch {
      setFeedback({ type: 'err', text: 'Unable to copy file URL to clipboard.' });
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
        text: `Removed certificate ${cert.certificateNumber} from registry.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to delete certificate.',
      });
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return `${s.enrollmentNumber} ${s.fullName} ${s.programmeName} ${s.studyCentre} ${s.certificateStorageUri || ''}`
      .toLowerCase()
      .includes(q);
  });

  const filteredCertificates = certificates.filter((c) => {
    if (!certSearch.trim()) return true;
    const q = certSearch.toLowerCase();
    return `${c.enrollmentNumber} ${c.studentName} ${c.certificateNumber} ${c.title} ${c.programmeName}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded">
          <button
            type="button"
            onClick={() => setView('students')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded ${
              view === 'students' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setView('results')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded ${
              view === 'results' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            Examination Results ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setView('certificates')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded inline-flex items-center gap-1.5 ${
              view === 'certificates' ? 'bg-[#0B2241] text-white' : 'text-slate-700'
            }`}
          >
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Verification &amp; Certificates ({certificates.length})</span>
          </button>
        </div>

        {view === 'students' && (
          <button
            type="button"
            onClick={() => setShowAddStudent((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2241] rounded"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Enroll Student</span>
          </button>
        )}

        {view === 'results' && (
          <button
            type="button"
            onClick={() => {
              setNewResult((prev) => ({
                ...prev,
                studentId: prev.studentId || students[0]?.id || 0,
              }));
              setShowAddResult((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2241] rounded"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add Result</span>
          </button>
        )}

        {view === 'certificates' && (
          <button
            type="button"
            onClick={() => {
              setCertForm((prev) => ({
                ...prev,
                studentId: prev.studentId || students[0]?.id || 0,
              }));
              setShowUploadCert((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#133562] rounded"
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Upload Certificate</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role={feedback.type === 'err' ? 'alert' : 'status'}
          className={`p-3 rounded border text-xs flex items-center gap-2 ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {view === 'students' && showAddStudent && (
        <form
          onSubmit={handleCreateStudent}
          className="bg-white border border-[#0B2241] rounded-md p-6 space-y-4 text-xs"
        >
          <h3 className="font-serif text-lg font-semibold text-[#0B2241]">
            Register Student Enrollment Record
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="Enrollment Number (e.g. NIEM-2026-ENG-4001)"
              value={newStudent.enrollmentNumber}
              onChange={(e) => setNewStudent({ ...newStudent, enrollmentNumber: e.target.value })}
              className="px-3 py-2 font-mono border border-slate-300 rounded"
            />
            <input
              required
              placeholder="Full Name"
              value={newStudent.fullName}
              onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              required
              type="email"
              placeholder="Student Email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              required
              type="date"
              value={newStudent.dateOfBirth}
              onChange={(e) => setNewStudent({ ...newStudent, dateOfBirth: e.target.value })}
              className="px-3 py-2 font-mono border border-slate-300 rounded"
            />
            <input
              required
              placeholder="Programme Name"
              value={newStudent.programmeName}
              onChange={(e) => setNewStudent({ ...newStudent, programmeName: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              required
              placeholder="Study Centre"
              value={newStudent.studyCentre}
              onChange={(e) => setNewStudent({ ...newStudent, studyCentre: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
          </div>

          {/* Optional Direct Certificate Upload to Hostzens Storage */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="font-semibold text-[#0B2241]">
              Optional: Attach Official Certificate (Saved Directly to Hostzens Storage)
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                placeholder="Certificate Title"
                value={newStudent.certificateTitle}
                onChange={(e) => setNewStudent({ ...newStudent, certificateTitle: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded"
              />
              <input
                placeholder="Certificate No. (auto if blank)"
                value={newStudent.certificateNumber}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, certificateNumber: e.target.value })
                }
                className="px-3 py-2 font-mono uppercase border border-slate-300 rounded"
              />
            </div>
            <CertificateFileUploader
              inputId="new-student-cert-file"
              file={newStudentCertFile}
              onFileChange={(f) => {
                setNewStudentCertFile(f);
                setNewStudentProgress(null);
              }}
              label="Optional Certificate File (PDF, JPG, PNG, WEBP — max 5 MB)"
              targetPathHint={
                newStudent.enrollmentNumber.trim()
                  ? `niem-media/certificates/${newStudent.enrollmentNumber.trim().toUpperCase()}`
                  : 'niem-media/certificates/<student-id>'
              }
              uploading={savingStudent && Boolean(newStudentCertFile)}
              progress={newStudentProgress}
              onCancelUpload={() => newStudentAbortRef.current?.abort()}
              compact
            />
          </div>

          <button
            type="submit"
            disabled={savingStudent}
            className="px-4 py-2 font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded"
          >
            {savingStudent
              ? 'Saving Student & Uploading...'
              : newStudentCertFile
                ? 'Save Student & Upload Certificate to Hostzens'
                : 'Save Student Record'}
          </button>
        </form>
      )}

      {view === 'results' && showAddResult && (
        <form
          onSubmit={handleCreateResult}
          className="bg-white border border-[#0B2241] rounded-md p-6 space-y-4 text-xs"
        >
          <h3 className="font-serif text-lg font-semibold text-[#0B2241]">
            Add Examination Result Record
          </h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <select
              value={newResult.studentId || students[0]?.id || 0}
              onChange={(e) => setNewResult({ ...newResult, studentId: Number(e.target.value) })}
              className="px-3 py-2 border border-slate-300 rounded bg-white"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.enrollmentNumber} — {s.fullName}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Term Label (e.g. Semester II — 2026)"
              value={newResult.termLabel}
              onChange={(e) => setNewResult({ ...newResult, termLabel: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              required
              placeholder="Result Status (e.g. Passed — First Division)"
              value={newResult.gradeOrStatus}
              onChange={(e) => setNewResult({ ...newResult, gradeOrStatus: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              required
              placeholder="Score / Percentage (e.g. 76.4%)"
              value={newResult.percentageOrScore}
              onChange={(e) => setNewResult({ ...newResult, percentageOrScore: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              placeholder="Exam Mode"
              value={newResult.examMode}
              onChange={(e) => setNewResult({ ...newResult, examMode: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
            <input
              placeholder="Remarks"
              value={newResult.remarks}
              onChange={(e) => setNewResult({ ...newResult, remarks: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newResult.isPublished}
                onChange={(e) => setNewResult({ ...newResult, isPublished: e.target.checked })}
              />
              <span>Publish to Student Lookup</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newResult.allowDownload}
                onChange={(e) => setNewResult({ ...newResult, allowDownload: e.target.checked })}
              />
              <span>Authorize Result Statement Download</span>
            </label>
          </div>
          <button
            type="submit"
            className="px-4 py-2 font-semibold text-white bg-[#0B2241] rounded"
          >
            Save Examination Result
          </button>
        </form>
      )}

      {view === 'certificates' && showUploadCert && (
        <form
          onSubmit={handleUploadCertificate}
          className="bg-white border border-[#0B2241] rounded-md p-6 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#0B2241]">
                Upload Official Student Verification Certificate
              </h3>
              <p className="text-slate-500 mt-0.5">
                Uploaded certificates marked Verified &amp; Publicly Viewable appear immediately in
                the public Student Verification registry and Student Portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUploadCert(false)}
              className="text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cert-student" className="block font-semibold text-slate-700 mb-1">
                Enrolled Student *
              </label>
              <select
                id="cert-student"
                value={certForm.studentId || students[0]?.id || 0}
                onChange={(e) => setCertForm({ ...certForm, studentId: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.enrollmentNumber} — {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cert-title" className="block font-semibold text-slate-700 mb-1">
                Certificate Title *
              </label>
              <input
                id="cert-title"
                required
                value={certForm.title}
                onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                placeholder="e.g. Diploma Completion Certificate"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>

            <div>
              <label htmlFor="cert-number" className="block font-semibold text-slate-700 mb-1">
                Certificate Number (auto-generated if blank)
              </label>
              <input
                id="cert-number"
                value={certForm.certificateNumber}
                onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                placeholder="e.g. NIEM-CERT-2026-1042"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>

            <div>
              <label htmlFor="cert-issue-date" className="block font-semibold text-slate-700 mb-1">
                Issue Date *
              </label>
              <input
                id="cert-issue-date"
                type="date"
                required
                value={certForm.issueDate}
                onChange={(e) => setCertForm({ ...certForm, issueDate: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded"
              />
            </div>

            <div>
              <label htmlFor="cert-status" className="block font-semibold text-slate-700 mb-1">
                Verification Status *
              </label>
              <select
                id="cert-status"
                value={certForm.verificationStatus}
                onChange={(e) =>
                  setCertForm({ ...certForm, verificationStatus: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
              >
                <option value="verified">Verified</option>
                <option value="pending_review">Pending Review</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <CertificateFileUploader
                inputId="cert-file"
                file={certFile}
                onFileChange={(f) => {
                  setCertFile(f);
                  setCertProgress(null);
                }}
                required
                targetPathHint="niem-media/certificates"
                uploading={uploadingCert}
                progress={certProgress}
                onCancelUpload={() => certUploadAbortRef.current?.abort()}
                compact
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="cert-remarks" className="block font-semibold text-slate-700 mb-1">
                Registrar Remarks (optional)
              </label>
              <input
                id="cert-remarks"
                value={certForm.remarks}
                onChange={(e) => setCertForm({ ...certForm, remarks: e.target.value })}
                placeholder="e.g. Verified against Examination Cell register — First Division"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                checked={certForm.isPublicViewable}
                onChange={(e) =>
                  setCertForm({ ...certForm, isPublicViewable: e.target.checked })
                }
              />
              <span>Allow verified public viewing &amp; download on Student Verification page</span>
            </label>

            <button
              type="submit"
              disabled={uploadingCert}
              className="inline-flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-[#0B2241] hover:bg-[#133562] disabled:opacity-60 rounded"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{uploadingCert ? 'Uploading Certificate...' : 'Publish Certificate'}</span>
            </button>
          </div>
        </form>
      )}

      {view === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-md w-full">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <label htmlFor="admin-student-search" className="sr-only">
                Search enrolled students
              </label>
              <input
                id="admin-student-search"
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by Student ID, name, programme, or Hostzens Storage path..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Certificates uploaded here are stored directly in{' '}
              <span className="font-mono text-[#0B2241]">Hostzens Storage (niem-media/certificates)</span>{' '}
              and linked on each student record.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Enrollment</th>
                  <th className="py-3 px-4 font-semibold">Student &amp; Programme</th>
                  <th className="py-3 px-4 font-semibold">Standing</th>
                  <th className="py-3 px-4 font-semibold">Verification Status</th>
                  <th className="py-3 px-4 font-semibold">Certificate &amp; Hostzens Storage</th>
                  <th className="py-3 px-4 font-semibold text-right">Upload Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st) => {
                  const studentCerts = certificates.filter((c) => c.studentId === st.id);
                  const primaryCert = studentCerts[0] || null;
                  const storageUri = st.certificateStorageUri || primaryCert?.storedName || '';
                  const storageDisplayPath = storageUri.replace(/^hostzen:\/\//, '');
                  const linkedFileUrl =
                    st.certificateFileUrl ||
                    (primaryCert
                      ? `/api/certificates/${primaryCert.id}/view?enrollment=${encodeURIComponent(
                          primaryCert.enrollmentNumber
                        )}&cert=${encodeURIComponent(primaryCert.certificateNumber)}`
                      : '');

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-[#0B2241] whitespace-nowrap">
                        {st.enrollmentNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{st.fullName}</div>
                        <div className="text-slate-500">
                          {st.programmeName} · {st.studyCentre}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Academic standing for ${st.enrollmentNumber}`}
                          value={st.status}
                          onChange={(e) =>
                            handleUpdateStudent(st.id, e.target.value, st.verificationStatus)
                          }
                          className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="active">Active</option>
                          <option value="graduated">Graduated</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Verification status for ${st.enrollmentNumber}`}
                          value={st.verificationStatus}
                          onChange={(e) => handleUpdateStudent(st.id, st.status, e.target.value)}
                          className="px-2.5 py-1 border border-slate-300 rounded bg-white"
                        >
                          <option value="verified">Verified</option>
                          <option value="pending_review">Pending Review</option>
                          <option value="not_verified">Not Verified</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 max-w-[290px]">
                        {primaryCert ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                                <Award className="w-3 h-3" aria-hidden="true" />
                                <span>
                                  {studentCerts.length} Certificate
                                  {studentCerts.length > 1 ? 's' : ''}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => openPreview(primaryCert)}
                                aria-label={`Preview certificate for ${st.enrollmentNumber}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B2241] hover:text-[#8F6A24] underline"
                              >
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                <span>Preview</span>
                              </button>
                              {linkedFileUrl && (
                                <>
                                  <a
                                    href={linkedFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open certificate file URL for ${st.enrollmentNumber}`}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600 hover:text-[#0B2241]"
                                  >
                                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                    <span>URL</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyFileUrl(st.id, linkedFileUrl)}
                                    aria-label={`Copy certificate file URL for ${st.enrollmentNumber}`}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-600 hover:text-[#0B2241]"
                                  >
                                    {copiedStudentId === st.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                                        <span className="text-emerald-700">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" aria-hidden="true" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                            {storageDisplayPath && (
                              <div
                                title={storageDisplayPath}
                                className="font-mono text-[10px] text-emerald-700 truncate"
                              >
                                {storageDisplayPath}
                              </div>
                            )}
                            {linkedFileUrl && (
                              <div
                                title={linkedFileUrl}
                                className="font-mono text-[10px] text-slate-500 truncate"
                              >
                                {linkedFileUrl}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">No certificate linked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setUploadTargetStudent(st)}
                          aria-label={`Upload certificate for ${st.enrollmentNumber}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#133562] rounded transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#CFA756]" aria-hidden="true" />
                          <span>{primaryCert ? 'Add Certificate' : 'Upload Certificate'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'results' && (
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="py-3 px-4 font-semibold">Enrollment</th>
                <th className="py-3 px-4 font-semibold">Term &amp; Score</th>
                <th className="py-3 px-4 font-semibold">Published</th>
                <th className="py-3 px-4 font-semibold">Download Authorized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-mono text-[#0B2241]">{r.enrollmentNumber}</div>
                    <div className="text-slate-500">{r.studentName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">
                      {r.termLabel} — {r.gradeOrStatus}
                    </div>
                    <div className="text-slate-500">
                      {r.percentageOrScore} · {r.examMode}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleResult(r, 'isPublished')}
                      className={`px-3 py-1 rounded font-semibold border ${
                        r.isPublished
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {r.isPublished ? 'Published' : 'Unpublished'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleResult(r, 'allowDownload')}
                      className={`px-3 py-1 rounded font-semibold border ${
                        r.allowDownload
                          ? 'bg-[#F7F0DF] text-[#0B2241] border-[#B68B3A]'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      {r.allowDownload ? 'Allowed' : 'Restricted'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'certificates' && (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="admin-cert-search" className="sr-only">
              Search uploaded certificates
            </label>
            <input
              id="admin-cert-search"
              type="search"
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              placeholder="Search by enrollment, certificate number, student, or title..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-3 px-4 font-semibold">Certificate &amp; Enrollment</th>
                  <th className="py-3 px-4 font-semibold">Student &amp; Title</th>
                  <th className="py-3 px-4 font-semibold">Verification</th>
                  <th className="py-3 px-4 font-semibold">Public View</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                      No student verification certificates uploaded yet. Click{' '}
                      <strong>Upload Certificate</strong> above to publish an official certificate.
                    </td>
                  </tr>
                ) : (
                  filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-[#0B2241]">
                          {cert.certificateNumber}
                        </div>
                        <div className="font-mono text-slate-500">{cert.enrollmentNumber}</div>
                        <div className="text-[11px] text-slate-400">Issued {cert.issueDate}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cert.title}</div>
                        <div className="text-slate-600">
                          {cert.studentName} · {cert.programmeName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {cert.originalName} ({Math.max(1, Math.round(cert.sizeBytes / 1024))} KB)
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          aria-label={`Verification status for certificate ${cert.certificateNumber}`}
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
                          className={`px-3 py-1 rounded font-semibold border ${
                            cert.isPublicViewable
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-300'
                          }`}
                        >
                          {cert.isPublicViewable ? 'Public' : 'Hidden'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openPreview(cert)}
                            aria-label={`View certificate ${cert.certificateNumber}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[#0B2241] border border-slate-300 rounded hover:border-[#0B2241]"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View</span>
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

          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-serif text-base font-semibold text-[#0B2241]">
                Recent Student Verification Requests ({verifications.length})
              </h3>
            </div>
            {verifications.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">
                No external student verification requests have been logged yet.
              </p>
            ) : (
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
                    {verifications.map((v) => (
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
            )}
          </div>
        </div>
      )}

      {/* Admin Inline Certificate Preview Modal */}
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
                  {previewCert.certificateNumber} · {previewCert.enrollmentNumber}
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
                <p className="text-sm text-slate-600">Loading official certificate...</p>
              )}
              {previewError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded">
                  {previewError}
                </p>
              )}
              {!previewLoading && !previewError && previewUrl && (
                previewCert.mimeType === 'application/pdf' ? (
                  <iframe
                    src={previewUrl}
                    title={previewCert.title}
                    className="w-full h-[68vh] bg-white border border-slate-200 rounded"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={`${previewCert.title} for ${previewCert.studentName}`}
                    className="max-w-full max-h-[68vh] object-contain bg-white border border-slate-200 rounded shadow-sm"
                  />
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Per-Student Hostzens Storage Certificate Upload Modal */}
      <StudentCertificateUploadModal
        student={uploadTargetStudent}
        onClose={() => setUploadTargetStudent(null)}
        onUploaded={async ({ student, certificate, fileUrl }) => {
          const displayPath = (
            student.certificateStorageUri ||
            certificate.storedName ||
            ''
          ).replace(/^hostzen:\/\//, '');
          const savedUrl = fileUrl || student.certificateFileUrl || '';
          setFeedback({
            type: 'ok',
            text: `Uploaded ${certificate.certificateNumber} for ${student.fullName} (${student.enrollmentNumber}) to Hostzens Storage (${displayPath}) and linked URL ${savedUrl} on the student record.`,
          });
          await onRefresh();
        }}
      />
    </div>
  );
};
