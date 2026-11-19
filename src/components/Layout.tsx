import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ChevronDown, Mail, Menu, Phone, Search, ShieldCheck, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NIEM_CONTACT, NIEM_MEDIA } from '../lib/media';
import { SearchModal } from './SearchModal';

const PRIMARY_NAV = [
  { label: 'About', to: '/about' },
  { label: 'Courses', to: '/courses' },
  { label: 'Admissions', to: '/admissions' },
  { label: 'Examinations', to: '/examinations' },
  { label: 'Contact', to: '/contact' },
];

const ACADEMICS_SUBNAV = [
  { label: 'Accreditations & Recognition', to: '/accreditations' },
  { label: 'Placement Assistance', to: '/placements' },
  { label: 'International Outreach (OSHA)', to: '/international-outreach' },
  { label: 'Results & Student Verification', to: '/results' },
];

export const Layout: React.FC = () => {
  const { user, siteSettings } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const primaryPhone = siteSettings.contact_phone_primary || NIEM_CONTACT.phones[0];
  const primaryEmail = siteSettings.contact_email_info || NIEM_CONTACT.emails.info;

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Top Institutional Information Bar (desktop only to protect mobile sticky budget) */}
      <div className="hidden lg:block bg-[#061529] text-slate-200 border-b border-white/10 text-xs">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5 whitespace-nowrap">
            <span className="text-[#CFA756] font-medium">Established 1994</span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <a
              href={`tel:${primaryPhone.replace(/[^+\d]/g, '')}`}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#CFA756]" aria-hidden="true" />
              <span className="font-mono tabular-nums">{primaryPhone}</span>
            </a>
            <span aria-hidden="true" className="text-white/25">·</span>
            <a
              href={`mailto:${primaryEmail}`}
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-[#CFA756]" aria-hidden="true" />
              <span>{primaryEmail}</span>
            </a>
          </div>
          <div className="flex items-center gap-5 whitespace-nowrap">
            <Link to="/accreditations" className="hover:text-white transition-colors">
              Accreditations
            </Link>
            <Link to="/international-outreach" className="hover:text-white transition-colors">
              International Outreach
            </Link>
            <Link to="/placements" className="hover:text-white transition-colors">
              Placements
            </Link>
            <Link to="/results" className="hover:text-white transition-colors">
              Results &amp; Verification
            </Link>
            <span aria-hidden="true" className="text-white/25">|</span>
            <Link
              to="/portal"
              className="inline-flex items-center gap-1.5 text-white font-medium hover:text-[#CFA756] transition-colors"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{user ? user.fullName.split(' ')[0] : 'Student Portal'}</span>
            </Link>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-[#CFA756] hover:text-white transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Institutional Header — 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark (single clean line) */}
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 group"
            aria-label="National Institute of Engineering and Management Home"
          >
            <img
              src={NIEM_MEDIA.logo}
              alt="National Institute of Engineering official emblem"
              className="w-10 h-10 rounded bg-white p-0.5 object-contain border border-slate-200 shrink-0"
            />
            <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#0B2241]">
              NIEM
            </span>
          </Link>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-700"
          >
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#0B2241] border-[#B68B3A] font-semibold'
                      : 'border-transparent hover:text-[#0B2241] hover:border-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {/* Institutional Directory Dropdown for remaining academic sections */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 py-1 text-slate-700 hover:text-[#0B2241] transition-colors"
              >
                <span>Academics</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {moreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMoreOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-md shadow-lg py-1.5 z-20">
                    {ACADEMICS_SUBNAV.map((sub) => (
                      <Link
                        key={sub.to}
                        to={sub.to}
                        onClick={() => setMoreOpen(false)}
                        className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0B2241]"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Zone 3: Search trigger + 1 Primary Action CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search NIEM"
              className="p-2 text-slate-600 hover:text-[#0B2241] rounded hover:bg-slate-100 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <Link
              to="/admissions"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors whitespace-nowrap shrink-0"
            >
              Apply Now
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              className="lg:hidden p-2 text-slate-700 hover:text-[#0B2241] rounded hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto"
          >
            {[
              { label: 'Home', to: '/' },
              ...PRIMARY_NAV,
              ...ACADEMICS_SUBNAV,
              { label: 'Student Portal', to: '/portal' },
              { label: 'Administration Dashboard', to: '/admin' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 rounded"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 px-3">
              <a href={`tel:${primaryPhone.replace(/[^+\d]/g, '')}`} className="font-mono">
                {primaryPhone}
              </a>
              <a href={`mailto:${primaryEmail}`}>{primaryEmail}</a>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-[#061529] text-slate-300 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={NIEM_MEDIA.logo}
                  alt="National Institute of Engineering official emblem"
                  className="w-11 h-11 rounded bg-white p-0.5 object-contain border border-[#B68B3A]/50 shrink-0"
                />
                <span className="font-serif text-lg font-bold text-white">NIEM</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                National Institute of Engineering &amp; Management — Established in 1994. Advancing
                structured technical, management, and occupational safety education.
              </p>
              <p className="text-xs text-slate-400">
                Official Website:{' '}
                <a
                  href={NIEM_CONTACT.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#CFA756] hover:underline"
                >
                  {NIEM_CONTACT.website}
                </a>
              </p>
            </div>

            <div>
              <h3 className="font-sans text-xs font-semibold tracking-wider text-[#CFA756] uppercase mb-4">
                Academics &amp; Admissions
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About Us (Est. 1994)
                  </Link>
                </li>
                <li>
                  <Link to="/courses" className="hover:text-white transition-colors">
                    Courses Offered
                  </Link>
                </li>
                <li>
                  <Link to="/admissions" className="hover:text-white transition-colors">
                    Admission Process &amp; Apply
                  </Link>
                </li>
                <li>
                  <Link to="/examinations" className="hover:text-white transition-colors">
                    Examination Procedure
                  </Link>
                </li>
                <li>
                  <Link to="/placements" className="hover:text-white transition-colors">
                    Placement Assistance
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-xs font-semibold tracking-wider text-[#CFA756] uppercase mb-4">
                Governance &amp; Services
              </h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/accreditations" className="hover:text-white transition-colors">
                    Accreditations &amp; Recognition
                  </Link>
                </li>
                <li>
                  <Link to="/international-outreach" className="hover:text-white transition-colors">
                    International Outreach (OSHA)
                  </Link>
                </li>
                <li>
                  <Link to="/results" className="hover:text-white transition-colors">
                    Results &amp; Student Verification
                  </Link>
                </li>
                <li>
                  <Link to="/portal" className="hover:text-white transition-colors">
                    Student Portal
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-white transition-colors">
                    Administration Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-sans text-xs font-semibold tracking-wider text-[#CFA756] uppercase mb-4">
                Head Office — New Delhi
              </h3>
              <address className="not-italic text-sm text-slate-300 space-y-2.5">
                <p>
                  H-96 Siddharth Building, No. 807 Nehru Place,
                  <br />
                  New Delhi, 110019.
                </p>
                <p className="font-mono text-xs tabular-nums space-x-3">
                  <a href="tel:01164506504" className="hover:text-white">
                    011-64506504
                  </a>
                  <span aria-hidden="true">·</span>
                  <a href="tel:01122588575" className="hover:text-white">
                    011-22588575
                  </a>
                </p>
                <div className="space-y-1 text-xs">
                  <div>
                    General:{' '}
                    <a href="mailto:info@smnie.in" className="text-[#CFA756] hover:underline">
                      info@smnie.in
                    </a>
                  </div>
                  <div>
                    Examinations:{' '}
                    <a href="mailto:Exam@smnie.in" className="text-[#CFA756] hover:underline">
                      Exam@smnie.in
                    </a>
                  </div>
                  <div>
                    Verification:{' '}
                    <a
                      href="mailto:studentverification@smnie.in"
                      className="text-[#CFA756] hover:underline"
                    >
                      studentverification@smnie.in
                    </a>
                  </div>
                </div>
              </address>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>
              © {new Date().getFullYear()} National Institute of Engineering &amp; Management
              (NIEM). All rights reserved.
            </p>
            <p>
              Regional Offices: Mysore (570024) · Bangalore (560004)
            </p>
          </div>
        </div>
      </footer>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
