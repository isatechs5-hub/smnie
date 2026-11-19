import test from 'node:test';
import assert from 'node:assert/strict';
import {
  admissionApplicationSchema,
  enquirySchema,
  resultLookupSchema,
  studentVerificationSchema,
  quickStudentVerificationSchema,
  normalizeStudentLookupId,
  validateStudentLookupId,
  generateReferenceNumber,
  slugify,
  maskStudentNameForPublicVerification,
  validateUploadFile,
  validateCertificateUploadFile,
  filterCourses,
  formatVerificationStatusLabel,
  escapeCsvCell,
  buildCertificateFileUrl,
  formatFileSize,
} from './validation';

test('admissionApplicationSchema rejects missing required fields and accepts valid data', () => {
  const invalid = admissionApplicationSchema.safeParse({
    fullName: 'A',
    email: 'not-an-email',
    mobile: '123',
    courseName: '',
    qualification: '',
    city: '',
  });
  assert.equal(invalid.success, false);

  const valid = admissionApplicationSchema.safeParse({
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    mobile: '+91 9811223344',
    courseId: 2,
    courseName: 'Diploma in Mechanical Engineering',
    qualification: '10+2 Science',
    city: 'New Delhi',
    message: 'Requesting admission prospectus and session schedule.',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.fullName, 'Aarav Sharma');
    assert.equal(valid.data.courseId, 2);
  }
});

test('enquirySchema enforces minimum message length and valid email', () => {
  const shortMsg = enquirySchema.safeParse({
    fullName: 'Priya Nair',
    email: 'priya@example.com',
    mobile: '9845012345',
    subject: 'Course enquiry',
    enquiryType: 'course',
    message: 'Too short',
  });
  assert.equal(shortMsg.success, false);

  const ok = enquirySchema.safeParse({
    fullName: 'Priya Nair',
    email: 'priya@example.com',
    mobile: '9845012345',
    subject: 'OSHA Construction Safety batch enquiry',
    enquiryType: 'outreach',
    message: 'Please share the upcoming batch dates and learning mode details.',
  });
  assert.equal(ok.success, true);
});

test('resultLookupSchema uppercases enrollment number and enforces YYYY-MM-DD', () => {
  const parsed = resultLookupSchema.safeParse({
    enrollmentNumber: 'niem-2024-eng-1042',
    dateOfBirth: '1999-04-15',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.enrollmentNumber, 'NIEM-2024-ENG-1042');
  }

  const badDate = resultLookupSchema.safeParse({
    enrollmentNumber: 'NIEM-2024-ENG-1042',
    dateOfBirth: '15/04/1999',
  });
  assert.equal(badDate.success, false);
});

test('studentVerificationSchema validates requester info', () => {
  const res = studentVerificationSchema.safeParse({
    enrollmentNumber: 'niem-2024-eng-1042',
    requesterName: 'HR Department, Apex Corp',
    requesterEmail: 'hr@apexcorp.example',
    purpose: 'Employment credential verification',
  });
  assert.equal(res.success, true);
});

test('maskStudentNameForPublicVerification protects student PII', () => {
  const masked = maskStudentNameForPublicVerification('Rohan Verma');
  assert.equal(masked, 'R**** V****');
  assert.equal(masked.includes('Rohan'), false);
  assert.equal(masked.includes('Verma'), false);
});

test('validateUploadFile rejects executables and oversized files, allows valid PDF/PNG', () => {
  assert.equal(validateUploadFile('application/pdf', 1024 * 500).valid, true);
  assert.equal(validateUploadFile('image/png', 1024 * 200).valid, true);
  assert.equal(validateUploadFile('application/x-msdownload', 1024).valid, false);
  assert.equal(validateUploadFile('application/pdf', 10 * 1024 * 1024).valid, false);
});

test('validateCertificateUploadFile enforces 5 MB Hostzens Storage limit and image/PDF types', () => {
  assert.equal(validateCertificateUploadFile('image/png', 512 * 1024).valid, true);
  assert.equal(validateCertificateUploadFile('image/webp', 2 * 1024 * 1024).valid, true);
  assert.equal(validateCertificateUploadFile('application/pdf', 5 * 1024 * 1024).valid, true);
  assert.equal(validateCertificateUploadFile('application/pdf', 5 * 1024 * 1024 + 1).valid, false);
  assert.equal(validateCertificateUploadFile('image/png', 0).valid, false);
  assert.equal(validateCertificateUploadFile('text/plain', 1024).valid, false);
});

