import React from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  breadcrumb: string;
  title: string;
  subtitle: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ breadcrumb, title, subtitle }) => {
  return (
    <section className="bg-[#0B2241] text-white border-b border-[#B68B3A]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-300 mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#CFA756]">{breadcrumb}</span>
        </nav>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-white max-w-3xl leading-tight">
          {title}
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      </div>
    </section>
  );
};
