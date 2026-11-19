import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // 'admin' | 'student' | 'staff'
  description: text('description').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Optional external user identifier
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  roleId: integer('role_id')
    .references(() => roles.id)
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courseCategories = pgTable('course_categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  categoryId: integer('category_id')
    .references(() => courseCategories.id)
    .notNull(),
  level: text('level').notNull(), // e.g., Diploma, Undergraduate, Postgraduate, Certificate, Professional Training, Safety Outreach
  duration: text('duration').notNull(),
  learningMode: text('learning_mode').notNull(),
  eligibility: text('eligibility').notNull(),
  feesNote: text('fees_note').notNull(),
  summary: text('summary').notNull(),
  curriculumOutline: text('curriculum_outline').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const students = pgTable('students', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  enrollmentNumber: text('enrollment_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  dateOfBirth: text('date_of_birth').notNull(), // YYYY-MM-DD
  courseId: integer('course_id').references(() => courses.id),
  programmeName: text('programme_name').notNull(),
  admissionYear: integer('admission_year').notNull(),
  status: text('status').default('active').notNull(), // active | graduated | suspended | pending
  verificationStatus: text('verification_status').default('verified').notNull(), // verified | pending_review | not_verified
  studyCentre: text('study_centre').notNull(),
  city: text('city').notNull(),
  certificateStorageUri: text('certificate_storage_uri').default('').notNull(),
  certificateFileUrl: text('certificate_file_url').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  mobile: text('mobile').notNull(),
  courseId: integer('course_id').references(() => courses.id),
  courseName: text('course_name').notNull(),
  qualification: text('qualification').notNull(),
  city: text('city').notNull(),
  message: text('message').default('').notNull(),
  status: text('status').default('pending').notNull(), // pending | under_review | approved | rejected
  internalNotes: text('internal_notes').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id),
  studentId: integer('student_id').references(() => students.id),
  uploadedByUserId: integer('uploaded_by_user_id').references(() => users.id),
  originalName: text('original_name').notNull(),
  storedName: text('stored_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  category: text('category').default('admission_document').notNull(),
  isPrivate: boolean('is_private').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  referenceCode: text('reference_code').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  mobile: text('mobile').notNull(),
  subject: text('subject').notNull(),
  enquiryType: text('enquiry_type').default('general').notNull(), // course | admission | examination | verification | outreach | general
  courseName: text('course_name').default('').notNull(),
  city: text('city').default('').notNull(),
  message: text('message').notNull(),
  status: text('status').default('new').notNull(), // new | in_progress | resolved
  internalNotes: text('internal_notes').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const examinationResults = pgTable('examination_results', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id)
    .notNull(),
  enrollmentNumber: text('enrollment_number').notNull(),
  termLabel: text('term_label').notNull(),
  programmeName: text('programme_name').notNull(),
  examMode: text('exam_mode').notNull(),
  gradeOrStatus: text('grade_or_status').notNull(),
  percentageOrScore: text('percentage_or_score').notNull(),
  remarks: text('remarks').default('').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  allowDownload: boolean('allow_download').default(false).notNull(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').notNull(), // Admissions | Examinations | Academic Notice | Outreach
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  publishedDate: text('published_date').notNull(), // YYYY-MM-DD
  isPublished: boolean('is_published').default(true).notNull(),
  isPinned: boolean('is_pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accreditationRecords = pgTable('accreditation_records', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  bodyName: text('body_name').notNull(),
  shortTitle: text('short_title').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  verificationStatus: text('verification_status')
    .default('pending_verification')
    .notNull(), // documented | pending_verification | reference_only | under_review
  verificationNote: text('verification_note').notNull(),
  lastReviewedAt: timestamp('last_reviewed_at').defaultNow().notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  label: text('label').notNull(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  recipientUserId: integer('recipient_user_id').references(() => users.id),
  recipientEmail: text('recipient_email').notNull(),
  recipientRole: text('recipient_role').default('admin').notNull(),
  channel: text('channel').default('in_app').notNull(), // in_app | email
  title: text('title').notNull(),
  body: text('body').notNull(),
  deliveryStatus: text('delivery_status').default('unread').notNull(), // sent | logged | unread | read
  relatedEntity: text('related_entity').default('').notNull(),
  relatedId: text('related_id').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorUserId: integer('actor_user_id').references(() => users.id),
  actorEmail: text('actor_email').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').default('').notNull(),
  details: text('details').default('').notNull(),
  ipAddress: text('ip_address').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Dedicated Admin Panel Authentication Tables (strictly separated from public users)
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  roleTitle: text('role_title').notNull(),
  roleCode: text('role_code').default('SUPER_ADMIN').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminSessions = pgTable('admin_sessions', {
  id: serial('id').primaryKey(),
  sessionId: text('session_id').notNull().unique(),
  adminUserId: integer('admin_user_id')
    .references(() => adminUsers.id)
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  ipAddress: text('ip_address').default('').notNull(),
  userAgent: text('user_agent').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Student Verification Certificates uploaded by Admin and viewable by verified users
export const studentCertificates = pgTable('student_certificates', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => students.id)
    .notNull(),
  enrollmentNumber: text('enrollment_number').notNull(),
  certificateNumber: text('certificate_number').notNull().unique(),
  title: text('title').notNull(),
  issueDate: text('issue_date').notNull(),
  verificationStatus: text('verification_status').default('verified').notNull(), // verified | pending_review | revoked
  originalName: text('original_name').notNull(),
  storedName: text('stored_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  fileDataBase64: text('file_data_base64').default('').notNull(),
  isPublicViewable: boolean('is_public_viewable').default(true).notNull(),
  uploadedByAdminEmail: text('uploaded_by_admin_email').notNull(),
  remarks: text('remarks').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Drizzle Relations
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  students: many(students),
  applications: many(applications),
  notifications: many(notifications),
}));

export const courseCategoriesRelations = relations(courseCategories, ({ many }) => ({
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(courseCategories, {
    fields: [courses.categoryId],
    references: [courseCategories.id],
  }),
  applications: many(applications),
  students: many(students),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [students.courseId],
    references: [courses.id],
  }),
  results: many(examinationResults),
  documents: many(documents),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [applications.courseId],
    references: [courses.id],
  }),
  documents: many(documents),
}));

export const examinationResultsRelations = relations(examinationResults, ({ one }) => ({
  student: one(students, {
    fields: [examinationResults.studentId],
    references: [students.id],
  }),
}));