test('normalizeStudentLookupId strips whitespace and uppercases IDs', () => {
  assert.equal(normalizeStudentLookupId('  niem-2026-1001  '), 'NIEM-2026-1001');
  assert.equal(normalizeStudentLookupId('niem 2026 1001'), 'NIEM20261001');
});

test('validateStudentLookupId accepts valid IDs and rejects traversal or unsafe inputs', () => {
  const validNumeric = validateStudentLookupId(' 12345 ');
  assert.equal(validNumeric.valid, true);
  assert.equal(validNumeric.normalized, '12345');

  const validEnrollment = validateStudentLookupId('niem-2024-eng-1042');
  assert.equal(validEnrollment.valid, true);
  assert.equal(validEnrollment.normalized, 'NIEM-2024-ENG-1042');

  assert.equal(validateStudentLookupId('12').valid, false);
  assert.equal(validateStudentLookupId('A'.repeat(65)).valid, false);
  assert.equal(validateStudentLookupId('../etc/passwd').valid, false);
  assert.equal(validateStudentLookupId("12345'; DROP TABLE students;--").valid, false);
  assert.equal(validateStudentLookupId('!!!').valid, false);
});

test('quickStudentVerificationSchema validates admin student + certificate creation payload', () => {
  const valid = quickStudentVerificationSchema.safeParse({
    enrollmentNumber: '  niem-2026-eng-5001 ',
    fullName: 'Ananya Verma',
    programmeName: 'Diploma in Mechanical Engineering',
    admissionYear: 2026,
    certificateTitle: 'Official Diploma Certificate',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.enrollmentNumber, 'NIEM-2026-ENG-5001');
    assert.equal(valid.data.isPublicViewable, true);
    assert.equal(valid.data.verificationStatus, 'verified');
  }

  const missingName = quickStudentVerificationSchema.safeParse({
    enrollmentNumber: 'NIEM-2026-5001',
    fullName: '',
    programmeName: 'Diploma',
  });
  assert.equal(missingName.success, false);
});

test('filterCourses filters accurately by category, level, and text search', () => {
  const sample = [
    {
      title: 'Diploma in Civil Engineering',
      code: 'NIEM-CE-101',
      summary: 'Foundational structural and site engineering studies.',
      level: 'Diploma',
      categorySlug: 'engineering',
      learningMode: 'Distance / Guided Study',
    },
    {
      title: 'Postgraduate Programme in Industrial Management',
      code: 'NIEM-MG-401',
      summary: 'Operations, finance, and organizational administration.',
      level: 'Postgraduate',
      categorySlug: 'management',
      learningMode: 'Online & Study Centre',
    },
  ];
  assert.equal(filterCourses(sample, { categorySlug: 'engineering' }).length, 1);
  assert.equal(filterCourses(sample, { level: 'Postgraduate' }).length, 1);
  assert.equal(filterCourses(sample, { query: 'structural' }).length, 1);
  assert.equal(filterCourses(sample, { query: 'nonexistent' }).length, 0);
});

test('reference numbers, slugs, verification labels, and CSV escaping work deterministically', () => {
  assert.equal(generateReferenceNumber('NIEM-APP', 2026, 'a1b2c3d4'), 'NIEM-APP-2026-A1B2C3');
  assert.equal(slugify('OSHA 30-Hour Construction Safety!'), 'osha-30-hour-construction-safety');
  assert.equal(
    formatVerificationStatusLabel('pending_verification'),
    'Institutional Claim — Independent Verification Pending'
  );
  assert.equal(escapeCsvCell('Hello, "World"'), '"Hello, ""World"""');
});

test('buildCertificateFileUrl and formatFileSize produce deterministic outputs', () => {
  assert.equal(
    buildCertificateFileUrl(14, 'NIEM-2026-ENG-1042', 'NIEM-CERT-2026-AB12'),
    '/api/certificates/14/view?enrollment=NIEM-2026-ENG-1042&cert=NIEM-CERT-2026-AB12'
  );
  assert.equal(
    buildCertificateFileUrl(9, ' 12345 ', 'CERT 01'),
    '/api/certificates/9/view?enrollment=12345&cert=CERT%2001'
  );
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(43008), '42 KB');
  assert.equal(formatFileSize(2.5 * 1024 * 1024), '2.50 MB');
});
