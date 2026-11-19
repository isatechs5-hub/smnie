import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, HardHat, ShieldCheck, Truck, Warehouse } from 'lucide-react';
import { AcademicImage } from '../components/AcademicImage';
import { EnquiryForm } from '../components/EnquiryForm';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { NIEM_MEDIA } from '../lib/media';

const SAFETY_MODULES = [
  {
    icon: HardHat,
    title: 'Construction Safety Outreach',
    code: 'NIEM-OSH-601',
    summary:
      'Focus Four hazard awareness, fall protection systems, excavation and trenching controls, scaffolding inspection, and electrical safety on construction sites.',
  },
  {
    icon: Warehouse,
    title: 'General Industry Safety',
    code: 'NIEM-OSH-602',
    summary:
      'Walking and working surfaces, machine guarding, hazard communication, emergency evacuation readiness, and personal protective equipment in industrial plants.',
  },
  {
    icon: Truck,
    title: 'Forklift & Heavy Equipment Safety',
    code: 'NIEM-OSH-603',
    summary:
      'Powered industrial truck stability principles, pre-operation inspection checklists, load handling protocols, and pedestrian traffic segregation.',
  },
  {
    icon: ShieldCheck,
    title: 'Confined Space Safety',
    code: 'NIEM-OSH-604',
    summary:
      'Permit-required confined space entry procedures, atmospheric testing, ventilation practices, attendant responsibilities, and emergency rescue coordination.',
  },
];

export const OutreachPage: React.FC = () => {
  return (
    <>
      <SeoHead
        title="International Outreach & Safety Training"
        description="Explore NIEM International Outreach occupational safety training enquiries covering Construction Safety, General Industry Safety, Forklift & Heavy Equipment, and Confined Space Safety."
      />
      <PageHeader
        breadcrumb="International Outreach"
        title="International Outreach & Occupational Safety Training"
        subtitle="Structured online safety orientation modules for construction, general industry, heavy equipment, and confined space workplace environments."
      />

      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Mandatory OSHA Authorization Disclosure */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-md p-5 mb-10 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-amber-950 space-y-1">
              <p className="font-semibold">Provider Authorization &amp; Certification Notice</p>
              <p className="leading-relaxed">
                OSHA Outreach Training references on this page represent institutional safety
                training enquiries and orientation curricula. NIEM does not claim official U.S.
                Department of Labor / OSHA authorized provider status or DOL card issuance unless
                specifically verified in writing with current authorized training partner
                documentation prior to enrolment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-14">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase">
                Occupational Safety Curriculum
              </p>
              <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
                Online Safety Training &amp; Global Workplace Readiness
              </h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                Designed for site supervisors, safety coordinators, engineering technicians, and
                industrial operations personnel, our online safety training modules cover practical
                hazard identification, safe operating procedures, and compliance documentation
                concepts.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Online training schedules, instructor credentials, and applicable certificate
                issuance scope are confirmed directly in response to each training enquiry.
              </p>
              <div className="pt-2">
                <Link
                  to="/courses?category=osha-safety"
                  className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors"
                >
                  View Safety Courses in Catalogue
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="aspect-[3/2] rounded overflow-hidden border border-slate-200">
                <AcademicImage
                  src={NIEM_MEDIA.lectureHall}
                  alt="NIEM Institute lecture hall and online safety training presentation room"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SAFETY_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <article
                  key={mod.code}
                  className="border border-slate-200 rounded-md p-6 bg-white flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <Icon className="w-5 h-5 text-[#8F6A24]" aria-hidden="true" />
                      <span className="font-mono text-xs text-slate-500">{mod.code}</span>
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{mod.summary}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 font-normal">Online Training &amp; Guidance</span>
                    <Link
                      to={`/admissions?course=${encodeURIComponent(mod.title)}`}
                      className="text-[#0B2241] hover:text-[#8F6A24]"
                    >
                      Apply / Enquire →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Training Enquiry Form */}
      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-1.5">
              Outreach Coordination Desk
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241] mb-2">
              International &amp; Safety Training Enquiry
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Request batch schedules, corporate training options, and written verification of
              course provider arrangements before registering.
            </p>
            <EnquiryForm
              defaultType="outreach"
              defaultSubject="Occupational Safety & International Outreach Enquiry"
            />
          </div>
        </div>
      </section>
    </>
  );
};
