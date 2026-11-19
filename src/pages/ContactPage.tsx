import React from 'react';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { EnquiryForm } from '../components/EnquiryForm';
import { OfficeLocatorMap } from '../components/OfficeLocatorMap';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { NIEM_CONTACT } from '../lib/media';

export const ContactPage: React.FC = () => {
  const { siteSettings } = useAuth();

  const phone1 = siteSettings.contact_phone_primary || NIEM_CONTACT.phones[0];
  const phone2 = siteSettings.contact_phone_secondary || NIEM_CONTACT.phones[1];
  const infoEmail = siteSettings.contact_email_info || NIEM_CONTACT.emails.info;
  const examEmail = siteSettings.contact_email_exam || NIEM_CONTACT.emails.exam;
  const verEmail =
    siteSettings.contact_email_verification || NIEM_CONTACT.emails.verification;

  return (
    <>
      <SeoHead
        title="Contact Us"
        description="Contact National Institute of Engineering & Management (NIEM) — Head Office in Nehru Place New Delhi, Regional Offices in Mysore and Bangalore, email desks, and interactive map."
      />
      <PageHeader
        breadcrumb="Contact Us"
        title="Contact NIEM Offices & Departmental Desks"
        subtitle="Reach our Head Office in New Delhi or Regional Offices in Mysore and Bangalore for admissions, examinations, and student verification."
      />

      {/* Office Information Cards */}
      <section className="py-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {NIEM_CONTACT.offices.map((office) => (
              <article
                key={office.id}
                className="border border-slate-200 rounded-md p-6 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-3">
                    <span className="font-semibold text-[#8F6A24] uppercase tracking-wider">
                      {office.role}
                    </span>
                    <span>{office.city}</span>
                  </div>
                  <h2 className="font-serif text-xl font-semibold text-[#0B2241] mb-3">
                    {office.title}
                  </h2>
                  <address className="not-italic text-sm text-slate-600 leading-relaxed flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#8F6A24] shrink-0 mt-1" aria-hidden="true" />
                    <span>
                      {office.addressLines.map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < office.addressLines.length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </span>
                  </address>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-mono text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-[#8F6A24] shrink-0" aria-hidden="true" />
                    {office.phones.map((p, idx) => (
                      <React.Fragment key={p}>
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <a href={`tel:${p.replace(/[^+\d]/g, '')}`} className="hover:text-[#0B2241] hover:underline">
                          {p}
                        </a>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail className="w-3.5 h-3.5 text-[#8F6A24] shrink-0" aria-hidden="true" />
                    <a href={`mailto:${office.email}`} className="hover:text-[#0B2241] underline">
                      {office.email}
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Direct Departmental Directory */}
          <div className="bg-[#F8F9FB] border border-slate-200 rounded-md p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-sm">
            <div>
              <span className="text-xs text-slate-500 block mb-1">General Information</span>
              <a href={`mailto:${infoEmail}`} className="font-semibold text-[#0B2241] hover:underline">
                {infoEmail}
              </a>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Examination Desk</span>
              <a href={`mailto:${examEmail}`} className="font-semibold text-[#0B2241] hover:underline">
                {examEmail}
              </a>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Student Verification</span>
              <a
                href={`mailto:${verEmail}`}
                className="font-semibold text-[#0B2241] hover:underline break-all"
              >
                {verEmail}
              </a>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Telephone Lines</span>
              <div className="font-mono text-xs space-y-1">
                <div>
                  <a href={`tel:${phone1.replace(/[^+\d]/g, '')}`} className="text-[#0B2241] font-semibold hover:underline">
                    {phone1}
                  </a>
                </div>
                <div>
                  <a href={`tel:${phone2.replace(/[^+\d]/g, '')}`} className="text-[#0B2241] font-semibold hover:underline">
                    {phone2}
                  </a>
                </div>
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Official Website</span>
              <a
                href={NIEM_CONTACT.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-[#0B2241] hover:underline"
              >
                <Globe className="w-3.5 h-3.5 text-[#8F6A24]" aria-hidden="true" />
                <span>{NIEM_CONTACT.website}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Google Maps & Contact Form */}
      <section className="py-16 bg-[#F8F9FB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-1">
                Office Locator
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B2241]">
                Head &amp; Regional Office Map
              </h2>
            </div>
            <OfficeLocatorMap />
          </div>

          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-wider text-[#8F6A24] uppercase mb-1">
              Direct Correspondence
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B2241] mb-2">
              Send Us a Message
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Select the relevant department below. Every submission is recorded in the NIEM
              administrative database with an immediate reference code.
            </p>
            <EnquiryForm defaultType="general" />
          </div>
        </div>
      </section>
    </>
  );
};
