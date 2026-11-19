import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Compass, MessageSquare, Users, Wrench } from 'lucide-react';
import { AcademicImage } from '../components/AcademicImage';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { NIEM_MEDIA } from '../lib/media';

export const PlacementsPage: React.FC = () => {
  const pillars = [
    {
      icon: Briefcase,
      title: 'Placement Support & Opportunity Awareness',
      body: 'Guidance on identifying relevant engineering, technical supervision, and administrative roles aligned with each student’s academic track and prior experience.',
    },
    {
      icon: Compass,
      title: 'Structured Career Guidance',
      body: 'Individual and group career counselling sessions helping learners map realistic progression paths across core manufacturing, infrastructure, safety, and management functions.',
    },
    {
      icon: Wrench,
      title: 'Industry-Oriented Training',
      body: 'Practical alignment of coursework concepts with industrial documentation, quality standards, project coordination, and workplace safety protocols.',
    },
    {
      icon: Users,
      title: 'Interview Preparation & Resume Review',
      body: 'Structured technical and behavioural mock interviews, portfolio refinement, and concise curriculum vitae preparation tailored to hiring managers.',
    },
    {
      icon: MessageSquare,
      title: 'Communication Skills Development',
      body: 'Focused coaching in professional written correspondence, engineering project briefings, team collaboration, and clear spoken communication.',
    },
  ];

  return (
    <>
      <SeoHead
        title="Placement Assistance"
        description="NIEM Placement Assistance & Career Guidance: career counselling, industry-oriented training, interview preparation, and professional communication skills development."
      />
      <PageHeader
        breadcrumb="Placement Assistance"
        title="Placement Assistance & Career Readiness"
        subtitle="Practical career guidance, interview preparation, and workplace communication support designed to strengthen student employability."
      />

      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase">
              Honest Career Support
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
              Preparing Graduates for Real Workplace Expectations
            </h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              NIEM provides structured placement assistance and professional development support to
              enrolled learners. Employment outcomes depend on each candidate&apos;s academic effort,
              prior technical skills, and market demand; accordingly, NIEM does not publish
              guaranteed employment promises or unverified placement percentages.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Our focus is equipping students with clear technical fundamentals, articulate
              communication, and disciplined interview readiness so they compete effectively on
              merit.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors"
              >
                <span>Explore Programmes</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#0B2241] border border-[#0B2241] hover:bg-slate-50 rounded transition-colors"
              >
                <span>Connect with Career Desk</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="aspect-[3/2] rounded overflow-hidden border border-slate-200">
              <AcademicImage
                src={NIEM_MEDIA.classroomPrimary}
                alt="NIEM Institute classroom and professional training environment"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-2">
              Career Development Services
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[#0B2241]">
              Five Pillars of Professional Preparation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pillars.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="bg-white border border-slate-200 rounded-md p-6"
                >
                  <Icon className="w-5 h-5 text-[#8F6A24] mb-3.5" aria-hidden="true" />
                  <h3 className="font-serif text-xl font-semibold text-[#0B2241] mb-2.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};
