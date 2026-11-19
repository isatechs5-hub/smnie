import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileUp, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { validateUploadFile } from '../utils/validation';

interface CourseOption {
  id: number;
  code: string;
  title: string;
  categoryName: string;
}

interface TrackedApplication {
  referenceNumber: string;
  courseName: string;
  status: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

export const AdmissionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Application Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [selectedCourseName, setSelectedCourseName] = useState(searchParams.get('course') || '');
  const [qualification, setQualification] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedApp, setSubmittedApp] = useState<{
    referenceNumber: string;
    courseName: string;
    status: string;
    document?: { originalName: string } | null;
  } | null>(null);

  // Tracker State
  const [trackRef, setTrackRef] = useState('');
  const [trackEmail, setTrackEmail] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [tracked, setTracked] = useState<TrackedApplication | null>(null);

  useEffect(() => {
    apiFetch<{ courses: CourseOption[] }>('/api/courses')
      .then((data) => {
        setCourses(data.courses || []);
        if (!selectedCourseName && data.courses?.length) {
          setSelectedCourseName(data.courses[0].title);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    if (!picked) {
      setFile(null);
      return;
    }
    const check = validateUploadFile(picked.type, picked.size);
    if (!check.valid) {
      setFormError(check.error || 'Unsupported file.');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFormError(null);
    setFile(picked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (fullName.trim().length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!/^[+\d\s()-]{8,20}$/.test(mobile.trim())) {
      setFormError('Please enter a valid mobile number (8–20 digits).');
      return;
    }
    if (!selectedCourseName.trim()) {
      setFormError('Please select a course or programme.');
      return;
    }
    if (qualification.trim().length < 2) {
      setFormError('Please specify your highest qualification.');
      return;
    }
    if (city.trim().length < 2) {
      setFormError('Please enter your city.');
      return;
    }

    setSubmitting(true);
    try {
      const matchedCourse = courses.find((c) => c.title === selectedCourseName);
      const fd = new FormData();
      fd.append('fullName', fullName.trim());
      fd.append('email', email.trim());
      fd.append('mobile', mobile.trim());
      if (matchedCourse) fd.append('courseId', String(matchedCourse.id));
      fd.append('courseName', selectedCourseName.trim());
      fd.append('qualification', qualification.trim());
      fd.append('city', city.trim());
      fd.append('message', message.trim());
      if (file) fd.append('document', file);

      const data = await apiFetch<{
        application: {
          referenceNumber: string;
          courseName: string;
          status: string;
          document?: { originalName: string } | null;
        };
      }>('/api/applications', {
        method: 'POST',
        body: fd,
      });

      setSubmittedApp(data.application);
      setTrackRef(data.application.referenceNumber);
      setTrackEmail(email.trim());
      setFullName('');
      setEmail('');
      setMobile('');
      setQualification('');
      setCity('');
      setMessage('');
      setFile(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTracked(null);

    if (!trackRef.trim() || !trackEmail.trim()) {
      setTrackError('Enter both your Application Reference Number and Email Address.');
      return;
    }

    setTrackLoading(true);
    try {
      const data = await apiFetch<{ application: TrackedApplication }>(
        `/api/applications/track?ref=${encodeURIComponent(
          trackRef.trim()
        )}&email=${encodeURIComponent(trackEmail.trim())}`
      );
      setTracked(data.application);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Application could not be located.');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <>
      <SeoHead
        title="Admission Process & Online Application"
        description="Learn about NIEM admission stages, required documents, submit an online admission application with optional document upload, and track your application status."
      />
      <PageHeader
        breadcrumb="Admissions"
        title="Admission Process & Online Application"
        subtitle="Review admission guidelines, prepare required documents, submit your online application, and track your review status in real time."
      />

      {/* Admission Overview & Stages */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
                Admission Overview
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
                Structured Admission Stages
              </h2>
            </div>

            <ol className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {[
                {
                  num: '01.',
                  title: 'Programme & Eligibility Review',
                  desc: 'Select your target Engineering, Management, Diploma, Certificate, or Safety Outreach programme. Specific academic prerequisites are confirmed by the Admissions Office per intake.',
                },
                {
                  num: '02.',
                  title: 'Online Application & Document Submission',
                  desc: 'Submit your personal, academic, and contact details via the online application form below. You may optionally upload supporting certificates (PDF, JPG, PNG, WEBP up to 5 MB).',
                },
                {
                  num: '03.',
                  title: 'Administrative Verification & Tracking',
                  desc: 'Upon submission, NIEM generates a unique Application Reference Number and notifies the Admissions Desk. Applicants can track review progress at any time.',
                },
                {
                  num: '04.',
                  title: 'Admission Confirmation & Enrolment',
                  desc: 'Once approved and formal enrolment requirements are satisfied, students receive an official NIEM Enrollment Number, study-centre details, and Student Portal credentials.',
                },
              ].map((st) => (
                <li key={st.num} className="py-4 grid grid-cols-12 gap-4">
                  <span className="col-span-2 font-mono text-sm text-[#8F6A24] font-medium">
                    {st.num}
                  </span>
                  <div className="col-span-10">
                    <h3 className="font-sans text-base font-semibold text-[#0B2241]">{st.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{st.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Required Documents & Contact */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#F8F9FB] border border-slate-200 rounded-md p-6">
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-3">
                Standard Supporting Documents
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-700 list-disc pl-5">
                <li>Copy of highest qualifying academic marksheet / certificate</li>
                <li>Valid government-issued photo identification</li>
                <li>Passport-size recent photograph</li>
                <li>Work experience proof (where relevant to executive or professional tracks)</li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                All uploaded admission documents are stored privately on the server and are never
                exposed to public directories.
              </p>
            </div>

            <div className="border border-slate-200 rounded-md p-6 bg-white">
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                Admissions Helpdesk
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                For guidance on eligibility, study centres, or fee schedules, contact our New Delhi
                Head Office or Regional Offices.
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Email</dt>
                  <dd>
                    <a href="mailto:info@smnie.in" className="font-medium text-[#0B2241] underline">
                      info@smnie.in
                    </a>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Telephone</dt>
                  <dd className="font-mono text-slate-800">
                    <a href="tel:01164506504" className="hover:underline">
                      011-64506504
                    </a>{' '}
                    ·{' '}
                    <a href="tel:01122588575" className="hover:underline">
                      011-22588575
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Online Application Form & Status Tracker */}
      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Online Admission Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-1.5">
              Online Admission Portal
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B2241] mb-2">
              Submit Online Admission Application
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Complete every required field accurately. Submitted records are stored securely in the
              NIEM database with an instant reference number.
            </p>

            {submittedApp ? (
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-md p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241]">
                      Admission Application Confirmed
                    </h3>
                    <p className="text-sm text-slate-700 mt-1">
                      Your application for <strong>{submittedApp.courseName}</strong> has been
                      recorded and queued for administrative review.
                    </p>
                  </div>
                </div>

                <dl className="bg-white border border-emerald-200 rounded p-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Application Reference Number</dt>
                    <dd className="font-mono font-semibold text-[#0B2241] mt-0.5 tabular-nums">
                      {submittedApp.referenceNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Current Status</dt>
                    <dd className="font-semibold text-amber-800 capitalize mt-0.5">
                      {submittedApp.status.replace('_', ' ')}
                    </dd>
                  </div>
                  {submittedApp.document && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Attached Document (Private Storage)</dt>
                      <dd className="text-xs font-mono text-slate-700 mt-0.5">
                        {submittedApp.document.originalName}
                      </dd>
                    </div>
                  )}
                </dl>

                <button
                  type="button"
                  onClick={() => setSubmittedApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#0B2241] border border-[#0B2241] rounded hover:bg-[#0B2241] hover:text-white transition-colors"
                >
                  Submit Another Application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="app-fullName"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Full Name *
                    </label>
                    <input
                      id="app-fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Applicant full name"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="app-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email Address *
                    </label>
                    <input
                      id="app-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="applicant@example.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="app-mobile"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mobile Number *
                    </label>
                    <input
                      id="app-mobile"
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98XXXXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="app-city"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      City *
                    </label>
                    <input
                      id="app-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. New Delhi, Mysore, Bangalore"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="app-course"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Course Selection *
                    </label>
                    <select
                      id="app-course"
                      required
                      value={selectedCourseName}
                      onChange={(e) => setSelectedCourseName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
                    >
                      <option value="">Select a programme</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.title}>
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="app-qual"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Highest Qualification *
                    </label>
                    <input
                      id="app-qual"
                      type="text"
                      required
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g. 10+2, ITI, Diploma, Graduate"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="app-doc"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Supporting Document Upload (Optional — PDF, JPG, PNG, WEBP · Max 5 MB)
                  </label>
                  <label
                    htmlFor="app-doc"
                    className="flex items-center justify-between gap-3 px-4 py-3 border border-dashed border-slate-300 rounded bg-slate-50 hover:border-[#0B2241] cursor-pointer text-sm text-slate-600"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <FileUp className="w-4 h-4 text-[#8F6A24] shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : 'Choose file to attach (optional)'}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#0B2241] shrink-0">Browse</span>
                  </label>
                  <input
                    id="app-doc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>

                <div>
                  <label
                    htmlFor="app-message"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Additional Message (Optional)
                  </label>
                  <textarea
                    id="app-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Mention preferred regional office, prior technical experience, or questions..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] disabled:opacity-60 rounded transition-colors"
                >
                  {submitting ? 'Submitting Application...' : 'Submit Admission Application'}
                </button>
              </form>
            )}
          </div>

          {/* Application Status Tracker */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-1.5">
              Live Status Lookup
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-2">
              Track Application Status
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Enter your unique NIEM Application Reference Number and applicant email address to
              check review progress.
            </p>

            <form onSubmit={handleTrack} noValidate className="space-y-4">
              {trackError && (
                <div
                  role="alert"
                  className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded"
                >
                  {trackError}
                </div>
              )}

              <div>
                <label
                  htmlFor="track-ref"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Application Reference Number
                </label>
                <input
                  id="track-ref"
                  type="text"
                  value={trackRef}
                  onChange={(e) => setTrackRef(e.target.value)}
                  placeholder="e.g. NIEM-APP-2026-1042AB"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="track-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Applicant Email Address
                </label>
                <input
                  id="track-email"
                  type="email"
                  value={trackEmail}
                  onChange={(e) => setTrackEmail(e.target.value)}
                  placeholder="e.g. student@smnie.in"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={trackLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B2241] bg-[#F7F0DF] border border-[#B68B3A] hover:bg-[#efe3c6] rounded transition-colors"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>{trackLoading ? 'Checking Status...' : 'Check Application Status'}</span>
              </button>
            </form>

            {tracked && (
              <div className="mt-6 pt-5 border-t border-slate-200 space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Reference</span>
                  <span className="font-mono font-semibold text-[#0B2241]">
                    {tracked.referenceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Programme</span>
                  <span className="text-right font-medium text-slate-800">{tracked.courseName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Current Status</span>
                  <span className="font-semibold uppercase text-xs text-[#0B2241]">
                    {tracked.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Last Updated</span>
                  <span className="font-mono text-xs text-slate-600">
                    {new Date(tracked.updatedAt).toISOString().slice(0, 10)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};
