import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, GraduationCap, Search, X } from 'lucide-react';
import { EnquiryForm } from '../components/EnquiryForm';
import { PageHeader } from '../components/PageHeader';
import { SeoHead } from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { filterCourses } from '../utils/validation';

interface CategoryItem {
  id: number;
  slug: string;
  name: string;
  description: string;
}

interface CourseItem {
  id: number;
  slug: string;
  code: string;
  title: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  level: string;
  duration: string;
  learningMode: string;
  eligibility: string;
  feesNote: string;
  summary: string;
  curriculumOutline: string;
}

export const CoursesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedLevel, setSelectedLevel] = useState('all');

  const [activeCourse, setActiveCourse] = useState<CourseItem | null>(null);
  const [enquiryCourse, setEnquiryCourse] = useState<CourseItem | null>(null);

  useEffect(() => {
    apiFetch<{ categories: CategoryItem[]; courses: CourseItem[] }>('/api/courses')
      .then((data) => {
        setCategories(data.categories || []);
        setCourses(data.courses || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const levels = useMemo(() => {
    const set = new Set(courses.map((c) => c.level));
    return ['all', ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(
    () =>
      filterCourses(courses, {
        query,
        categorySlug: selectedCategory,
        level: selectedLevel,
      }),
    [courses, query, selectedCategory, selectedLevel]
  );

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    const next = new URLSearchParams(searchParams);
    if (slug === 'all') next.delete('category');
    else next.set('category', slug);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <SeoHead
        title="Courses Offered"
        description="Explore NIEM academic programmes across Engineering, Management, Diploma, Undergraduate, Postgraduate, Certificate, Professional Training, and OSHA Safety categories."
      />
      <PageHeader
        breadcrumb="Courses Offered"
        title="Academic Courses & Professional Programmes"
        subtitle="Discover structured programmes across Engineering, Management, Diploma, Undergraduate, Postgraduate, Certificate, Professional Training, and Occupational Safety streams."
      />

      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Search & Filter Controls */}
          <div className="bg-[#F8F9FB] border border-slate-200 rounded-md p-5 space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 relative">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <label htmlFor="course-search" className="sr-only">
                  Search courses by title, code, or keyword
                </label>
                <input
                  id="course-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by programme title, code (e.g. NIEM-ENG), or topic..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="level-filter" className="sr-only">
                  Filter by academic level
                </label>
                <select
                  id="level-filter"
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded focus:border-[#0B2241] focus:outline-none"
                >
                  {levels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl === 'all' ? 'All Academic Levels' : lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 text-right text-xs text-slate-600 font-mono tabular-nums">
                {filteredCourses.length} programme{filteredCourses.length === 1 ? '' : 's'}
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div
              className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200"
              role="group"
              aria-label="Filter courses by category"
            >
              <button
                type="button"
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#0B2241] text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0B2241]'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === cat.slug
                      ? 'bg-[#0B2241] text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-[#0B2241]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Transparency Note regarding Fees & Eligibility */}
          <p className="text-xs text-slate-500 mb-6">
            Note: Specific intake fees, session dates, and formal eligibility requirements are
            maintained by the Academic Admissions Office and configurable through the Administration
            Dashboard. Please request the official prospectus before remitting fees.
          </p>

          {loading && (
            <div className="py-16 text-center text-sm text-slate-500">
              Loading course catalogue...
            </div>
          )}

          {error && (
            <div role="alert" className="p-4 bg-red-50 border border-red-200 text-sm text-red-800 rounded">
              {error}
            </div>
          )}

          {!loading && !error && filteredCourses.length === 0 && (
            <div className="border border-slate-200 rounded-md p-10 text-center">
              <p className="font-serif text-xl text-[#0B2241]">No matching programmes found</p>
              <p className="text-sm text-slate-600 mt-2">
                Try clearing your search keyword or selecting &ldquo;All Categories&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                  setSelectedLevel('all');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-[#0B2241] rounded"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Course Cards Grid */}
          {!loading && !error && filteredCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <article
                  key={course.id}
                  className="border border-slate-200 rounded-md p-6 bg-white flex flex-col justify-between hover:border-[#0B2241]/50 transition-colors"
                >
                  <div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mb-2.5">
                      <span className="font-mono font-medium text-[#8F6A24]">{course.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.categoryName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{course.level}</span>
                    </div>

                    <h2 className="font-serif text-xl font-semibold text-[#0B2241] leading-snug">
                      {course.title}
                    </h2>

                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{course.summary}</p>

                    <dl className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#8F6A24] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          <strong className="text-slate-800">Duration:</strong> {course.duration}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#8F6A24] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>
                          <strong className="text-slate-800">Mode:</strong> {course.learningMode}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <GraduationCap
                          className="w-3.5 h-3.5 text-[#8F6A24] shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="text-slate-800">Eligibility:</strong>{' '}
                          {course.eligibility}
                        </span>
                      </div>
                    </dl>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setActiveCourse(course)}
                        className="text-slate-700 hover:text-[#0B2241] underline underline-offset-2"
                      >
                        Syllabus &amp; Details
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnquiryCourse(course)}
                        className="text-[#8F6A24] hover:text-[#0B2241]"
                      >
                        Enquire
                      </button>
                    </div>

                    <Link
                      to={`/admissions?courseId=${course.id}&course=${encodeURIComponent(
                        course.title
                      )}`}
                      className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded transition-colors whitespace-nowrap"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Course Details Modal */}
      {activeCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Programme details for ${activeCourse.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#061529]/60 p-4"
          onClick={() => setActiveCourse(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mb-1">
                  <span className="font-mono text-[#8F6A24]">{activeCourse.code}</span>
                  <span>·</span>
                  <span>{activeCourse.categoryName}</span>
                  <span>·</span>
                  <span>{activeCourse.level}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#0B2241]">
                  {activeCourse.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                aria-label="Close course details"
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm text-slate-700">
              <p className="leading-relaxed">{activeCourse.summary}</p>

              <dl className="grid sm:grid-cols-2 gap-4 bg-[#F8F9FB] border border-slate-200 rounded p-4 text-xs">
                <div>
                  <dt className="font-semibold text-[#0B2241] mb-1">Duration</dt>
                  <dd className="text-slate-600">{activeCourse.duration}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#0B2241] mb-1">Learning Mode</dt>
                  <dd className="text-slate-600">{activeCourse.learningMode}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#0B2241] mb-1">Eligibility Criteria</dt>
                  <dd className="text-slate-600">{activeCourse.eligibility}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#0B2241] mb-1">Fee Structure</dt>
                  <dd className="text-slate-600">{activeCourse.feesNote}</dd>
                </div>
              </dl>

              <div>
                <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#0B2241] mb-2">
                  Indicative Curriculum Outline
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  {activeCourse.curriculumOutline
                    .split(';')
                    .map((m) => m.trim())
                    .filter(Boolean)
                    .map((mod, idx) => (
                      <li key={idx}>{mod}</li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="mt-7 pt-5 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = activeCourse;
                  setActiveCourse(null);
                  setEnquiryCourse(target);
                }}
                className="px-4 py-2 text-sm font-semibold text-[#0B2241] border border-[#0B2241] rounded hover:bg-slate-50"
              >
                Course Enquiry
              </button>
              <Link
                to={`/admissions?courseId=${activeCourse.id}&course=${encodeURIComponent(
                  activeCourse.title
                )}`}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0B2241] hover:bg-[#13315B] rounded"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Course Enquiry Modal */}
      {enquiryCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Enquire about ${enquiryCourse.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#061529]/60 p-4"
          onClick={() => setEnquiryCourse(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
              <div>
                <p className="text-xs font-mono text-[#8F6A24]">{enquiryCourse.code}</p>
                <h2 className="font-serif text-2xl font-semibold text-[#0B2241]">
                  Course Enquiry: {enquiryCourse.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEnquiryCourse(null)}
                aria-label="Close course enquiry dialog"
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <EnquiryForm
              defaultType="course"
              defaultSubject={`Course Enquiry: ${enquiryCourse.title}`}
              defaultCourseName={enquiryCourse.title}
              compact
            />
          </div>
        </div>
      )}
    </>
  );
};
