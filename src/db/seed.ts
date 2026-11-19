import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { ensureHostzenSchema } from './hostzen.ts';
import {
  accreditationRecords,
  announcements,
  applications,
  courseCategories,
  courses,
  enquiries,
  examinationResults,
  roles,
  siteSettings,
  students,
  users,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;
let seeded = false;

export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  if (!seedPromise) {
    seedPromise = runSeed()
      .then(() => {
        seeded = true;
      })
      .catch((err) => {
        seedPromise = null;
        throw err;
      });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  // 0. Ensure Hostzens project schema tables exist
  await ensureHostzenSchema();

  // 1. Seed Roles
  const roleSeeds = [
    { name: 'admin', description: 'Institutional Administrator with full governance access' },
    { name: 'staff', description: 'Academic & Admissions Coordinator' },
    { name: 'student', description: 'Enrolled or Prospective NIEM Student' },
  ];

  for (const r of roleSeeds) {
    await db.insert(roles).values(r).onConflictDoNothing({ target: roles.name });
  }

  const allRoles = await db.select().from(roles);
  const roleByName: Record<string, number> = {};
  for (const r of allRoles) {
    roleByName[r.name] = r.id;
  }

  // 2. Seed Sample Public Student Account (Admin accounts are strictly isolated in admin_users)
  const studentPasswordHash = await bcrypt.hash('NiemStudent@2026', 10);

  await db
    .insert(users)
    .values({
      email: 'student@smnie.in',
      passwordHash: studentPasswordHash,
      fullName: 'Rohan Verma',
      roleId: roleByName.student,
      isActive: true,
    })
    .onConflictDoNothing({ target: users.email });

  const [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, 'student@smnie.in'));

  // 3. Seed Course Categories
  const categorySeeds = [
    {
      slug: 'engineering',
      name: 'Engineering',
      description: 'Applied engineering disciplines designed for technical professionals and aspiring engineers.',
      sortOrder: 1,
    },
    {
      slug: 'management',
      name: 'Management',
      description: 'Structured management and organizational administration programmes for working learners.',
      sortOrder: 2,
    },
    {
      slug: 'diploma',
      name: 'Diploma Programmes',
      description: 'Career-oriented technical and operational diploma curricula across industrial domains.',
      sortOrder: 3,
    },
    {
      slug: 'undergraduate',
      name: 'Undergraduate Programmes',
      description: 'Foundational academic tracks in engineering sciences and business administration.',
      sortOrder: 4,
    },
    {
      slug: 'postgraduate',
      name: 'Postgraduate Programmes',
      description: 'Advanced leadership, operations, and applied engineering specializations.',
      sortOrder: 5,
    },
    {
      slug: 'certificate',
      name: 'Certificate Programmes',
      description: 'Focused short-term academic certificates for targeted workplace competency.',
      sortOrder: 6,
    },
    {
      slug: 'professional-training',
      name: 'Professional Training',
      description: 'Continuing professional development modules tailored to industry standards.',
      sortOrder: 7,
    },
    {
      slug: 'osha-safety',
      name: 'OSHA Safety Training',
      description: 'International occupational safety outreach orientation and workplace hazard modules.',
      sortOrder: 8,
    },
  ];

  for (const cat of categorySeeds) {
    await db
      .insert(courseCategories)
      .values(cat)
      .onConflictDoNothing({ target: courseCategories.slug });
  }

  const allCategories = await db.select().from(courseCategories);
  const catBySlug: Record<string, number> = {};
  for (const c of allCategories) {
    catBySlug[c.slug] = c.id;
  }

  // 4. Seed Courses (no fabricated fees or unconfirmed eligibility claims)
  const configurableEligibility =
    'Configurable per current intake guidelines — contact Admissions Office (info@smnie.in) for verified eligibility criteria.';
  const configurableFee =
    'Fee schedule available on official prospectus request and configurable via the Administration Dashboard.';

  const courseSeeds = [
    {
      slug: 'diploma-mechanical-engineering',
      code: 'NIEM-ENG-101',
      title: 'Diploma in Mechanical Engineering',
      categoryId: catBySlug['engineering'],
      level: 'Diploma',
      duration: 'Structured multi-semester track (confirm current duration with Admissions)',
      learningMode: 'Guided Self-Study / Study Centre & Online Support',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Core mechanical engineering foundations spanning engineering mechanics, manufacturing processes, thermodynamics, and industrial maintenance.',
      curriculumOutline:
        'Engineering Drawing & Materials; Applied Mechanics; Manufacturing Technology; Thermal Engineering; Industrial Maintenance & Quality Control.',
    },
    {
      slug: 'diploma-civil-engineering',
      code: 'NIEM-ENG-102',
      title: 'Diploma in Civil Engineering',
      categoryId: catBySlug['engineering'],
      level: 'Diploma',
      duration: 'Structured multi-semester track (confirm current duration with Admissions)',
      learningMode: 'Guided Self-Study / Study Centre & Online Support',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Structural drafting, surveying fundamentals, construction materials, and site project supervision for civil infrastructure roles.',
      curriculumOutline:
        'Surveying & Levelling; Building Materials & Construction; Structural Mechanics; Concrete Technology; Estimating & Site Management.',
    },
    {
      slug: 'diploma-electrical-engineering',
      code: 'NIEM-ENG-103',
      title: 'Diploma in Electrical Engineering',
      categoryId: catBySlug['diploma'],
      level: 'Diploma',
      duration: 'Structured multi-semester track (confirm current duration with Admissions)',
      learningMode: 'Guided Self-Study / Study Centre Support',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Electrical circuits, power distribution, electrical machines, and industrial instrumentation practices.',
      curriculumOutline:
        'Electrical Circuit Theory; Electrical Machines; Power Generation & Distribution; Switchgear & Protection; Industrial Instrumentation.',
    },
    {
      slug: 'ug-applied-engineering-studies',
      code: 'NIEM-UG-201',
      title: 'Undergraduate Programme in Applied Engineering Studies',
      categoryId: catBySlug['undergraduate'],
      level: 'Undergraduate',
      duration: 'Multi-year academic schedule (confirm exact structure with Admissions)',
      learningMode: 'Flexible Academic Study & Supervised Examinations',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Comprehensive undergraduate engineering curriculum emphasizing applied problem-solving, systems design, and project execution.',
      curriculumOutline:
        'Engineering Mathematics; Applied Sciences; Core Discipline Electives; Systems Engineering; Technical Project & Viva.',
    },
    {
      slug: 'ug-business-management',
      code: 'NIEM-UG-202',
      title: 'Undergraduate Programme in Business Administration',
      categoryId: catBySlug['undergraduate'],
      level: 'Undergraduate',
      duration: 'Multi-year academic schedule (confirm exact structure with Admissions)',
      learningMode: 'Flexible Academic Study / Online & Study Centre',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Foundational studies in organizational management, accounting principles, business economics, and commercial operations.',
      curriculumOutline:
        'Principles of Management; Financial Accounting; Managerial Economics; Business Communication; Operations & Organizational Behaviour.',
    },
    {
      slug: 'pg-business-management',
      code: 'NIEM-PG-301',
      title: 'Postgraduate Programme in Management Studies',
      categoryId: catBySlug['management'],
      level: 'Postgraduate',
      duration: 'Postgraduate term structure (confirm schedule with Admissions)',
      learningMode: 'Executive Guided Study & Study Centre Evaluation',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Graduate-level management studies covering strategic planning, human resource administration, corporate finance, and operations.',
      curriculumOutline:
        'Strategic Management; Financial Management; Human Resource Systems; Supply Chain & Operations; Applied Research Dissertation.',
    },
    {
      slug: 'pg-project-operations-management',
      code: 'NIEM-PG-302',
      title: 'Postgraduate Programme in Industrial & Project Management',
      categoryId: catBySlug['postgraduate'],
      level: 'Postgraduate',
      duration: 'Postgraduate term structure (confirm schedule with Admissions)',
      learningMode: 'Executive Guided Study & Online Mentorship',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Project lifecycle planning, engineering economics, procurement governance, and quality assurance for technical managers.',
      curriculumOutline:
        'Project Planning & Scheduling; Risk & Contract Administration; Total Quality Management; Industrial Economics; Capstone Case Study.',
    },
    {
      slug: 'certificate-quality-management',
      code: 'NIEM-CRT-401',
      title: 'Certificate in Industrial Quality & Process Management',
      categoryId: catBySlug['certificate'],
      level: 'Certificate',
      duration: 'Short-term modular schedule (confirm intake dates)',
      learningMode: 'Online & Guided Assessment',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Practical introduction to quality management systems, documentation standards, internal audit workflows, and continuous improvement.',
      curriculumOutline:
        'Quality System Fundamentals; Process Documentation; Root Cause Analysis; Internal Audit Preparedness.',
    },
    {
      slug: 'professional-communication-leadership',
      code: 'NIEM-PRO-501',
      title: 'Professional Development in Workplace Communication & Leadership',
      categoryId: catBySlug['professional-training'],
      level: 'Professional Training',
      duration: 'Modular workshop schedule (confirm intake dates)',
      learningMode: 'Online Workshops & Career Coaching',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Structured training in executive correspondence, technical reporting, interview readiness, and cross-functional team leadership.',
      curriculumOutline:
        'Technical & Business Writing; Presentation & Briefing Practice; Structured Interview Readiness; Workplace Ethics & Teamwork.',
    },
    {
      slug: 'osha-construction-safety-outreach',
      code: 'NIEM-OSH-601',
      title: 'Construction Safety Outreach Orientation',
      categoryId: catBySlug['osha-safety'],
      level: 'Safety Outreach',
      duration: 'Modular outreach curriculum (confirm batch hours with Outreach Desk)',
      learningMode: 'Online Training & Guided Case Exercises',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Hazard recognition, fall protection, scaffolding inspection, excavation precautions, and personal protective equipment for construction sites. Independent OSHA provider authorization status is subject to formal verification.',
      curriculumOutline:
        'Focus Four Construction Hazards; Fall Protection Systems; Electrical & Trenching Safety; Scaffolding & Site Housekeeping.',
    },
    {
      slug: 'osha-general-industry-safety',
      code: 'NIEM-OSH-602',
      title: 'General Industry Safety Outreach Orientation',
      categoryId: catBySlug['osha-safety'],
      level: 'Safety Outreach',
      duration: 'Modular outreach curriculum (confirm batch hours with Outreach Desk)',
      learningMode: 'Online Training & Guided Case Exercises',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Workplace safety fundamentals for manufacturing, warehousing, and facility operations including machine guarding and hazard communication.',
      curriculumOutline:
        'Walking & Working Surfaces; Emergency Action Plans; Machine Guarding; Hazard Communication & Ergonomics.',
    },
    {
      slug: 'osha-forklift-heavy-equipment',
      code: 'NIEM-OSH-603',
      title: 'Forklift & Heavy Equipment Safety Training',
      categoryId: catBySlug['osha-safety'],
      level: 'Safety Outreach',
      duration: 'Modular safety curriculum (confirm batch schedule with Outreach Desk)',
      learningMode: 'Online Instruction & Practical Safety Assessment',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Safe operation principles, load stability, pre-shift inspection checklists, and pedestrian traffic controls for powered industrial trucks and heavy plant.',
      curriculumOutline:
        'Equipment Inspection Protocols; Stability Triangle & Load Handling; Worksite Traffic Management; Incident Prevention.',
    },
    {
      slug: 'osha-confined-space-safety',
      code: 'NIEM-OSH-604',
      title: 'Confined Space Entry & Safety Training',
      categoryId: catBySlug['osha-safety'],
      level: 'Safety Outreach',
      duration: 'Modular safety curriculum (confirm batch schedule with Outreach Desk)',
      learningMode: 'Online Instruction & Procedural Drills',
      eligibility: configurableEligibility,
      feesNote: configurableFee,
      summary:
        'Atmospheric hazard identification, permit-required confined space procedures, attendant duties, ventilation, and emergency rescue planning.',
      curriculumOutline:
        'Permit-Required Space Classification; Gas Monitoring & Ventilation; Attendant & Entrant Responsibilities; Rescue Preparedness.',
    },
  ];

  for (const course of courseSeeds) {
    await db
      .insert(courses)
      .values(course)
      .onConflictDoNothing({ target: courses.slug });
  }

  const allCourses = await db.select().from(courses);
  const courseBySlug: Record<string, number> = {};
  for (const c of allCourses) {
    courseBySlug[c.slug] = c.id;
  }

  // 5. Seed Accreditation & Recognition Records (Honest, transparently labelled, admin-editable)
  const accreditationSeeds = [
    {
      code: 'INST-REG-1994',
      bodyName: 'Institutional Registration Details (Est. 1994)',
      shortTitle: 'Institutional Establishment & Registration',
      category: 'Institutional Registration',
      description:
        'National Institute of Engineering & Management (NIEM) references establishment in 1994 in the supplied institutional record, operating from its Head Office at Nehru Place, New Delhi with regional offices in Mysore and Bangalore.',
      verificationStatus: 'pending_verification',
      verificationNote:
        'Supplied institutional historical record. Official statutory registration certificates and governing body filings should be reviewed directly with the Admissions Office before relying on any credential.',
      sortOrder: 1,
    },
    {
      code: 'ISTE-DELHI',
      bodyName: 'Indian Society for Technical Education (ISTE), New Delhi',
      shortTitle: 'ISTE Delhi Membership Reference',
      category: 'Professional Society Reference',
      description:
        'Institutional source materials reference association/membership with the Indian Society for Technical Education (ISTE), New Delhi, a national professional body for technical educators.',
      verificationStatus: 'pending_verification',
      verificationNote:
        'Professional society membership is distinct from statutory university or degree-awarding approval. Current membership status and certificate number are pending independent documentation upload by administration.',
      sortOrder: 2,
    },
    {
      code: 'IGNOU-COLLAB',
      bodyName: 'IGNOU Collaboration References',
      shortTitle: 'IGNOU Collaboration Reference',
      category: 'Academic Collaboration Reference',
      description:
        'Supplied institutional records contain references to collaboration/study-support alignment with Indira Gandhi National Open University (IGNOU) initiatives.',
      verificationStatus: 'reference_only',
      verificationNote:
        'Displayed strictly as a historical reference from supplied materials. Prospective students must verify current active collaboration or study-centre authorization directly through official IGNOU registries.',
      sortOrder: 3,
    },
    {
      code: 'AIMS-MEMBERSHIP',
      bodyName: 'Association of Indian Management Schools (AIMS)',
      shortTitle: 'AIMS Membership Reference',
      category: 'Management Association Reference',
      description:
        'Institutional records reference membership with the Association of Indian Management Schools (AIMS) for management education dialogue and networking.',
      verificationStatus: 'pending_verification',
      verificationNote:
        'Association membership does not constitute statutory degree accreditation. Active membership documentation can be updated and verified through the NIEM Administration Dashboard.',
      sortOrder: 4,
    },
    {
      code: 'UKAS-INFO',
      bodyName: 'UKAS (United Kingdom Accreditation Service) Information',
      shortTitle: 'UKAS Quality Management Reference',
      category: 'Quality Management System Reference',
      description:
        'Supplied institutional materials reference UKAS-related quality management certification context (typically associated with ISO quality management auditing bodies).',
      verificationStatus: 'pending_verification',
      verificationNote:
        'UKAS accredits certification bodies rather than directly awarding academic degrees. Certificate scope, issuer details, and current validity require supporting documentation on file.',
      sortOrder: 5,
    },
    {
      code: 'ANAB-INFO',
      bodyName: 'ANAB (ANSI National Accreditation Board) Information',
      shortTitle: 'ANAB Quality Standard Reference',
      category: 'Quality Management System Reference',
      description:
        'Supplied institutional materials reference ANAB quality system recognition context for administrative and training processes.',
      verificationStatus: 'pending_verification',
      verificationNote:
        'ANAB accredits conformity assessment bodies and is not a statutory Indian university regulator. Independent verification of current certificate validity is pending administrative upload.',
      sortOrder: 6,
    },
  ];

  for (const acc of accreditationSeeds) {
    await db
      .insert(accreditationRecords)
      .values(acc)
      .onConflictDoNothing({ target: accreditationRecords.code });
  }

  // 6. Seed Announcements
  const announcementSeeds = [
    {
      slug: 'admissions-enquiry-window-2026',
      title: 'Online Admission Enquiries Open for 2026 Academic Intake',
      category: 'Admissions',
      summary:
        'Prospective students may submit online admission applications and supporting academic documents through the NIEM Admissions Portal.',
      content:
        'The Admissions Office at Nehru Place, New Delhi, along with our Mysore and Bangalore Regional Offices, is accepting online admission enquiries for Engineering, Management, Diploma, and Certificate programmes. Applicants receive an immediate tracking reference number upon submission.',
      publishedDate: '2026-10-15',
      isPublished: true,
      isPinned: true,
    },
    {
      slug: 'examination-guidelines-update-2026',
      title: 'Examination Guidelines: Home, Open-Book & Study Centre Schedules',
      category: 'Examinations',
      summary:
        'Students are advised to verify their confirmed examination mode and centre allocation with the Examination Desk (Exam@smnie.in) prior to each cycle.',
      content:
        'Examination arrangements — including examination at home, open-book evaluation, study centre sittings, and re-examination applications — are subject to official confirmation by the Examination Controller for each specific programme and session. Please contact Exam@smnie.in with your enrollment number for verified schedules.',
      publishedDate: '2026-10-28',
      isPublished: true,
      isPinned: true,
    },
    {
      slug: 'student-verification-desk-notice',
      title: 'Official Student Credential Verification Procedure',
      category: 'Academic Notice',
      summary:
        'Employers and academic institutions can submit formal student verification requests online or via studentverification@smnie.in.',
      content:
        'To safeguard student privacy, detailed personal academic records are never publicly exposed. Employers and external bodies may verify enrollment standing online using the Student Verification portal or by writing to studentverification@smnie.in.',
      publishedDate: '2026-11-05',
      isPublished: true,
      isPinned: false,
    },
    {
      slug: 'international-safety-outreach-orientation',
      title: 'International Occupational Safety Outreach Modules — Enquiry Open',
      category: 'Outreach',
      summary:
        'Online training enquiries are open for Construction Safety, General Industry Safety, Forklift, and Confined Space Safety orientation modules.',
      content:
        'Working safety professionals and engineering graduates interested in structured occupational safety training may enquire via our International Outreach page. Confirmation of third-party provider authorization and course issuance details is communicated explicitly prior to enrollment.',
      publishedDate: '2026-11-12',
      isPublished: true,
      isPinned: false,
    },
  ];

  for (const ann of announcementSeeds) {
    await db
      .insert(announcements)
      .values(ann)
      .onConflictDoNothing({ target: announcements.slug });
  }

  // 7. Seed Students & Examination Results
  const studentSeeds = [
    {
      userId: studentUser?.id ?? null,
      enrollmentNumber: 'NIEM-2024-ENG-1042',
      fullName: 'Rohan Verma',
      email: 'student@smnie.in',
      phone: '+91 9811004422',
      dateOfBirth: '1999-04-15',
      courseId: courseBySlug['diploma-mechanical-engineering'] ?? null,
      programmeName: 'Diploma in Mechanical Engineering',
      admissionYear: 2024,
      status: 'active',
      verificationStatus: 'verified',
      studyCentre: 'New Delhi Head Office (Nehru Place)',
      city: 'New Delhi',
    },
    {
      userId: null,
      enrollmentNumber: 'NIEM-2023-MGT-2088',
      fullName: 'Ananya Deshmukh',
      email: 'ananya.deshmukh@example.edu',
      phone: '+91 9845112233',
      dateOfBirth: '1997-09-22',
      courseId: courseBySlug['pg-business-management'] ?? null,
      programmeName: 'Postgraduate Programme in Management Studies',
      admissionYear: 2023,
      status: 'graduated',
      verificationStatus: 'verified',
      studyCentre: 'Bangalore Regional Office',
      city: 'Bangalore',
    },
    {
      userId: null,
      enrollmentNumber: 'NIEM-2025-CIV-3019',
      fullName: 'Karthik Subramanian',
      email: 'karthik.s@example.edu',
      phone: '+91 9741223344',
      dateOfBirth: '2000-01-11',
      courseId: courseBySlug['diploma-civil-engineering'] ?? null,
      programmeName: 'Diploma in Civil Engineering',
      admissionYear: 2025,
      status: 'active',
      verificationStatus: 'pending_review',
      studyCentre: 'Mysore Regional Office',
      city: 'Mysore',
    },
  ];

  for (const s of studentSeeds) {
    await db
      .insert(students)
      .values(s)
      .onConflictDoNothing({ target: students.enrollmentNumber });
  }

  const allStudents = await db.select().from(students);
  const studentByEnr: Record<string, (typeof allStudents)[number]> = {};
  for (const st of allStudents) {
    studentByEnr[st.enrollmentNumber] = st;
  }

  const existingResults = await db.select().from(examinationResults);
  if (existingResults.length === 0) {
    const s1 = studentByEnr['NIEM-2024-ENG-1042'];
    const s2 = studentByEnr['NIEM-2023-MGT-2088'];
    const s3 = studentByEnr['NIEM-2025-CIV-3019'];

    const resultSeeds = [
      s1 && {
        studentId: s1.id,
        enrollmentNumber: s1.enrollmentNumber,
        termLabel: 'Semester IV — Autumn 2026',
        programmeName: s1.programmeName,
        examMode: 'Study Centre Supervised Examination',
        gradeOrStatus: 'Passed — First Division',
        percentageOrScore: '76.4%',
        remarks: 'Completed all theory and practical assessment components.',
        isPublished: true,
        allowDownload: true,
        publishedAt: new Date('2026-10-20T10:00:00Z'),
      },
      s2 && {
        studentId: s2.id,
        enrollmentNumber: s2.enrollmentNumber,
        termLabel: 'Final Term — Spring 2025',
        programmeName: s2.programmeName,
        examMode: 'Open-Book Academic Assessment',
        gradeOrStatus: 'Passed — Distinction',
        percentageOrScore: '81.2%',
        remarks: 'Dissertation and viva voce requirements satisfied.',
        isPublished: true,
        allowDownload: true,
        publishedAt: new Date('2025-07-12T10:00:00Z'),
      },
      s3 && {
        studentId: s3.id,
        enrollmentNumber: s3.enrollmentNumber,
        termLabel: 'Semester II — Autumn 2026',
        programmeName: s3.programmeName,
        examMode: 'Study Centre Supervised Examination',
        gradeOrStatus: 'Evaluation In Progress',
        percentageOrScore: 'Pending Moderation',
        remarks: 'Awaiting Examination Controller publication authorization.',
        isPublished: false,
        allowDownload: false,
        publishedAt: null,
      },
    ].filter(Boolean);

    for (const r of resultSeeds) {
      if (r) {
        await db.insert(examinationResults).values(r);
      }
    }
  }

  // 8. Seed Initial Applications & Enquiries if empty
  const existingApps = await db.select().from(applications);
  if (existingApps.length === 0) {
    await db.insert(applications).values([
      {
        referenceNumber: 'NIEM-APP-2026-1042AB',
        userId: studentUser?.id ?? null,
        fullName: 'Rohan Verma',
        email: 'student@smnie.in',
        mobile: '+91 9811004422',
        courseId: courseBySlug['pg-project-operations-management'] ?? null,
        courseName: 'Postgraduate Programme in Industrial & Project Management',
        qualification: 'Diploma in Mechanical Engineering',
        city: 'New Delhi',
        message: 'Applying for lateral academic progression after completing Diploma coursework.',
        status: 'under_review',
        internalNotes: 'Verified prior NIEM enrollment; awaiting academic review.',
      },
      {
        referenceNumber: 'NIEM-APP-2026-8831CD',
        userId: null,
        fullName: 'Meera Krishnan',
        email: 'meera.krishnan@example.com',
        mobile: '+91 9900112288',
        courseId: courseBySlug['pg-business-management'] ?? null,
        courseName: 'Postgraduate Programme in Management Studies',
        qualification: 'B.Com Graduate',
        city: 'Bangalore',
        message: 'Interested in flexible weekend and study-centre guidance in Bangalore.',
        status: 'pending',
        internalNotes: 'Assigned to Bangalore Regional Office admissions coordinator.',
      },
    ]);
  }

  const existingEnquiries = await db.select().from(enquiries);
  if (existingEnquiries.length === 0) {
    await db.insert(enquiries).values([
      {
        referenceCode: 'NIEM-ENQ-2026-4410EF',
        fullName: 'Vikramaditya Rao',
        email: 'vikram.rao@example.com',
        mobile: '+91 9820113344',
        subject: 'Construction Safety Outreach Batch Schedule',
        enquiryType: 'outreach',
        courseName: 'Construction Safety Outreach Orientation',
        city: 'Mysore',
        message: 'Please confirm upcoming online batch schedule and verification scope for Construction Safety training.',
        status: 'new',
        internalNotes: '',
      },
      {
        referenceCode: 'NIEM-ENQ-2026-5521GH',
        fullName: 'Deepak Malhotra',
        email: 'deepak.m@example.com',
        mobile: '+91 9810998877',
        subject: 'Re-examination application deadline',
        enquiryType: 'examination',
        courseName: 'Diploma in Civil Engineering',
        city: 'New Delhi',
        message: 'Requesting official procedure and dates for submitting a re-examination form for Semester III.',
        status: 'in_progress',
        internalNotes: 'Forwarded to Exam@smnie.in desk.',
      },
    ]);
  }

  // 9. Seed Configurable Site Settings (Admin CMS)
  const settingsSeeds = [
    {
      key: 'hero_headline',
      label: 'Homepage Hero Headline',
      value: 'Shape Your Future With Quality Education.',
    },
    {
      key: 'hero_subtitle',
      label: 'Homepage Supporting Description',
      value:
        'Established in 1994, the National Institute of Engineering & Management (NIEM) delivers structured engineering, management, diploma, and occupational safety programmes designed for learners and working professionals across India.',
    },
    {
      key: 'institute_intro',
      label: 'Institute Introduction',
      value:
        'Founded in 1994 with its Head Office in New Delhi and Regional Offices in Mysore and Bangalore, the National Institute of Engineering & Management (NIEM) bridges practical industry knowledge with structured academic study. Our programmes support aspiring technicians, engineers, and managers seeking disciplined, accessible education.',
    },
    {
      key: 'director_name',
      label: 'Director Name & Title',
      value: 'Office of the Director — National Institute of Engineering & Management',
    },
    {
      key: 'director_message',
      label: "Director's Message",
      value:
        'Since our founding in 1994, the National Institute of Engineering & Management has been guided by a straightforward commitment: quality technical and management education must remain practical, transparent, and accessible to determined learners. Whether you are advancing an engineering career, developing management leadership, or strengthening workplace safety competence, our faculty and regional centres stand ready to support your academic progress with clarity and integrity.',
    },
    {
      key: 'contact_phone_primary',
      label: 'Primary Telephone',
      value: '011-64506504',
    },
    {
      key: 'contact_phone_secondary',
      label: 'Secondary Telephone',
      value: '011-22588575',
    },
    {
      key: 'contact_email_info',
      label: 'General Information Email',
      value: 'info@smnie.in',
    },
    {
      key: 'contact_email_exam',
      label: 'Examination Desk Email',
      value: 'Exam@smnie.in',
    },
    {
      key: 'contact_email_verification',
      label: 'Student Verification Email',
      value: 'studentverification@smnie.in',
    },
  ];

  for (const s of settingsSeeds) {
    await db
      .insert(siteSettings)
      .values(s)
      .onConflictDoNothing({ target: siteSettings.key });
  }
}
