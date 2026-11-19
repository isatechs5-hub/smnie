import { z } from 'zod';

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CERT_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB for Hostzens Storage persisted certificates

export const quickStudentVerificationSchema = z.object({
  enrollmentNumber: z
    .string()
    .trim()
    .min(3, 'Student ID / Enrollment Number must be at least 3 characters')
    .max(40)
    .transform((v) => v.replace(/\s+/g, '').toUpperCase()),
  fullName: z.string().trim().min(2, 'Student full name is required').max(120),
  programmeName: z.string().trim().min(2, 'Programme / course name is required').max(180),
  admissionYear: z.coerce.number().int().min(1994).max(2099).optional().default(new Date().getFullYear()),
  studyCentre: z.string().trim().max(160).optional().default('New Delhi Head Office (Nehru Place)'),
  city: z.string().trim().max(100).optional().default('New Delhi'),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .default('')
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address'),
  phone: z.string().trim().max(30).optional().default(''),
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Date of birth must be YYYY-MM-DD'),
  status: z.enum(['active', 'graduated', 'pending', 'suspended']).optional().default('active'),
  certificateTitle: z
    .string()
    .trim()
    .min(3, 'Certificate title must be at least 3 characters')
    .max(180)
    .optional()
    .default('Official Programme Completion Certificate'),
  certificateNumber: z.string().trim().max(60).optional().default(''),
  issueDate: z.string().trim().max(20).optional().default(''),
  verificationStatus: z.enum(['verified', 'pending_review', 'revoked']).optional().default('verified'),
  isPublicViewable: z.boolean().optional().default(true),
  remarks: z.string().trim().max(500).optional().default(''),
});

export function normalizeStudentLookupId(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

export function validateStudentLookupId(raw: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const normalized = normalizeStudentLookupId(raw);
  if (normalized.length < 3) {
    return {
      valid: false,
      normalized,
      error: 'Please enter a valid Student ID (at least 3 characters) or Certificate Number.',
    };
  }
  if (normalized.length > 64) {
    return {
      valid: false,
      normalized,
      error: 'Student ID must be 64 characters or fewer.',
    };
  }
  if (normalized.includes('..') || !/^[A-Z0-9][A-Z0-9._/-]{2,63}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Student ID may only contain letters, numbers, hyphens, underscores, slashes, or dots.',
    };
  }
  return { valid: true, normalized };
}

export const admissionApplicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  mobile: z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{8,20}$/, 'Please enter a valid mobile number (8–20 digits)'),
  courseId: z.coerce.number().int().positive().optional().nullable(),
  courseName: z.string().trim().min(2, 'Please select a course or programme').max(180),
  qualification: z.string().trim().min(2, 'Please specify your highest qualification').max(140),
  city: z.string().trim().min(2, 'Please enter your city').max(100),
  message: z.string().trim().max(2000).optional().default(''),
});

export const enquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(160),
  mobile: z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{8,20}$/, 'Please enter a valid phone number'),
  subject: z.string().trim().min(3, 'Please enter a subject').max(180),
  enquiryType: z
    .enum(['course', 'admission', 'examination', 'verification', 'outreach', 'general'])
    .default('general'),
  courseName: z.string().trim().max(180).optional().default(''),
  city: z.string().trim().max(100).optional().default(''),
  message: z.string().trim().min(10, 'Please provide at least 10 characters in your message').max(2500),
});

export const resultLookupSchema = z.object({
  enrollmentNumber: z
    .string()
    .trim()
    .min(5, 'Enrollment number is required')
    .max(40)
    .transform((v) => v.toUpperCase()),
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
});

export const studentVerificationSchema = z.object({
  enrollmentNumber: z
    .string()
    .trim()
    .min(5, 'Enrollment number is required')
    .max(40)
    .transform((v) => v.toUpperCase()),
  requesterName: z.string().trim().min(2, 'Requester name or organization is required').max(120),
  requesterEmail: z.string().trim().email('Valid requester email is required').max(160),
  purpose: z.string().trim().min(4, 'Verification purpose is required').max(200),
});

export const courseInputSchema = z.object({
  code: z.string().trim().min(2).max(30),
  title: z.string().trim().min(3).max(180),
  categoryId: z.coerce.number().int().positive(),
  level: z.string().trim().min(2).max(60),
  duration: z.string().trim().min(2).max(80),
  learningMode: z.string().trim().min(2).max(120),
  eligibility: z.string().trim().min(2).max(300),
  feesNote: z.string().trim().min(2).max(200),
  summary: z.string().trim().min(10).max(1000),
  curriculumOutline: z.string().trim().min(5).max(3000),
  isActive: z.boolean().optional().default(true),
});

export function generateReferenceNumber(prefix: 'NIEM-APP' | 'NIEM-ENQ', year: number, randomHex: string): string {
  const cleanHex = randomHex.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6).padEnd(6, '0');
  return `${prefix}-${year}-${cleanHex}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function maskStudentNameForPublicVerification(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Record Holder';
  return parts
    .map((part) => {
      if (part.length <= 2) return `${part[0]}*`;
      return `${part[0]}${'*'.repeat(Math.min(part.length - 1, 5))}`;
    })
    .join(' ');
}

export function validateUploadFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: 'Unsupported file type. Only PDF, JPG, PNG, and WEBP documents are accepted.',
    };
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
    return {
      valid: false,
      error: 'File size must be greater than 0 bytes and no larger than 5 MB.',
    };
  }
  return { valid: true };
}

export function validateCertificateUploadFile(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: 'Certificate must be a PDF, JPG, PNG, or WEBP file.',
    };
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_CERT_UPLOAD_BYTES) {
    return {
      valid: false,
      error: 'Certificate file size must be between 1 byte and 5 MB.',
    };
  }
  return { valid: true };
}

export function filterCourses<
  T extends {
    title: string;
    code: string;
    summary: string;
    level: string;
    categorySlug: string;
    learningMode: string;
  },
>(
  items: T[],
  opts: { query?: string; categorySlug?: string; level?: string }
): T[] {
  const q = (opts.query ?? '').trim().toLowerCase();
  const cat = (opts.categorySlug ?? 'all').trim().toLowerCase();
  const lvl = (opts.level ?? 'all').trim().toLowerCase();

  return items.filter((course) => {
    if (cat !== 'all' && course.categorySlug.toLowerCase() !== cat) {
      return false;
    }
    if (lvl !== 'all' && course.level.toLowerCase() !== lvl) {
      return false;
    }
    if (q) {
      const hay = `${course.title} ${course.code} ${course.summary} ${course.level} ${course.learningMode}`.toLowerCase();
      return hay.includes(q);
    }
    return true;
  });
}

export function formatVerificationStatusLabel(status: string): string {
  switch (status) {
    case 'documented':
      return 'Supporting Documentation On File';
    case 'pending_verification':
      return 'Institutional Claim — Independent Verification Pending';
    case 'reference_only':
      return 'Historical / Supplied Reference Only';
    case 'under_review':
      return 'Under Administrative Review';
    default:
      return 'Verification Status Unspecified';
  }
}

export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCertificateFileUrl(
  certificateId: number,
  enrollmentNumber: string,
  certificateNumber: string
): string {
  const qs = `enrollment=${encodeURIComponent(enrollmentNumber.trim())}&cert=${encodeURIComponent(
    certificateNumber.trim()
  )}`;
  return `/api/certificates/${certificateId}/view?${qs}`;
}

export function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '0 B';
  if (sizeBytes < 1024) return `${Math.round(sizeBytes)} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}
