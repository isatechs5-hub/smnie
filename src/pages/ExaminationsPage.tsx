import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Building2, Home, RefreshCw } from 'lucide-react';
import { EnquiryForm } from '../components/EnquiryForm';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';

export const ExaminationsPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title="Examination Procedure"
        description="Official overview of NIEM examination arrangements including examination at home, open-book examination, study centre sittings, re-examination policies, and Exam@smnie.in enquiries."
      />
      <PageHeader
        breadcrumb="Examination Procedure"
        title="Examination Procedure & Evaluation Guidelines"
        subtitle="Clear information regarding examination modes referenced in NIEM institutional documentation, subject to official confirmation for each academic session."
      />

      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-5 mb-10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-amber-950 leading-relaxed">
              <strong>Confirmation Notice:</strong> Availability of specific examination modes
              (at-home, open-book, or study-centre sittings) depends on your enrolled programme and
              current session regulations. Students must obtain written confirmation and an official
              admit card from the Examination Office (
              <a href="mailto:Exam@smnie.in" className="underline font-semibold">
                Exam@smnie.in
              </a>
              ) before planning examination logistics.
            </p>
          </div>

          <div className="max-w-3xl mb-12">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
              Examination Overview
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-4">
              Structured Academic Assessment
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              NIEM conducts structured academic evaluations to measure conceptual mastery and
              practical engineering or management application. Depending on programme structure and
              official Examination Controller directives, the following evaluation formats are
              referenced in institutional documentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <article className="border border-slate-200 rounded-md p-6 bg-white">
              <Home className="w-5 h-5 text-[#8F6A24] mb-3" aria-hidden="true" />
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                01. Examination at Home
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Where explicitly permitted for designated distance or executive coursework,
                registered candidates receive official question papers and response timelines under
                Examination Office supervision rules. Eligibility for at-home evaluation is not
                automatic and requires session-specific authorization.
              </p>
            </article>

            <article className="border border-slate-200 rounded-md p-6 bg-white">
              <BookOpen className="w-5 h-5 text-[#8F6A24] mb-3" aria-hidden="true" />
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                02. Open-Book Examination
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                For analytical and case-study papers where authorized, open-book evaluation assesses
                applied comprehension, engineering calculation accuracy, and managerial reasoning
                rather than rote memorization. Submission deadlines and academic integrity rules
                apply strictly.
              </p>
            </article>

            <article className="border border-slate-200 rounded-md p-6 bg-white">
              <Building2 className="w-5 h-5 text-[#8F6A24] mb-3" aria-hidden="true" />
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                03. Examination at Study Centre
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                In-person supervised examinations are coordinated through designated regional or
                study centres upon issuance of official examination schedules and centre allotments.
                Candidates must present valid photo identification and enrollment credentials.
              </p>
            </article>

            <article className="border border-slate-200 rounded-md p-6 bg-white">
              <RefreshCw className="w-5 h-5 text-[#8F6A24] mb-3" aria-hidden="true" />
              <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                04. Re-Examination Information
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Students who were unable to attend a scheduled sitting or who need to clear specific
                papers may apply for re-examination during the next announced examination window by
                submitting a formal request with their enrollment number to{' '}
                <a href="mailto:Exam@smnie.in" className="text-[#0B2241] font-medium underline">
                  Exam@smnie.in
                </a>
                .
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Examination Enquiries */}
      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase">
              Examination Controller Desk
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
              Examination-Related Enquiries
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Submit schedule questions, study-centre allocation requests, or re-examination
              enquiries directly to the Examination Office. Include your enrollment number if you
              are a current student.
            </p>
            <div className="border border-slate-200 rounded-md p-5 bg-white space-y-2.5 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Examination Email</span>
                <a href="mailto:Exam@smnie.in" className="font-mono font-semibold text-[#0B2241] underline">
                  Exam@smnie.in
                </a>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Results &amp; Verification</span>
                <Link to="/results" className="text-[#0B2241] font-semibold hover:text-[#8F6A24] underline">
                  Access Online Result Lookup →
                </Link>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <h3 className="font-serif text-2xl font-semibold text-[#0B2241] mb-5">
              Send an Examination Desk Enquiry
            </h3>
            <EnquiryForm
              defaultType="examination"
              defaultSubject="Examination Schedule / Re-Examination Enquiry"
            />
          </div>
        </div>
      </section>
    </>
  );
};
