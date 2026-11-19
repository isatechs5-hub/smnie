import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AcademicImage } from '../components/AcademicImage';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { NIEM_MEDIA } from '../lib/media';

export const AboutPage: React.FC = () => {
  const { siteSettings } = useAuth();

  return (
    <>
      <SeoHead
        title="About Us"
        description="Learn about the National Institute of Engineering & Management (NIEM), established in 1994, our mission, vision, academic approach, and institutional objectives."
      />
      <PageHeader
        breadcrumb="About Us"
        title="About the National Institute of Engineering & Management"
        subtitle="Established in 1994, NIEM is dedicated to structured engineering, management, and professional education supported by offices in New Delhi, Mysore, and Bangalore."
      />

      {/* Introduction & History */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-5 text-slate-700 leading-relaxed max-w-prose">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase">
              Institutional History · Est. 1994
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
              A Foundation Built on Practical Academic Access
            </h2>
            <p className="text-base">
              {siteSettings.institute_intro ||
                'Established in 1994 as documented in institutional records, the National Institute of Engineering & Management (NIEM) operates from its Head Office at Nehru Place, New Delhi, alongside Regional Offices in Mysore and Bangalore.'}
            </p>
            <p className="text-sm text-slate-600">
              Over the years, the institute has organized engineering, management, diploma,
              certificate, and occupational safety curricula tailored for both full-time learners
              and working personnel seeking structured career advancement. NIEM maintains separate
              administrative desks for General Admissions (<span className="font-mono">info@smnie.in</span>),
              Examinations (<span className="font-mono">Exam@smnie.in</span>), and Student Verification (
              <span className="font-mono">studentverification@smnie.in</span>).
            </p>
            <p className="text-sm text-slate-600">
              In keeping with our institutional commitment to transparency, NIEM clearly documents
              its historical background and membership references without overstating statutory
              authorities or fabricating external endorsements.
            </p>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded overflow-hidden border border-slate-200 bg-white">
              <AcademicImage
                src={NIEM_MEDIA.campusHero}
                alt="National Institute of Engineering and Management campus building"
                className="w-full aspect-[3/1] object-cover object-[35%_center]"
              />
            </div>
            <dl className="border border-slate-200 rounded-md divide-y divide-slate-200 text-sm bg-[#F8F9FB]">
              <div className="px-5 py-3.5 flex justify-between gap-4">
                <dt className="text-slate-500">Year Established</dt>
                <dd className="font-mono font-semibold text-[#0B2241]">1994</dd>
              </div>
              <div className="px-5 py-3.5 flex justify-between gap-4">
                <dt className="text-slate-500">Head Office</dt>
                <dd className="text-right font-medium text-slate-900">Nehru Place, New Delhi</dd>
              </div>
              <div className="px-5 py-3.5 flex justify-between gap-4">
                <dt className="text-slate-500">Regional Offices</dt>
                <dd className="text-right font-medium text-slate-900">Mysore &amp; Bangalore</dd>
              </div>
              <div className="px-5 py-3.5 flex justify-between gap-4">
                <dt className="text-slate-500">Official Portal</dt>
                <dd className="font-mono text-[#0B2241]">www.smnie.in</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Mission, Vision, Educational Philosophy */}
      <section className="py-16 bg-[#F8F9FB] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-md p-7">
            <p className="text-xs font-mono text-[#8F6A24] mb-2">01.</p>
            <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-3">Our Mission</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To deliver disciplined, affordable, and career-relevant engineering, management, and
              workplace safety education that equips learners with practical analytical and
              operational competence.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-7">
            <p className="text-xs font-mono text-[#8F6A24] mb-2">02.</p>
            <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-3">Our Vision</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To remain a dependable educational institution recognized for accessible learning
              pathways, transparent academic administration, and lifelong technical development.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-md p-7">
            <p className="text-xs font-mono text-[#8F6A24] mb-2">03.</p>
            <h2 className="font-serif text-2xl font-semibold text-[#0B2241] mb-3">
              Educational Philosophy
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Education should bridge theoretical principles with real engineering and management
              workflows, enabling motivated learners—including working professionals—to study at a
              structured, sustainable pace.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Approach & Institutional Objectives */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-6">
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-4">
              Academic Approach
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              NIEM structures coursework into clear modular units spanning core engineering
              principles, organizational management, and occupational safety orientation. Students
              are supported through structured curricula, study-centre coordination, and documented
              examination policies.
            </p>
            <div className="aspect-[3/2] rounded overflow-hidden border border-slate-200">
              <AcademicImage
                src={NIEM_MEDIA.lectureHall}
                alt="NIEM academic lecture hall and management seminar environment"
              />
            </div>
          </div>

          <div className="lg:col-span-6">
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-4">
              Institutional Objectives
            </h2>
            <ol className="divide-y divide-slate-200 border-t border-b border-slate-200">
              {[
                'Maintain structured curricula across Engineering, Management, Diploma, Certificate, and Safety Outreach streams.',
                'Provide transparent admission guidance and timely administrative communication across Head and Regional Offices.',
                'Uphold verifiable examination conduct and responsible publication of authorized student results.',
                'Support career readiness through communication workshops, interview guidance, and professional skill development.',
                'Safeguard student privacy while offering accountable verification channels for employers and academic institutions.',
              ].map((obj, idx) => (
                <li key={idx} className="py-4 flex gap-4 text-sm text-slate-700 leading-relaxed">
                  <span className="font-mono text-xs text-[#8F6A24] pt-0.5 shrink-0">
                    0{idx + 1}.
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Director's Message */}
      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-md p-4 flex items-center gap-4">
              <img
                src={NIEM_MEDIA.logo}
                alt="National Institute of Engineering official emblem"
                className="w-16 h-16 rounded bg-white p-0.5 object-contain border border-slate-200 shrink-0"
              />
              <div>
                <p className="font-serif text-base font-semibold text-[#0B2241]">
                  N.I.E. · Knowledge is Future
                </p>
                <p className="text-xs text-slate-500">Established 1994 · New Delhi</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <figure className="bg-white border border-slate-200 rounded overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <AcademicImage
                    src={NIEM_MEDIA.mahatmaGandhi}
                    alt="Mahatma Gandhi tribute"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <figcaption className="px-2.5 py-1.5 text-xs font-medium text-[#0B2241] text-center border-t border-slate-200">
                  Mahatma Gandhi
                </figcaption>
              </figure>
              <figure className="bg-white border border-slate-200 rounded overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <AcademicImage
                    src={NIEM_MEDIA.indiraGandhi}
                    alt="Smt. Indira Gandhi tribute"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <figcaption className="px-2.5 py-1.5 text-xs font-medium text-[#0B2241] text-center border-t border-slate-200">
                  Smt. Indira Gandhi
                </figcaption>
              </figure>
            </div>
          </div>
          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
              Director&apos;s Message
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-5">
              A Commitment to Learners Since 1994
            </h2>
            <p className="font-serif italic text-xl text-slate-800 leading-relaxed">
              &ldquo;
              {siteSettings.director_message ||
                'Since our founding in 1994, the National Institute of Engineering & Management has been guided by a straightforward commitment: quality technical and management education must remain practical, transparent, and accessible to determined learners.'}
              &rdquo;
            </p>
            <p className="mt-5 text-sm font-semibold text-[#0B2241]">
              {siteSettings.director_name ||
                'Office of the Director — National Institute of Engineering & Management'}
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors"
              >
                <span>Explore Courses</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/accreditations"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B2241] border border-[#0B2241] hover:bg-[#0B2241] hover:text-white rounded transition-colors"
              >
                <span>Accreditations &amp; Disclosures</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
