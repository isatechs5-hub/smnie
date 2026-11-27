import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Calendar, CheckCircle2, FileText, ShieldAlert } from 'lucide-react';
import { AcademicImage } from '../components/AcademicImage';
import { EnquiryForm } from '../components/EnquiryForm';
import { HomeStudentVerification } from '../components/HomeStudentVerification';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { NIEM_INSTITUTIONAL_GALLERY, NIEM_MEDIA } from '../lib/media';
import { formatVerificationStatusLabel } from '../utils/validation';

interface CourseSummary {
  id: number;
  code: string;
  title: string;
  categoryName: string;
  categorySlug: string;
  level: string;
  learningMode: string;
  summary: string;
}

interface AnnouncementItem {
  id: number;
  title: string;
  category: string;
  summary: string;
  publishedDate: string;
  isPinned: boolean;
}

interface AccreditationItem {
  id: number;
  code: string;
  bodyName: string;
  shortTitle: string;
  verificationStatus: string;
}

export const HomePage: React.FC = () => {
  const { siteSettings } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [accreditations, setAccreditations] = useState<AccreditationItem[]>([]);

  useEffect(() => {
    Promise.all([
      apiFetch<{ courses: CourseSummary[] }>('/api/courses').catch(() => ({ courses: [] })),
      apiFetch<{ announcements: AnnouncementItem[] }>('/api/announcements?limit=4').catch(() => ({
        announcements: [],
      })),
      apiFetch<{ records: AccreditationItem[] }>('/api/accreditations').catch(() => ({
        records: [],
      })),
    ]).then(([cData, aData, accData]) => {
      setCourses(Array.isArray(cData?.courses) ? cData.courses.slice(0, 6) : []);
      setAnnouncements(Array.isArray(aData?.announcements) ? aData.announcements : []);
      setAccreditations(Array.isArray(accData?.records) ? accData.records : []);
    });
  }, []);

  const heroHeadline =
    siteSettings.hero_headline || 'Shape Your Future With Quality Education.';
  const heroSubtitle =
    siteSettings.hero_subtitle ||
    'Established in 1994, the National Institute of Engineering & Management (NIEM) delivers structured engineering, management, diploma, and occupational safety programmes designed for learners and working professionals across India.';
  const instituteIntro =
    siteSettings.institute_intro ||
    'Founded in 1994 with its Head Office in New Delhi and Regional Offices in Mysore and Bangalore, the National Institute of Engineering & Management (NIEM) bridges practical industry knowledge with structured academic study.';
  const directorMessage =
    siteSettings.director_message ||
    'Since our founding in 1994, the National Institute of Engineering & Management has been guided by a straightforward commitment: quality technical and management education must remain practical, transparent, and accessible to determined learners.';
  const directorName =
    siteSettings.director_name ||
    'Office of the Director — National Institute of Engineering & Management';

  return (
    <>
      <SeoHead
        title="Home"
        description="National Institute of Engineering & Management (NIEM), established in 1994. Explore academic programmes in engineering, management, diplomas, and international safety training."
      />

      {/* 1. Hero Section */}
      <section className="relative bg-[#061529] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-medium tracking-wider text-[#CFA756] uppercase mb-4">
                National Institute of Engineering &amp; Management · Established 1994
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold leading-[1.12] tracking-tight text-white">
                {heroHeadline}
              </h1>
              <p className="mt-6 text-base text-slate-200 leading-relaxed max-w-xl">
                {heroSubtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/admissions"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#061529] bg-[#CFA756] hover:bg-[#dfb96c] rounded transition-colors whitespace-nowrap"
                >
                  <span>Apply Now</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/courses"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white border border-white/30 hover:border-white hover:bg-white/10 rounded transition-colors whitespace-nowrap"
                >
                  <span>Explore Courses</span>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-center gap-3"
            >
              <div className="relative rounded-md overflow-hidden border border-white/15 bg-white">
                <AcademicImage
                  src={NIEM_MEDIA.campusHero}
                  alt="National Institute of Engineering and Management (NIEM Institute) campus building"
                  priority
                  className="w-full aspect-[3/1] object-cover object-[35%_center]"
                />
                <div className="bg-[#081A33] px-4 py-2.5 border-t border-white/10 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-200 font-medium">
                    NIEM Institute · Nehru Place, New Delhi · Mysore &amp; Bangalore
                  </p>
                  <span className="text-[11px] font-mono text-[#CFA756] shrink-0">Est. 1994</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[3/2] rounded-md overflow-hidden border border-white/15 bg-[#0B2241]">
                  <AcademicImage
                    src={NIEM_MEDIA.classroomPrimary}
                    alt="NIEM Institute classroom learning environment"
                    priority
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061529]/85 via-[#061529]/35 to-transparent px-3 py-2">
                    <p className="text-[11px] text-slate-100 font-medium">Academic Classrooms</p>
                  </div>
                </div>
                <div className="relative aspect-[3/2] rounded-md overflow-hidden border border-white/15 bg-[#0B2241]">
                  <AcademicImage
                    src={NIEM_MEDIA.lectureHall}
                    alt="NIEM Institute lecture hall with projector and seating"
                    priority
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061529]/85 via-[#061529]/35 to-transparent px-3 py-2">
                    <p className="text-[11px] text-slate-100 font-medium">Lecture &amp; Seminar Halls</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Full-Width Operational Strip below hero split */}
        <div className="border-t border-white/10 bg-[#0B2241]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-400">Founded</div>
              <div className="font-serif text-lg font-semibold text-white mt-0.5 tabular-nums">
                1994
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Academic Streams</div>
              <div className="font-serif text-lg font-semibold text-white mt-0.5">
                Engineering, Management &amp; Safety
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Institutional Presence</div>
              <div className="font-serif text-lg font-semibold text-white mt-0.5">
                New Delhi · Mysore · Bangalore
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Student Verification</div>
              <div className="mt-1">
                <a
                  href="#student-verification"
                  className="text-sm font-medium text-[#CFA756] hover:underline inline-flex items-center gap-1"
                >
                  <span>Verify Student ID &amp; Certificate</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1.5. Official Student ID Verification & Certificate Preview */}
      <HomeStudentVerification />

      {/* 2. Institute Introduction */}
      <section className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-3">
              About the Institute
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0B2241] leading-tight">
              Three Decades of Structured Technical &amp; Management Education
            </h2>
            <p className="mt-5 text-base text-slate-700 leading-relaxed">{instituteIntro}</p>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              Our academic framework balances foundational theory with practical workplace
              readiness, serving full-time learners, diploma seekers, and experienced professionals
              upgrading their credentials.
            </p>
            <div className="mt-7 flex flex-wrap gap-6 text-sm font-semibold">
              <Link
                to="/about"
                className="text-[#0B2241] hover:text-[#8F6A24] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Read Institutional History</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/accreditations"
                className="text-slate-600 hover:text-[#0B2241] inline-flex items-center gap-1.5 transition-colors"
              >
                <span>View Recognition Records</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <figure className="space-y-2">
              <div className="aspect-[3/2] rounded overflow-hidden border border-slate-200 bg-slate-50">
                <AcademicImage
                  src={NIEM_MEDIA.classroomPrimary}
                  alt="Structured classroom with desks and instructional boards at NIEM"
                />
              </div>
              <figcaption className="text-xs text-slate-500 font-serif italic">
                Applied Engineering &amp; Technical Classroom
              </figcaption>
            </figure>
            <figure className="space-y-2">
              <div className="aspect-[3/2] rounded overflow-hidden border border-slate-200 bg-slate-50">
                <AcademicImage
                  src={NIEM_MEDIA.lectureHall}
                  alt="Modern lecture hall and management seminar room with projection system"
                />
              </div>
              <figcaption className="text-xs text-slate-500 font-serif italic">
                Management Lecture Hall &amp; Seminar Room
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 3. Academic Programmes */}
      <section className="py-16 lg:py-24 bg-[#F8F9FB] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
                Academic Offerings
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0B2241]">
                Academic Programmes
              </h2>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2241] hover:text-[#8F6A24] whitespace-nowrap"
            >
              <span>Browse All Courses &amp; Filters</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <article
                key={course.id}
                className="bg-white border border-slate-200 rounded-md p-6 flex flex-col justify-between hover:border-[#0B2241]/40 transition-colors"
              >
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mb-2.5">
                    <span className="font-mono text-[#8F6A24] font-medium">{course.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.categoryName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{course.level}</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#0B2241] leading-snug">
                    {course.title}
                  </h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {course.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs font-semibold">
                  <Link
                    to={`/courses?q=${encodeURIComponent(course.code)}`}
                    className="text-slate-700 hover:text-[#0B2241]"
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/admissions?course=${encodeURIComponent(course.title)}`}
                    className="text-[#0B2241] hover:text-[#8F6A24] inline-flex items-center gap-1"
                  >
                    <span>Apply</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Choose NIEM + Admission Process Overview */}
      <section className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-14">
          {/* Why Choose NIEM */}
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
              Institutional Approach
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">Why Choose NIEM</h2>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Structured academic delivery focused on clarity, working-learner flexibility, and
              verifiable administrative support.
            </p>

            <div className="mt-8 divide-y divide-slate-200 border-t border-b border-slate-200">
              {[
                {
                  num: '01.',
                  title: 'Established Academic Heritage Since 1994',
                  body: 'Operating across New Delhi, Mysore, and Bangalore with documented administrative offices and dedicated departmental desks.',
                },
                {
                  num: '02.',
                  title: 'Flexible Study & Examination Pathways',
                  body: 'Designed for working technicians and learners through study-centre support, guided coursework, and confirmed examination procedures.',
                },
                {
                  num: '03.',
                  title: 'Transparent Recognition & Verification Desk',
                  body: 'Clear distinction between institutional memberships, historical references, and official student credential verification.',
                },
                {
                  num: '04.',
                  title: 'Dedicated Career & Safety Outreach Modules',
                  body: 'Interview readiness, workplace communication coaching, and structured occupational safety training enquiries.',
                },
              ].map((item) => (
                <div key={item.num} className="py-5 grid grid-cols-12 gap-4">
                  <div className="col-span-2 font-mono text-sm font-medium text-[#8F6A24]">
                    {item.num}
                  </div>
                  <div className="col-span-10">
                    <h3 className="font-sans text-base font-semibold text-[#0B2241]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Admission Process Overview */}
          <div className="lg:col-span-6 bg-[#F8F9FB] border border-slate-200 rounded-md p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
                Admissions Roadmap
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
                Admission Process Overview
              </h2>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Applicants can submit online admission enquiries with supporting documents and track
                review milestones directly online.
              </p>

              <ol className="mt-8 space-y-6">
                {[
                  {
                    step: 'Step 01 — Programme Selection & Eligibility Check',
                    desc: 'Review academic categories and confirm current intake eligibility with our Admissions Office.',
                  },
                  {
                    step: 'Step 02 — Online Application & Document Upload',
                    desc: 'Complete the validated online form and attach optional academic certificates (PDF/Image).',
                  },
                  {
                    step: 'Step 03 — Administrative Review & Reference Tracking',
                    desc: 'Receive a unique reference number immediately and monitor application status online.',
                  },
                  {
                    step: 'Step 04 — Enrolment Confirmation & Student Portal Access',
                    desc: 'Upon official approval, receive your enrollment number, study centre details, and portal access.',
                  },
                ].map((s) => (
                  <li key={s.step} className="flex items-start gap-3">
                    <CheckCircle2
                      className="w-5 h-5 text-[#8F6A24] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="font-sans text-sm font-semibold text-[#0B2241]">{s.step}</h3>
                      <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-4">
              <Link
                to="/admissions"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors"
              >
                <span>Start Online Application</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/examinations"
                className="text-sm font-semibold text-[#0B2241] hover:text-[#8F6A24]"
              >
                Read Examination Procedure
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Placement Assistance & Accreditation Summary */}
      <section className="py-16 lg:py-24 bg-[#0B2241] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Placement Assistance */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#CFA756] uppercase mb-2">
                Career Development
              </p>
              <h2 className="font-serif text-3xl font-semibold text-white">
                Placement Assistance &amp; Career Guidance
              </h2>
              <p className="mt-4 text-sm text-slate-200 leading-relaxed">
                NIEM supports enrolled learners with structured career counselling, technical
                interview preparation, resume reviews, and workplace communication training. We do
                not publish fabricated placement guarantees or unverified employment percentages.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#CFA756] shrink-0" aria-hidden="true" />
                  <span>Industry-oriented technical &amp; management skill workshops</span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#CFA756] shrink-0" aria-hidden="true" />
                  <span>Structured resume drafting &amp; mock interview coaching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#CFA756] shrink-0" aria-hidden="true" />
                  <span>Professional communication &amp; workplace ethics development</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                to="/placements"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#061529] bg-[#CFA756] hover:bg-[#dfb96c] rounded transition-colors"
              >
                <span>Explore Placement Support</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Accreditation & Recognition Transparency */}
          <div className="lg:col-span-7 bg-[#061529] border border-white/15 rounded-md p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <p className="text-xs font-semibold tracking-wider text-[#CFA756] uppercase">
                  Governance &amp; Disclosures
                </p>
                <h2 className="font-serif text-2xl font-semibold text-white mt-1">
                  Accreditation &amp; Recognition Information
                </h2>
              </div>
              <Link
                to="/accreditations"
                className="text-xs font-semibold text-[#CFA756] hover:underline whitespace-nowrap"
              >
                Full Verification Matrix →
              </Link>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded bg-white/5 border border-white/10 text-xs text-slate-200 mb-5">
              <ShieldAlert className="w-4 h-4 text-[#CFA756] shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Transparency Notice: Recognition references supplied in institutional records are
                labelled with their current administrative verification status and should not be
                assumed independently verified unless supporting documentation is on file.
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {accreditations.map((rec) => (
                <div
                  key={rec.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                >
                  <span className="text-sm font-medium text-white">{rec.bodyName}</span>
                  <span className="text-xs text-[#CFA756] sm:text-right">
                    {formatVerificationStatusLabel(rec.verificationStatus)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5.5. Campus & Institutional Gallery */}
      <section className="py-16 bg-[#F8F9FB] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
                Campus &amp; University Heritage
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
                Institutional &amp; Academic Gallery
              </h2>
            </div>
            <Link
              to="/accreditations"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2241] hover:text-[#8F6A24] whitespace-nowrap"
            >
              <span>View Recognition Records</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NIEM_INSTITUTIONAL_GALLERY.map((item) => (
              <figure
                key={item.src}
                className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col"
              >
                <div className="aspect-[3/2] overflow-hidden bg-slate-100">
                  <AcademicImage
                    src={item.src}
                    alt={item.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
                <figcaption className="p-4 flex-1 flex flex-col justify-between">
                  <div className="font-serif text-sm font-semibold text-[#0B2241]">
                    {item.title}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.caption}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Director's Message & National Inspiration */}
      <section className="py-16 lg:py-24 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#F8F9FB] border border-slate-200 rounded-md p-5 flex items-center gap-4">
              <img
                src={NIEM_MEDIA.logo}
                alt="National Institute of Engineering official emblem"
                className="w-20 h-20 rounded bg-white p-1 object-contain border border-slate-200 shrink-0"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8F6A24]">
                  Official Crest · Est. 1994
                </p>
                <p className="font-serif text-lg font-semibold text-[#0B2241] leading-snug mt-0.5">
                  National Institute of Engineering &amp; Management
                </p>
                <p className="text-xs text-slate-600 mt-0.5 italic font-serif">
                  &ldquo;Knowledge is Future&rdquo;
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <figure className="bg-[#F8F9FB] border border-slate-200 rounded-md overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden bg-white">
                  <AcademicImage
                    src={NIEM_MEDIA.mahatmaGandhi}
                    alt="Mahatma Gandhi — Inspiration of service and education"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs font-medium text-[#0B2241] text-center border-t border-slate-200">
                  Mahatma Gandhi
                </figcaption>
              </figure>
              <figure className="bg-[#F8F9FB] border border-slate-200 rounded-md overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden bg-white">
                  <AcademicImage
                    src={NIEM_MEDIA.indiraGandhi}
                    alt="Smt. Indira Gandhi (1917–1984)"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <figcaption className="px-3 py-2 text-xs font-medium text-[#0B2241] text-center border-t border-slate-200">
                  Smt. Indira Gandhi
                </figcaption>
              </figure>
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-3">
              Leadership Message
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0B2241]">
              Message from the Director
            </h2>
            <blockquote className="mt-6 pt-6 pb-6 border-t border-b border-slate-200">
              <p className="font-serif italic text-xl sm:text-2xl text-slate-800 leading-relaxed">
                &ldquo;{directorMessage}&rdquo;
              </p>
            </blockquote>
            <p className="mt-5 text-sm font-semibold text-[#0B2241]">{directorName}</p>
            <p className="text-xs text-slate-500 mt-1">
              National Institute of Engineering &amp; Management · Nehru Place, New Delhi
            </p>
          </div>
        </div>
      </section>

      {/* 7. Latest Announcements & Student Enquiry */}
      <section id="announcements" className="py-16 lg:py-24 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Latest Announcements */}
          <div className="lg:col-span-6">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
              Official Notices
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-6">
              Latest Announcements
            </h2>

            <div className="space-y-4">
              {announcements.map((item) => (
                <article
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-md p-5"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#8F6A24]" aria-hidden="true" />
                    <span className="font-mono tabular-nums">{item.publishedDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#0B2241]">{item.category}</span>
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-[#0B2241] leading-snug">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                </article>
              ))}
            </div>
          </div>

          {/* Student Enquiry Section */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-slate-200 rounded-md p-7">
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
                Prospective Student Desk
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
                Student Enquiry
              </h2>
              <p className="mt-2 text-sm text-slate-600 mb-6">
                Have questions about academic eligibility, course schedules, or regional offices?
                Send an enquiry directly to our admissions coordinators.
              </p>
              <EnquiryForm defaultType="course" compact />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
