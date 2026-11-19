import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface EnquiryFormProps {
  defaultType?: 'course' | 'admission' | 'examination' | 'verification' | 'outreach' | 'general';
  defaultSubject?: string;
  defaultCourseName?: string;
  compact?: boolean;
  onSuccess?: (refCode: string) => void;
}

export const EnquiryForm: React.FC<EnquiryFormProps> = ({
  defaultType = 'general',
  defaultSubject = '',
  defaultCourseName = '',
  compact = false,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [enquiryType, setEnquiryType] = useState(defaultType);
  const [subject, setSubject] = useState(defaultSubject);
  const [courseName, setCourseName] = useState(defaultCourseName);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ referenceCode: string; subject: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^[+\d\s()-]{8,20}$/.test(mobile.trim())) {
      setError('Please enter a valid telephone or mobile number (8–20 digits).');
      return;
    }
    if (subject.trim().length < 3) {
      setError('Please provide an enquiry subject.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Please enter at least 10 characters describing your enquiry.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch<{ enquiry: { referenceCode: string; subject: string } }>(
        '/api/enquiries',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            mobile: mobile.trim(),
            city: city.trim(),
            enquiryType,
            subject: subject.trim(),
            courseName: courseName.trim(),
            message: message.trim(),
          }),
        }
      );
      setConfirmation(data.enquiry);
      onSuccess?.(data.enquiry.referenceCode);
      setFullName('');
      setEmail('');
      setMobile('');
      setCity('');
      setMessage('');
      if (!defaultSubject) setSubject('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div className="border border-emerald-200 bg-emerald-50/60 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2">
            <h4 className="font-serif text-lg font-semibold text-[#0B2241]">
              Enquiry Submitted Successfully
            </h4>
            <p className="text-sm text-slate-700">
              Your enquiry regarding <strong>{confirmation.subject}</strong> has been logged with the
              NIEM Administration Office.
            </p>
            <p className="text-sm text-slate-800">
              Reference Code:{' '}
              <span className="font-mono font-semibold text-[#0B2241] tabular-nums">
                {confirmation.referenceCode}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setConfirmation(null)}
              className="mt-2 inline-flex items-center px-4 py-2 text-xs font-semibold text-[#0B2241] border border-[#0B2241] rounded hover:bg-[#0B2241] hover:text-white transition-colors"
            >
              Submit Another Enquiry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 text-sm text-red-800 bg-red-50 border border-red-200 rounded"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'} gap-4`}>
        <div>
          <label htmlFor="enq-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Full Name *
          </label>
          <input
            id="enq-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          />
        </div>

        <div>
          <label htmlFor="enq-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email Address *
          </label>
          <input
            id="enq-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          />
        </div>

        <div>
          <label htmlFor="enq-mobile" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Mobile / Telephone *
          </label>
          <input
            id="enq-mobile"
            type="tel"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="+91 98XXXXXXXX"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white font-mono"
          />
        </div>

        <div>
          <label htmlFor="enq-city" className="block text-xs font-semibold text-slate-700 mb-1.5">
            City
          </label>
          <input
            id="enq-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. New Delhi, Bangalore, Mysore"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="enq-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Department / Enquiry Category
          </label>
          <select
            id="enq-type"
            value={enquiryType}
            onChange={(e) =>
              setEnquiryType(e.target.value as NonNullable<EnquiryFormProps['defaultType']>)
            }
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          >
            <option value="general">General Information (info@smnie.in)</option>
            <option value="course">Course &amp; Programme Enquiry</option>
            <option value="admission">Admissions Guidance</option>
            <option value="examination">Examination Desk (Exam@smnie.in)</option>
            <option value="outreach">International Safety Outreach</option>
            <option value="verification">Student Verification Desk</option>
          </select>
        </div>

        <div>
          <label htmlFor="enq-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Subject *
          </label>
          <input
            id="enq-subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief subject of your enquiry"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          />
        </div>
      </div>

      {(enquiryType === 'course' || enquiryType === 'outreach' || defaultCourseName) && (
        <div>
          <label htmlFor="enq-course" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Programme of Interest (Optional)
          </label>
          <input
            id="enq-course"
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. Diploma in Mechanical Engineering"
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
          />
        </div>
      )}

      <div>
        <label htmlFor="enq-message" className="block text-xs font-semibold text-slate-700 mb-1.5">
          Message *
        </label>
        <textarea
          id="enq-message"
          rows={compact ? 3 : 4}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please include your academic background, programme questions, or preferred study centre."
          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none bg-white"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] disabled:opacity-60 rounded transition-colors whitespace-nowrap"
      >
        {submitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}
      </button>
    </form>
  );
};
