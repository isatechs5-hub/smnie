import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import bcrypt from 'bcryptjs';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  accreditationRecords,
  adminSessions,
  adminUsers,
  announcements,
  applications,
  auditLogs,
  courseCategories,
  courses,
  documents,
  enquiries,
  examinationResults,
  notifications,
  roles,
  siteSettings,
  studentCertificates,
  students,
  users,
} from '../db/schema.ts';
import { isHostzenConfigured } from '../db/hostzen.ts';
import {
  HOSTZEN_STORAGE_BUCKET,
  WEBSITE_MEDIA_FILES,
  buildStorageObjectPath,
  deleteFromHostzenStorage,
  downloadFromHostzenStorage,
  ensureWebsiteMediaInHostzenStorage,
  formatHostzenStorageUri,
  getHostzenStorageObjectUrl,
  migrateLegacyCertificatesToHostzenStorage,
  parseHostzenStorageUri,
  uploadToHostzenStorage,
} from '../db/hostzenStorage.ts';
import { ensureSeeded } from '../db/seed.ts';
import {
  ADMIN_SESSION_TTL_MS,
  AuthRequest,
  clearAdminSessionCookie,
  clearSessionCookie,
  createAdminSessionToken,
  createSessionToken,
  extractAdminTokenFromRequest,
  optionalAuth,
  recordAuditLog,
  requireAdmin,
  requireAuth,
  requireStudentOrAdmin,
  resolveAuthUser,
  setAdminSessionCookie,
  setSessionCookie,
  verifyAdminSessionToken,
} from '../middleware/auth.ts';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_CERT_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  admissionApplicationSchema,
  buildCertificateFileUrl,
  courseInputSchema,
  enquirySchema,
  escapeCsvCell,
  generateReferenceNumber,
  maskStudentNameForPublicVerification,
  normalizeStudentLookupId,
  quickStudentVerificationSchema,
  resultLookupSchema,
  slugify,
  studentVerificationSchema,
  validateCertificateUploadFile,
  validateStudentLookupId,
  validateUploadFile,
} from '../utils/validation.ts';
import { dispatchNotification } from './mailer.ts';

const router = express.Router();

// Legacy private uploads directory (fallback read-only locally; writable /tmp on Vercel/Netlify Lambda)
const PRIVATE_UPLOAD_DIR =
  process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join(os.tmpdir(), 'niem_private_uploads')
    : path.resolve(process.cwd(), 'private_uploads');

// All application documents/images are uploaded directly into Hostzens.com Storage (niem-media)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (
      ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, and WEBP files up to 5 MB are allowed.'));
    }
  },
});

// In-memory cache for institutional website images fetched from Hostzens Storage
const websiteMediaCache = new Map<string, { buffer: Buffer; contentType: string; cachedAt: number }>();

const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this client. Please try again shortly.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many administrator sign-in attempts. Please wait 15 minutes before retrying.',
  },
});

const verificationLookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 45,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many student verification requests. Please wait a few minutes before retrying.',
  },
});

const MAX_CERT_BYTES = MAX_CERT_UPLOAD_BYTES; // 5 MB ceiling for Hostzens Storage persisted certificates
const MAX_ADMIN_FAILED_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;

// Certificates are read in memory and uploaded directly into Hostzens.com Storage (niem-media/certificates/*)
const certificateMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CERT_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (
      ALLOWED_UPLOAD_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error('Certificate must be a PDF, JPG, PNG, or WEBP file up to 5 MB.'));
    }
  },
});

function formatPublicCertificateSummary(cert: {
  id: number;
  enrollmentNumber: string;
  certificateNumber: string;
  title: string;
  issueDate: string;
  verificationStatus: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  remarks: string;
}) {
  const viewUrl = buildCertificateFileUrl(cert.id, cert.enrollmentNumber, cert.certificateNumber);
  return {
    id: cert.id,
    enrollmentNumber: cert.enrollmentNumber,
    certificateNumber: cert.certificateNumber,
    title: cert.title,
    issueDate: cert.issueDate,
    verificationStatus: cert.verificationStatus,
    originalName: cert.originalName,
    mimeType: cert.mimeType,
    sizeBytes: cert.sizeBytes,
    remarks: cert.remarks,
    viewUrl,
    downloadUrl: `${viewUrl}&download=1`,
  };
}

// Serve institutional website images directly from Hostzens.com Storage (niem-media/website/*)
router.get('/media/:filename', async (req: Request, res: Response) => {
  try {
    const filename = path.basename(String(req.params.filename || '').trim());
    const manifest = WEBSITE_MEDIA_FILES[filename];
    if (!manifest) {
      return res.status(404).json({ error: 'Media asset not found.' });
    }

    const cached = websiteMediaCache.get(filename);
    if (cached && Date.now() - cached.cachedAt < 1000 * 60 * 30) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    if (isHostzenConfigured()) {
      await ensureWebsiteMediaInHostzenStorage();
      const storageUri = formatHostzenStorageUri(HOSTZEN_STORAGE_BUCKET, manifest.objectPath);
      const downloaded = await downloadFromHostzenStorage(storageUri);
      if (downloaded) {
        websiteMediaCache.set(filename, {
          buffer: downloaded.buffer,
          contentType: manifest.contentType,
          cachedAt: Date.now(),
        });
        res.setHeader('Content-Type', manifest.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(downloaded.buffer);
      }
    }

    const localPath = path.resolve(process.cwd(), manifest.localRelativePath);
    if (fs.existsSync(localPath)) {
      res.setHeader('Content-Type', manifest.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.sendFile(localPath);
    }

    return res.status(404).json({ error: 'Media asset unavailable.' });
  } catch (err) {
    console.error('Website media load error:', err);
    return res.status(500).json({ error: 'Unable to load institutional media asset.' });
  }
});

// Lazily ensure database is seeded before handling API requests
router.use(async (_req, res, next) => {
  try {
    await ensureSeeded();
    // Kick off non-blocking idempotent sync of website images & legacy certificates into Hostzens Storage
    if (isHostzenConfigured()) {
      ensureWebsiteMediaInHostzenStorage().catch(() => {});
      migrateLegacyCertificatesToHostzenStorage().catch(() => {});
    }
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(503).json({
      error: 'Institutional database service is temporarily unavailable. Please retry shortly.',
    });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

router.get('/auth/me', optionalAuth, async (req: AuthRequest, res: Response) => {
  if (!req.authUser) {
    return res.json({ user: null });
  }
  return res.json({ user: req.authUser });
});

router.post('/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, email));

    const found = rows[0];
    if (!found || !found.passwordHash || !found.isActive) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Strict separation: administrator accounts cannot authenticate through the public portal
    if (found.roleName === 'admin') {
      return res.status(403).json({
        error: 'Administrator accounts must sign in through the dedicated Admin Panel.',
      });
    }

    const match = await bcrypt.compare(password, found.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = createSessionToken({
      userId: found.id,
      email: found.email,
      role: found.roleName,
    });
    setSessionCookie(req, res, token);

    await recordAuditLog({
      actorUserId: found.id,
      actorEmail: found.email,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: String(found.id),
      details: `Signed in via portal credentials (${found.roleName})`,
      ipAddress: req.ip || '',
    });

    return res.json({
      token,
      user: {
        id: found.id,
        uid: found.uid,
        email: found.email,
        fullName: found.fullName,
        role: found.roleName,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to complete sign-in.' });
  }
});

router.post('/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (fullName.length < 2 || !email.includes('@') || password.length < 8) {
      return res.status(400).json({
        error: 'Provide a full name, valid email address, and password of at least 8 characters.',
      });
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const [studentRole] = await db.select().from(roles).where(eq(roles.name, 'student'));
    const passwordHash = await bcrypt.hash(password, 10);

    const [created] = await db
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash,
        roleId: studentRole.id,
        isActive: true,
      })
      .returning();

    // Link existing student record if email matches
    await db
      .update(students)
      .set({ userId: created.id })
      .where(eq(students.email, email));

    const token = createSessionToken({
      userId: created.id,
      email: created.email,
      role: 'student',
    });
    setSessionCookie(req, res, token);

    return res.status(201).json({
      token,
      user: {
        id: created.id,
        uid: created.uid,
        email: created.email,
        fullName: created.fullName,
        role: 'student',
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Unable to create student account.' });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  clearSessionCookie(req, res);
  return res.json({ ok: true });
});

// ============================================================================
// INDEPENDENT ADMIN PANEL AUTHENTICATION ROUTES (STRICTLY SEPARATED)
// ============================================================================

router.post('/admin/auth/login', adminAuthLimiter, async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@') || !password) {
      return res.status(400).json({ error: 'Valid administrator email and password are required.' });
    }

    const rows = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));

    const account = rows[0];
    if (!account || !account.isActive) {
      await recordAuditLog({
        actorEmail: email,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'admin_auth',
        details: 'Unknown or inactive administrator account',
        ipAddress: req.ip || '',
      });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    // Per-account brute-force lockout enforcement
    if (account.lockedUntil) {
      const lockMs =
        account.lockedUntil instanceof Date
          ? account.lockedUntil.getTime()
          : new Date(account.lockedUntil).getTime();
      if (!Number.isNaN(lockMs) && lockMs > Date.now()) {
        const remainingMinutes = Math.max(1, Math.ceil((lockMs - Date.now()) / 60000));
        return res.status(429).json({
          error: `Account temporarily locked due to repeated failed attempts. Retry in ${remainingMinutes} minute(s).`,
        });
      }
    }

    const passwordValid = await bcrypt.compare(password, account.passwordHash);
    if (!passwordValid) {
      const nextAttempts = (account.failedAttempts || 0) + 1;
      const shouldLock = nextAttempts >= MAX_ADMIN_FAILED_ATTEMPTS;
      await db
        .update(adminUsers)
        .set({
          failedAttempts: nextAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + ADMIN_LOCKOUT_MS) : null,
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, account.id));

      await recordAuditLog({
        actorEmail: account.email,
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'admin_auth',
        entityId: String(account.id),
        details: shouldLock
          ? `Failed login (${nextAttempts}) — account locked for 15 minutes`
          : `Failed login attempt ${nextAttempts}/${MAX_ADMIN_FAILED_ATTEMPTS}`,
        ipAddress: req.ip || '',
      });

      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    // Reset lockout counters and create revocable server-side session row
    const now = new Date();
    const expiresAtMs = Date.now() + ADMIN_SESSION_TTL_MS;
    const expiresAt = new Date(expiresAtMs);
    const sessionId = crypto.randomUUID();

    await Promise.all([
      db
        .update(adminUsers)
        .set({
          failedAttempts: 0,
          lockedUntil: null,
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(eq(adminUsers.id, account.id)),
      db.insert(adminSessions).values({
        sessionId,
        adminUserId: account.id,
        expiresAt,
        revokedAt: null,
        ipAddress: String(req.ip || '').slice(0, 80),
        userAgent: String(req.headers['user-agent'] || '').slice(0, 240),
      }),
    ]);

    const token = createAdminSessionToken({
      sessionId,
      adminUserId: account.id,
      email: account.email,
      roleCode: account.roleCode,
      expiresAtMs,
    });
    setAdminSessionCookie(req, res, token);

    await recordAuditLog({
      actorEmail: account.email,
      action: 'ADMIN_LOGIN_SUCCESS',
      entityType: 'admin_auth',
      entityId: sessionId,
      details: `Signed in as ${account.roleTitle} (${account.roleCode})`,
      ipAddress: req.ip || '',
    });

    return res.json({
      token,
      expiresAt: expiresAt.toISOString(),
      admin: {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        roleTitle: account.roleTitle,
        roleCode: account.roleCode,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Unable to complete administrator sign-in.' });
  }
});

router.get('/admin/auth/me', requireAdmin, async (req: AuthRequest, res: Response) => {
  const admin = req.adminUser!;
  return res.json({
    admin: {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      roleTitle: admin.roleTitle,
      roleCode: admin.roleCode,
    },
  });
});

router.post('/admin/auth/logout', async (req: Request, res: Response) => {
  try {
    const rawToken = extractAdminTokenFromRequest(req);
    if (rawToken) {
      const payload = verifyAdminSessionToken(rawToken);
      if (payload) {
        await db
          .update(adminSessions)
          .set({ revokedAt: new Date() })
          .where(eq(adminSessions.sessionId, payload.sessionId));

        await recordAuditLog({
          actorEmail: payload.email,
          action: 'ADMIN_LOGOUT',
          entityType: 'admin_auth',
          entityId: payload.sessionId,
          details: 'Administrator session revoked on logout',
          ipAddress: req.ip || '',
        });
      }
    }
  } catch (err) {
    console.error('Admin logout revoke error:', err);
  } finally {
    clearAdminSessionCookie(req, res);
  }
  return res.json({ ok: true });
});

// ============================================================================
// PUBLIC INSTITUTIONAL DATA ROUTES
// ============================================================================

router.get('/site-settings', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(siteSettings);
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return res.json({ settings: map, items: rows });
  } catch (err) {
    console.error('Failed to fetch site settings:', err);
    return res.status(500).json({ error: 'Failed to load institutional settings.' });
  }
});

router.get('/courses', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const level = String(req.query.level || '').trim();

    const cats = await db
      .select()
      .from(courseCategories)
      .orderBy(courseCategories.sortOrder);

    const rows = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        code: courses.code,
        title: courses.title,
        categoryId: courses.categoryId,
        categoryName: courseCategories.name,
        categorySlug: courseCategories.slug,
        level: courses.level,
        duration: courses.duration,
        learningMode: courses.learningMode,
        eligibility: courses.eligibility,
        feesNote: courses.feesNote,
        summary: courses.summary,
        curriculumOutline: courses.curriculumOutline,
        isActive: courses.isActive,
      })
      .from(courses)
      .innerJoin(courseCategories, eq(courses.categoryId, courseCategories.id))
      .where(eq(courses.isActive, true))
      .orderBy(courseCategories.sortOrder, courses.code);

    const filtered = rows.filter((c) => {
      if (category && category !== 'all' && c.categorySlug !== category) return false;
      if (level && level !== 'all' && c.level.toLowerCase() !== level.toLowerCase()) return false;
      if (q) {
        const ql = q.toLowerCase();
        return `${c.title} ${c.code} ${c.summary} ${c.categoryName} ${c.level}`
          .toLowerCase()
          .includes(ql);
      }
      return true;
    });

    return res.json({ categories: cats, courses: filtered });
  } catch (err) {
    console.error('Failed to fetch courses:', err);
    return res.status(500).json({ error: 'Failed to load course catalogue.' });
  }
});

router.get('/announcements', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit || '20'), 50);
    const rows = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.isPinned), desc(announcements.publishedDate))
      .limit(limit);
    return res.json({ announcements: rows });
  } catch (err) {
    console.error('Failed to load announcements:', err);
    return res.status(500).json({ error: 'Failed to load announcements.' });
  }
});

router.get('/accreditations', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(accreditationRecords)
      .orderBy(accreditationRecords.sortOrder);
    return res.json({ records: rows });
  } catch (err) {
    console.error('Failed to fetch accreditations:', err);
    return res.status(500).json({ error: 'Failed to load accreditation records.' });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ courses: [], announcements: [], pages: [] });
    }
    const pattern = `%${q}%`;

    const matchedCourses = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        code: courses.code,
        title: courses.title,
        level: courses.level,
        summary: courses.summary,
      })
      .from(courses)
      .where(
        and(
          eq(courses.isActive, true),
          or(
            ilike(courses.title, pattern),
            ilike(courses.code, pattern),
            ilike(courses.summary, pattern),
            ilike(courses.level, pattern)
          )
        )
      )
      .limit(8);

    const matchedAnnouncements = await db
      .select({
        id: announcements.id,
        slug: announcements.slug,
        title: announcements.title,
        category: announcements.category,
        publishedDate: announcements.publishedDate,
        summary: announcements.summary,
      })
      .from(announcements)
      .where(
        and(
          eq(announcements.isPublished, true),
          or(
            ilike(announcements.title, pattern),
            ilike(announcements.summary, pattern),
            ilike(announcements.content, pattern)
          )
        )
      )
      .limit(6);

    const staticPages = [
      { title: 'About NIEM (Est. 1994)', path: '/about', keywords: 'about history mission vision 1994 director philosophy' },
      { title: 'Accreditations & Recognition', path: '/accreditations', keywords: 'iste ignou aims ukas anab accreditation recognition registration' },
      { title: 'Admission Process & Online Application', path: '/admissions', keywords: 'admission apply eligibility documents enrolment track status' },
      { title: 'Examination Procedure', path: '/examinations', keywords: 'exam examination home open-book study centre re-examination' },
      { title: 'Placement Assistance', path: '/placements', keywords: 'placement career guidance interview communication training' },
      { title: 'International Outreach (OSHA Safety)', path: '/international-outreach', keywords: 'osha construction general industry forklift confined space safety' },
      { title: 'Results & Student Verification', path: '/results', keywords: 'results verification enrollment transcript marksheet' },
      { title: 'Contact Us — Head & Regional Offices', path: '/contact', keywords: 'contact nehru place delhi mysore bangalore phone email map' },
    ];

    const ql = q.toLowerCase();
    const matchedPages = staticPages.filter(
      (p) => p.title.toLowerCase().includes(ql) || p.keywords.includes(ql)
    );

    return res.json({
      courses: matchedCourses,
      announcements: matchedAnnouncements,
      pages: matchedPages,
    });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed.' });
  }
});

// ============================================================================
// ADMISSIONS & ENQUIRIES (PUBLIC WRITE + TRACKING)
// ============================================================================

router.post(
  '/applications',
  publicWriteLimiter,
  optionalAuth,
  (req, res, next) => {
    upload.single('document')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Invalid file upload.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = admissionApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Please check all required fields.',
          fieldErrors: parsed.error.flatten().fieldErrors,
        });
      }

      if (req.file) {
        const check = validateUploadFile(req.file.mimetype, req.file.size);
        if (!check.valid) {
          return res.status(400).json({ error: check.error });
        }
      }

      const data = parsed.data;
      const year = new Date().getFullYear();
      const referenceNumber = generateReferenceNumber(
        'NIEM-APP',
        year,
        crypto.randomBytes(4).toString('hex')
      );

      const [created] = await db
        .insert(applications)
        .values({
          referenceNumber,
          userId: req.authUser?.id ?? null,
          fullName: data.fullName,
          email: data.email.toLowerCase(),
          mobile: data.mobile,
          courseId: data.courseId ?? null,
          courseName: data.courseName,
          qualification: data.qualification,
          city: data.city,
          message: data.message || '',
          status: 'pending',
          internalNotes: '',
        })
        .returning();

      let uploadedDoc = null;
      if (req.file) {
        let storedName: string;
        if (isHostzenConfigured()) {
          const objectPath = buildStorageObjectPath(
            'applications',
            referenceNumber,
            `${Date.now()}-${req.file.originalname}`
          );
          const uploaded = await uploadToHostzenStorage({
            objectPath,
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
          });
          storedName = uploaded.storageUri;
        } else {
          if (!fs.existsSync(PRIVATE_UPLOAD_DIR)) {
            fs.mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });
          }
          const ext = path
            .extname(req.file.originalname)
            .replace(/[^a-zA-Z0-9.]/g, '')
            .slice(0, 10);
          storedName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
          fs.writeFileSync(path.join(PRIVATE_UPLOAD_DIR, storedName), req.file.buffer);
        }

        const [doc] = await db
          .insert(documents)
          .values({
            applicationId: created.id,
            uploadedByUserId: req.authUser?.id ?? null,
            originalName: req.file.originalname,
            storedName,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            category: 'admission_document',
            isPrivate: true,
          })
          .returning();
        uploadedDoc = {
          id: doc.id,
          originalName: doc.originalName,
          sizeBytes: doc.sizeBytes,
        };
      }

      // Notify applicant & administration
      await Promise.all([
        dispatchNotification({
          recipientEmail: created.email,
          recipientRole: 'student',
          title: `NIEM Admission Application Received — ${created.referenceNumber}`,
          body: `Dear ${created.fullName},\n\nYour online admission application for ${created.courseName} has been received.\nReference Number: ${created.referenceNumber}\nCurrent Status: Pending Review\n\nYou may track your application status anytime on the NIEM Admissions page.`,
          relatedEntity: 'application',
          relatedId: created.referenceNumber,
          sendEmail: true,
        }),
        dispatchNotification({
          recipientEmail: process.env.ADMIN_NOTIFY_EMAIL || 'info@smnie.in',
          recipientRole: 'admin',
          title: `New Admission Application: ${created.referenceNumber}`,
          body: `Applicant: ${created.fullName} (${created.email}, ${created.mobile})\nProgramme: ${created.courseName}\nQualification: ${created.qualification}\nCity: ${created.city}`,
          relatedEntity: 'application',
          relatedId: created.referenceNumber,
          sendEmail: true,
        }),
      ]);

      return res.status(201).json({
        application: {
          id: created.id,
          referenceNumber: created.referenceNumber,
          courseName: created.courseName,
          status: created.status,
          createdAt: created.createdAt,
          document: uploadedDoc,
        },
      });
    } catch (err) {
      console.error('Application submission error:', err);
      return res.status(500).json({ error: 'Unable to submit admission application.' });
    }
  }
);

router.get('/applications/track', async (req: Request, res: Response) => {
  try {
    const ref = String(req.query.ref || '').trim().toUpperCase();
    const email = String(req.query.email || '').trim().toLowerCase();

    if (!ref || !email) {
      return res.status(400).json({
        error: 'Both Application Reference Number and applicant email are required to check status.',
      });
    }

    const [app] = await db
      .select({
        referenceNumber: applications.referenceNumber,
        courseName: applications.courseName,
        status: applications.status,
        city: applications.city,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .where(
        and(eq(applications.referenceNumber, ref), eq(applications.email, email))
      );

    if (!app) {
      return res.status(404).json({
        error: 'No application matched that reference number and email combination.',
      });
    }

    return res.json({ application: app });
  } catch (err) {
    console.error('Track application error:', err);
    return res.status(500).json({ error: 'Unable to look up application status.' });
  }
});

router.post('/enquiries', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = enquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please check all required enquiry fields.',
        fieldErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const referenceCode = generateReferenceNumber(
      'NIEM-ENQ',
      new Date().getFullYear(),
      crypto.randomBytes(4).toString('hex')
    );

    const [created] = await db
      .insert(enquiries)
      .values({
        referenceCode,
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        subject: data.subject,
        enquiryType: data.enquiryType,
        courseName: data.courseName || '',
        city: data.city || '',
        message: data.message,
        status: 'new',
        internalNotes: '',
      })
      .returning();

    const adminTarget =
      data.enquiryType === 'examination'
        ? 'Exam@smnie.in'
        : data.enquiryType === 'verification'
          ? 'studentverification@smnie.in'
          : process.env.ADMIN_NOTIFY_EMAIL || 'info@smnie.in';

    await Promise.all([
      dispatchNotification({
        recipientEmail: created.email,
        recipientRole: 'student',
        title: `NIEM Enquiry Confirmation — ${created.referenceCode}`,
        body: `Dear ${created.fullName},\n\nThank you for contacting the National Institute of Engineering & Management.\nReference Code: ${created.referenceCode}\nSubject: ${created.subject}\n\nOur team will respond to your enquiry shortly.`,
        relatedEntity: 'enquiry',
        relatedId: created.referenceCode,
        sendEmail: true,
      }),
      dispatchNotification({
        recipientEmail: adminTarget,
        recipientRole: 'admin',
        title: `New ${data.enquiryType.toUpperCase()} Enquiry: ${created.referenceCode}`,
        body: `From: ${created.fullName} (${created.email}, ${created.mobile})\nSubject: ${created.subject}\nMessage: ${created.message}`,
        relatedEntity: 'enquiry',
        relatedId: created.referenceCode,
        sendEmail: true,
      }),
    ]);

    return res.status(201).json({
      enquiry: {
        id: created.id,
        referenceCode: created.referenceCode,
        subject: created.subject,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    console.error('Enquiry error:', err);
    return res.status(500).json({ error: 'Unable to submit enquiry.' });
  }
});

// ============================================================================
// RESULTS LOOKUP & STUDENT VERIFICATION (PRIVACY-SAFE)
// ============================================================================

router.post('/results/lookup', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = resultLookupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Enter a valid enrollment number and date of birth.',
      });
    }

    const { enrollmentNumber, dateOfBirth } = parsed.data;
    const [student] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.enrollmentNumber, enrollmentNumber),
          eq(students.dateOfBirth, dateOfBirth)
        )
      );

    if (!student) {
      return res.status(404).json({
        error:
          'No authorized student record matched the provided enrollment number and date of birth.',
      });
    }

    const publishedResults = await db
      .select({
        id: examinationResults.id,
        enrollmentNumber: examinationResults.enrollmentNumber,
        termLabel: examinationResults.termLabel,
        programmeName: examinationResults.programmeName,
        examMode: examinationResults.examMode,
        gradeOrStatus: examinationResults.gradeOrStatus,
        percentageOrScore: examinationResults.percentageOrScore,
        remarks: examinationResults.remarks,
        allowDownload: examinationResults.allowDownload,
        publishedAt: examinationResults.publishedAt,
      })
      .from(examinationResults)
      .where(
        and(
          eq(examinationResults.studentId, student.id),
          eq(examinationResults.isPublished, true)
        )
      )
      .orderBy(desc(examinationResults.publishedAt));

    const studentCerts = await db
      .select({
        id: studentCertificates.id,
        enrollmentNumber: studentCertificates.enrollmentNumber,
        certificateNumber: studentCertificates.certificateNumber,
        title: studentCertificates.title,
        issueDate: studentCertificates.issueDate,
        verificationStatus: studentCertificates.verificationStatus,
        originalName: studentCertificates.originalName,
        mimeType: studentCertificates.mimeType,
        sizeBytes: studentCertificates.sizeBytes,
        remarks: studentCertificates.remarks,
      })
      .from(studentCertificates)
      .where(
        and(
          eq(studentCertificates.studentId, student.id),
          eq(studentCertificates.verificationStatus, 'verified'),
          eq(studentCertificates.isPublicViewable, true)
        )
      )
      .orderBy(desc(studentCertificates.createdAt));

    return res.json({
      student: {
        enrollmentNumber: student.enrollmentNumber,
        fullName: student.fullName,
        programmeName: student.programmeName,
        admissionYear: student.admissionYear,
        studyCentre: student.studyCentre,
        status: student.status,
      },
      results: publishedResults,
      certificates: studentCerts.map(formatPublicCertificateSummary),
    });
  } catch (err) {
    console.error('Result lookup error:', err);
    return res.status(500).json({ error: 'Result retrieval failed.' });
  }
});

router.post('/results/:id/download', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const resultId = Number(req.params.id);
    const parsed = resultLookupSchema.safeParse(req.body);
    if (!Number.isInteger(resultId) || !parsed.success) {
      return res.status(400).json({ error: 'Valid result ID, enrollment number, and date of birth required.' });
    }

    const [row] = await db
      .select({
        result: examinationResults,
        student: students,
      })
      .from(examinationResults)
      .innerJoin(students, eq(examinationResults.studentId, students.id))
      .where(
        and(
          eq(examinationResults.id, resultId),
          eq(students.enrollmentNumber, parsed.data.enrollmentNumber),
          eq(students.dateOfBirth, parsed.data.dateOfBirth),
          eq(examinationResults.isPublished, true),
          eq(examinationResults.allowDownload, true)
        )
      );

    if (!row) {
      return res.status(403).json({ error: 'Result document download is not authorized for this record.' });
    }

    const textDoc = [
      'NATIONAL INSTITUTE OF ENGINEERING & MANAGEMENT (NIEM)',
      'Head Office: H-96 Siddharth Building, No. 807 Nehru Place, New Delhi - 110019',
      'Website: www.smnie.in | Examination Desk: Exam@smnie.in',
      '------------------------------------------------------------------------',
      'PROVISIONAL ONLINE EXAMINATION RESULT STATEMENT',
      '------------------------------------------------------------------------',
      `Enrollment Number : ${row.student.enrollmentNumber}`,
      `Student Name      : ${row.student.fullName}`,
      `Programme         : ${row.result.programmeName}`,
      `Study Centre      : ${row.student.studyCentre}`,
      `Examination Term  : ${row.result.termLabel}`,
      `Examination Mode  : ${row.result.examMode}`,
      `Result Status     : ${row.result.gradeOrStatus}`,
      `Score / Standing  : ${row.result.percentageOrScore}`,
      `Remarks           : ${row.result.remarks || 'None'}`,
      `Published Date    : ${row.result.publishedAt ? new Date(row.result.publishedAt).toISOString().slice(0, 10) : 'Authorized'}`,
      '------------------------------------------------------------------------',
      'Note: Official verification inquiries may be directed to studentverification@smnie.in.',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="NIEM-Result-${row.student.enrollmentNumber}-${row.result.id}.txt"`
    );
    return res.send(textDoc);
  } catch (err) {
    console.error('Result download error:', err);
    return res.status(500).json({ error: 'Unable to generate result statement.' });
  }
});

router.post('/verification/request', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = studentVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please complete all verification request fields.',
      });
    }

    const { enrollmentNumber, requesterName, requesterEmail, purpose } = parsed.data;
    let [student] = await db
      .select()
      .from(students)
      .where(eq(students.enrollmentNumber, enrollmentNumber));

    // Also allow lookup by official Certificate Number if no direct enrollment matched
    if (!student) {
      const [certMatch] = await db
        .select({ studentId: studentCertificates.studentId })
        .from(studentCertificates)
        .where(eq(studentCertificates.certificateNumber, enrollmentNumber));
      if (certMatch) {
        const [matchedStudent] = await db
          .select()
          .from(students)
          .where(eq(students.id, certMatch.studentId));
        student = matchedStudent;
      }
    }

    // Log verification request as an audit + enquiry entry without leaking private student info
    const referenceCode = generateReferenceNumber(
      'NIEM-ENQ',
      new Date().getFullYear(),
      crypto.randomBytes(4).toString('hex')
    );

    await db.insert(enquiries).values({
      referenceCode,
      fullName: requesterName,
      email: requesterEmail.toLowerCase(),
      mobile: 'Verification Request',
      subject: `Student Verification: ${enrollmentNumber}`,
      enquiryType: 'verification',
      courseName: student?.programmeName || '',
      city: '',
      message: `Lookup Key: ${enrollmentNumber} | Purpose: ${purpose}`,
      status: student?.verificationStatus === 'verified' ? 'resolved' : 'new',
      internalNotes: student
        ? `Automated registry match (${student.verificationStatus}). No PII exposed publicly.`
        : 'No matching enrollment or certificate number found in automated lookup.',
    });

    await recordAuditLog({
      actorEmail: requesterEmail.toLowerCase(),
      action: 'STUDENT_VERIFICATION_QUERY',
      entityType: 'student',
      entityId: enrollmentNumber,
      details: `Requester: ${requesterName} | Purpose: ${purpose}`,
      ipAddress: req.ip || '',
    });

    if (!student) {
      return res.json({
        found: false,
        referenceCode,
        verificationStatus: 'not_found',
        certificates: [],
        message:
          'No enrollment or certificate record matched that number in the online registry. Your formal verification request has been logged for review by studentverification@smnie.in.',
      });
    }

    const verifiedCerts = await db
      .select({
        id: studentCertificates.id,
        enrollmentNumber: studentCertificates.enrollmentNumber,
        certificateNumber: studentCertificates.certificateNumber,
        title: studentCertificates.title,
        issueDate: studentCertificates.issueDate,
        verificationStatus: studentCertificates.verificationStatus,
        originalName: studentCertificates.originalName,
        mimeType: studentCertificates.mimeType,
        sizeBytes: studentCertificates.sizeBytes,
        remarks: studentCertificates.remarks,
      })
      .from(studentCertificates)
      .where(
        and(
          eq(studentCertificates.studentId, student.id),
          eq(studentCertificates.verificationStatus, 'verified'),
          eq(studentCertificates.isPublicViewable, true)
        )
      )
      .orderBy(desc(studentCertificates.createdAt));

    // Strict privacy: return masked name, programme, standing, and only verified public certificates
    return res.json({
      found: true,
      referenceCode,
      record: {
        enrollmentNumber: student.enrollmentNumber,
        maskedName: maskStudentNameForPublicVerification(student.fullName),
        programmeName: student.programmeName,
        admissionYear: student.admissionYear,
        academicStanding: student.status,
        verificationStatus: student.verificationStatus,
      },
      certificates: verifiedCerts.map(formatPublicCertificateSummary),
      message:
        'For student privacy protection, full personal records are not disclosed publicly. Verified official certificates published by the Registrar are shown below, and formal written confirmation can be obtained from studentverification@smnie.in.',
    });
  } catch (err) {
    console.error('Verification request error:', err);
    return res.status(500).json({ error: 'Unable to process verification request.' });
  }
});

// Shared secured handler for Student ID Verification & Official Certificate Lookup (Hostzens DB + Storage)
async function handleStudentVerificationLookup(req: Request, res: Response) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const rawId = String(req.params.studentId || req.query.studentId || req.query.id || '');
    const validation = validateStudentLookupId(rawId);

    if (!validation.valid) {
      return res.status(400).json({
        error:
          validation.error ||
          'Please enter a valid Student ID (Enrollment Number) or Certificate Number.',
      });
    }

    const lookupId = validation.normalized;

    // Explicit safe-column projection: never expose email, phone, dateOfBirth, or userId publicly
    const safeStudentColumns = {
      id: students.id,
      enrollmentNumber: students.enrollmentNumber,
      fullName: students.fullName,
      programmeName: students.programmeName,
      admissionYear: students.admissionYear,
      studyCentre: students.studyCentre,
      city: students.city,
      status: students.status,
      verificationStatus: students.verificationStatus,
    };

    let [student] = await db
      .select(safeStudentColumns)
      .from(students)
      .where(ilike(students.enrollmentNumber, lookupId))
      .limit(1);

    // Also support searching directly by official verified Certificate Number
    if (!student) {
      const [certMatch] = await db
        .select({ studentId: studentCertificates.studentId })
        .from(studentCertificates)
        .where(
          and(
            ilike(studentCertificates.certificateNumber, lookupId),
            eq(studentCertificates.verificationStatus, 'verified'),
            eq(studentCertificates.isPublicViewable, true)
          )
        )
        .limit(1);

      if (certMatch) {
        const [matchedStudent] = await db
          .select(safeStudentColumns)
          .from(students)
          .where(eq(students.id, certMatch.studentId))
          .limit(1);
        student = matchedStudent;
      }
    }

    if (!student || student.verificationStatus === 'not_verified') {
      return res.json({
        found: false,
        query: lookupId,
        student: null,
        certificates: [],
        message:
          'No verified student record or official certificate was found for this Student ID. Please check the Student ID or contact studentverification@smnie.in.',
      });
    }

    const verifiedCerts = await db
      .select({
        id: studentCertificates.id,
        enrollmentNumber: studentCertificates.enrollmentNumber,
        certificateNumber: studentCertificates.certificateNumber,
        title: studentCertificates.title,
        issueDate: studentCertificates.issueDate,
        verificationStatus: studentCertificates.verificationStatus,
        originalName: studentCertificates.originalName,
        mimeType: studentCertificates.mimeType,
        sizeBytes: studentCertificates.sizeBytes,
        remarks: studentCertificates.remarks,
      })
      .from(studentCertificates)
      .where(
        and(
          eq(studentCertificates.studentId, student.id),
          eq(studentCertificates.verificationStatus, 'verified'),
          eq(studentCertificates.isPublicViewable, true)
        )
      )
      .orderBy(desc(studentCertificates.createdAt));

    return res.json({
      found: true,
      query: lookupId,
      student: {
        enrollmentNumber: student.enrollmentNumber,
        fullName: student.fullName,
        programmeName: student.programmeName,
        admissionYear: student.admissionYear,
        studyCentre: student.studyCentre,
        city: student.city,
        academicStanding: student.status,
        verificationStatus: student.verificationStatus,
      },
      certificates: verifiedCerts.map(formatPublicCertificateSummary),
      message:
        verifiedCerts.length > 0
          ? 'Official student record and verified NIEM certificate retrieved from the Hostzens institutional database.'
          : 'Student enrollment record is verified. No public official certificate has been uploaded for this Student ID yet.',
    });
  } catch (err) {
    console.error('Student verification lookup error:', err);
    return res.status(500).json({ error: 'Unable to verify Student ID right now.' });
  }
}

// Primary RESTful secured endpoint for StudentVerificationForm
router.get('/students/verify/:studentId', verificationLookupLimiter, handleStudentVerificationLookup);

// Backwards-compatible query-parameter verification lookup endpoint
router.get('/verification/lookup', verificationLookupLimiter, handleStudentVerificationLookup);

// ============================================================================
// STUDENT PORTAL ROUTES (AUTHENTICATED)
// ============================================================================

router.get('/student/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const authUser = req.authUser!;

    const [studentRecord] = await db
      .select()
      .from(students)
      .where(or(eq(students.userId, authUser.id), eq(students.email, authUser.email)));

    const userApplications = await db
      .select()
      .from(applications)
      .where(or(eq(applications.userId, authUser.id), eq(applications.email, authUser.email)))
      .orderBy(desc(applications.createdAt));

    const results = studentRecord
      ? await db
          .select()
          .from(examinationResults)
          .where(
            and(
              eq(examinationResults.studentId, studentRecord.id),
              eq(examinationResults.isPublished, true)
            )
          )
          .orderBy(desc(examinationResults.publishedAt))
      : [];

    const appIds = userApplications.map((a) => a.id);
    const allDocs = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));

    const studentDocs = allDocs.filter(
      (d) =>
        d.uploadedByUserId === authUser.id ||
        (studentRecord && d.studentId === studentRecord.id) ||
        (d.applicationId !== null && appIds.includes(d.applicationId))
    );

    const studentCerts = studentRecord
      ? await db
          .select({
            id: studentCertificates.id,
            enrollmentNumber: studentCertificates.enrollmentNumber,
            certificateNumber: studentCertificates.certificateNumber,
            title: studentCertificates.title,
            issueDate: studentCertificates.issueDate,
            verificationStatus: studentCertificates.verificationStatus,
            originalName: studentCertificates.originalName,
            mimeType: studentCertificates.mimeType,
            sizeBytes: studentCertificates.sizeBytes,
            remarks: studentCertificates.remarks,
          })
          .from(studentCertificates)
          .where(
            and(
              eq(studentCertificates.studentId, studentRecord.id),
              eq(studentCertificates.verificationStatus, 'verified')
            )
          )
          .orderBy(desc(studentCertificates.createdAt))
      : [];

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.recipientEmail, authUser.email))
      .orderBy(desc(notifications.createdAt))
      .limit(12);

    return res.json({
      profile: {
        id: authUser.id,
        fullName: authUser.fullName,
        email: authUser.email,
        role: authUser.role,
      },
      student: studentRecord || null,
      applications: userApplications,
      results,
      certificates: studentCerts.map(formatPublicCertificateSummary),
      documents: studentDocs.map((d) => ({
        id: d.id,
        originalName: d.originalName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        category: d.category,
        createdAt: d.createdAt,
      })),
      notifications: userNotifications,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return res.status(500).json({ error: 'Unable to load student portal data.' });
  }
});

// Public / Verified Certificate Viewing & Download Endpoint
router.get('/certificates/:id/view', async (req: AuthRequest, res: Response) => {
  try {
    const certId = Number(req.params.id);
    if (!Number.isInteger(certId)) {
      return res.status(400).json({ error: 'Invalid certificate ID.' });
    }

    const [cert] = await db
      .select()
      .from(studentCertificates)
      .where(eq(studentCertificates.id, certId));

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const queryEnrollment = String(req.query.enrollment || '').trim().toUpperCase();
    const queryCertNumber = String(req.query.cert || '').trim().toUpperCase();

    const verifiedPublicMatch =
      cert.verificationStatus === 'verified' &&
      cert.isPublicViewable &&
      queryEnrollment === cert.enrollmentNumber.toUpperCase() &&
      queryCertNumber === cert.certificateNumber.toUpperCase();

    let owningStudentMatch = false;
    if (!verifiedPublicMatch && cert.verificationStatus !== 'revoked') {
      const authUser = await resolveAuthUser(req);
      if (authUser) {
        const [studentRecord] = await db
          .select({ id: students.id })
          .from(students)
          .where(or(eq(students.userId, authUser.id), eq(students.email, authUser.email)));
        if (studentRecord && studentRecord.id === cert.studentId) {
          owningStudentMatch = true;
        }
      }
    }

    if (!verifiedPublicMatch && !owningStudentMatch) {
      return res.status(403).json({
        error: 'Certificate access requires matching enrollment & certificate verification details.',
      });
    }

    const download = String(req.query.download || '') === '1';
    const disposition = download ? 'attachment' : 'inline';
    const cleanFilename = cert.originalName.replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', cert.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // Serve directly from Hostzens.com Storage bucket first (fallback to legacy base64/disk)
    if (parseHostzenStorageUri(cert.storedName)) {
      const storageFile = await downloadFromHostzenStorage(cert.storedName);
      if (storageFile) {
        return res.send(storageFile.buffer);
      }
    }
    if (cert.fileDataBase64) {
      return res.send(Buffer.from(cert.fileDataBase64, 'base64'));
    }
    const safeFilePath = path.join(PRIVATE_UPLOAD_DIR, path.basename(cert.storedName));
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
    return res.status(404).json({ error: 'Certificate file payload is unavailable.' });
  } catch (err) {
    console.error('Certificate view error:', err);
    return res.status(500).json({ error: 'Unable to load certificate.' });
  }
});

router.get('/documents/:id/download', requireStudentOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const docId = Number(req.params.id);
    if (!Number.isInteger(docId)) {
      return res.status(400).json({ error: 'Invalid document ID.' });
    }

    const [doc] = await db.select().from(documents).where(eq(documents.id, docId));
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const isAdmin = Boolean(req.adminUser);
    const authUser = req.authUser;

    let isOwner = false;
    if (!isAdmin && authUser) {
      isOwner = doc.uploadedByUserId === authUser.id;
      if (!isOwner && doc.applicationId) {
        const [app] = await db
          .select()
          .from(applications)
          .where(eq(applications.id, doc.applicationId));
        if (app && (app.userId === authUser.id || app.email === authUser.email)) {
          isOwner = true;
        }
      }
    }

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied for this private document.' });
    }

    if (parseHostzenStorageUri(doc.storedName)) {
      const storageFile = await downloadFromHostzenStorage(doc.storedName);
      if (storageFile) {
        const cleanFilename = doc.originalName.replace(/["\r\n]/g, '_');
        res.setHeader('Content-Type', doc.mimeType || storageFile.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
        return res.send(storageFile.buffer);
      }
    }

    const safeFilePath = path.join(PRIVATE_UPLOAD_DIR, path.basename(doc.storedName));
    if (!fs.existsSync(safeFilePath)) {
      return res.status(404).json({ error: 'Stored document file is unavailable.' });
    }

    return res.download(safeFilePath, doc.originalName);
  } catch (err) {
    console.error('Document download error:', err);
    return res.status(500).json({ error: 'Unable to download document.' });
  }
});

// ============================================================================
// GOOGLE MAPS SERVER-SIDE GEOCODING PROXY (RESPECTING CF1 & QUOTA DEFENSE)
// ============================================================================

const officeGeocodeCache: Record<string, { lat: number; lng: number; formattedAddress: string; cachedAt: number }> = {};

const NIEM_OFFICES = [
  {
    id: 'delhi',
    label: 'Head Office — New Delhi',
    address: 'H-96 Siddharth Building, No. 807 Nehru Place, New Delhi, 110019, India',
    shortAddress: 'H-96 Siddharth Building, No. 807 Nehru Place, New Delhi, 110019',
    phones: ['011-64506504', '011-22588575'],
    email: 'info@smnie.in',
  },
  {
    id: 'mysore',
    label: 'Regional Office — Mysore',
    address: 'Ashraya Complex No. 271, Lakshmi Vilas Road, Mysore, 570024, India',
    shortAddress: 'Ashraya Complex No. 271, Lakshmi Vilas Road, Mysore – 570024',
    phones: ['011-64506504'],
    email: 'info@smnie.in',
  },
  {
    id: 'bangalore',
    label: 'Regional Office — Bangalore',
    address: '40/1, Sree Venkateshwara Mansion, Opposite Kamala Nehru College, Bangalore, 560004, India',
    shortAddress: '40/1, Sree Venkateshwara Mansion, Opposite Kamala Nehru College, Bangalore – 560004',
    phones: ['011-64506504'],
    email: 'info@smnie.in',
  },
];

router.get('/maps/offices', async (_req: Request, res: Response) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const results = [];
  let quotaExceeded = false;

  for (const office of NIEM_OFFICES) {
    const cached = officeGeocodeCache[office.id];
    const within30Days = cached && Date.now() - cached.cachedAt < 1000 * 60 * 60 * 24 * 25;

    if (within30Days) {
      results.push({ ...office, position: { lat: cached.lat, lng: cached.lng }, formattedAddress: cached.formattedAddress });
      continue;
    }

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          office.address
        )}&region=in&key=${encodeURIComponent(apiKey)}`;
        const geoRes = await fetch(url);
        if (geoRes.status === 429) {
          quotaExceeded = true;
        } else {
          const geoData = (await geoRes.json()) as {
            status?: string;
            results?: Array<{
              formatted_address?: string;
              geometry?: { location?: { lat: number; lng: number } };
            }>;
          };
          if (geoData.status === 'OVER_QUERY_LIMIT' || geoData.status === 'OVER_DAILY_LIMIT') {
            quotaExceeded = true;
          } else if (geoData.status === 'OK' && geoData.results?.[0]?.geometry?.location) {
            const loc = geoData.results[0].geometry.location;
            officeGeocodeCache[office.id] = {
              lat: loc.lat,
              lng: loc.lng,
              formattedAddress: geoData.results[0].formatted_address || office.shortAddress,
              cachedAt: Date.now(),
            };
            results.push({
              ...office,
              position: { lat: loc.lat, lng: loc.lng },
              formattedAddress: officeGeocodeCache[office.id].formattedAddress,
            });
            continue;
          }
        }
      } catch (err) {
        console.error(`Geocode proxy failed for ${office.id}:`, err);
      }
    }

    results.push({ ...office, position: null, formattedAddress: office.shortAddress });
  }

  return res.json({ offices: results, quotaExceeded });
});

// ============================================================================
// ADMIN DASHBOARD ROUTES (STRICT RBAC)
// ============================================================================

router.get('/admin/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [allApps, allEnqs, allCourses, allStudents, recentLogs, recentNotifs] =
      await Promise.all([
        db.select().from(applications).orderBy(desc(applications.createdAt)),
        db.select().from(enquiries).orderBy(desc(enquiries.createdAt)),
        db.select().from(courses),
        db.select().from(students),
        db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
        db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(10),
      ]);

    const stats = {
      totalApplications: allApps.length,
      pendingApplications: allApps.filter(
        (a) => a.status === 'pending' || a.status === 'under_review'
      ).length,
      approvedApplications: allApps.filter((a) => a.status === 'approved').length,
      rejectedApplications: allApps.filter((a) => a.status === 'rejected').length,
      newEnquiries: allEnqs.filter((e) => e.status === 'new').length,
      totalCourses: allCourses.length,
      totalStudents: allStudents.length,
    };

    return res.json({
      stats,
      recentApplications: allApps.slice(0, 6),
      recentEnquiries: allEnqs.slice(0, 6),
      recentActivities: recentLogs,
      recentNotifications: recentNotifs,
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    return res.status(500).json({ error: 'Unable to load admin overview.' });
  }
});

// --- Applications Management ---
router.get('/admin/applications', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const apps = await db.select().from(applications).orderBy(desc(applications.createdAt));
    const docs = await db.select().from(documents);
    const docsByApp: Record<number, typeof docs> = {};
    for (const d of docs) {
      if (d.applicationId) {
        if (!docsByApp[d.applicationId]) docsByApp[d.applicationId] = [];
        docsByApp[d.applicationId].push(d);
      }
    }

    return res.json({
      applications: apps.map((a) => ({
        ...a,
        documents: (docsByApp[a.id] || []).map((d) => ({
          id: d.id,
          originalName: d.originalName,
          mimeType: d.mimeType,
          sizeBytes: d.sizeBytes,
        })),
      })),
    });
  } catch (err) {
    console.error('Admin applications fetch error:', err);
    return res.status(500).json({ error: 'Failed to load applications.' });
  }
});

router.patch('/admin/applications/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    const internalNotes = String(req.body?.internalNotes ?? '').trim();

    if (!['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const [updated] = await db
      .update(applications)
      .set({ status, internalNotes, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_APPLICATION_STATUS',
      entityType: 'application',
      entityId: updated.referenceNumber,
      details: `Status -> ${status}`,
      ipAddress: req.ip || '',
    });

    await dispatchNotification({
      recipientEmail: updated.email,
      recipientRole: 'student',
      title: `NIEM Application Status Update — ${updated.referenceNumber}`,
      body: `Dear ${updated.fullName},\n\nYour admission application (${updated.referenceNumber}) for ${updated.courseName} has been updated to: ${status.replace('_', ' ').toUpperCase()}.\n\nNational Institute of Engineering & Management`,
      relatedEntity: 'application',
      relatedId: updated.referenceNumber,
      sendEmail: true,
    });

    return res.json({ application: updated });
  } catch (err) {
    console.error('Application update error:', err);
    return res.status(500).json({ error: 'Failed to update application.' });
  }
});

router.get('/admin/applications/export', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(applications).orderBy(desc(applications.createdAt));
    const header = [
      'Reference Number',
      'Full Name',
      'Email',
      'Mobile',
      'Course',
      'Qualification',
      'City',
      'Status',
      'Internal Notes',
      'Submitted At',
    ];
    const lines = [
      header.map(escapeCsvCell).join(','),
      ...rows.map((r) =>
        [
          r.referenceNumber,
          r.fullName,
          r.email,
          r.mobile,
          r.courseName,
          r.qualification,
          r.city,
          r.status,
          r.internalNotes,
          r.createdAt.toISOString(),
        ]
          .map(escapeCsvCell)
          .join(',')
      ),
    ];

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'EXPORT_APPLICATIONS_CSV',
      entityType: 'application',
      details: `Exported ${rows.length} applications`,
      ipAddress: req.ip || '',
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="niem-applications.csv"');
    return res.send(lines.join('\n'));
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).json({ error: 'Export failed.' });
  }
});

// --- Enquiries Management ---
router.get('/admin/enquiries', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
    return res.json({ enquiries: rows });
  } catch (err) {
    console.error('Admin enquiries error:', err);
    return res.status(500).json({ error: 'Failed to load enquiries.' });
  }
});

router.patch('/admin/enquiries/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    const internalNotes = String(req.body?.internalNotes ?? '').trim();
    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid enquiry status.' });
    }
    const [updated] = await db
      .update(enquiries)
      .set({ status, internalNotes, updatedAt: new Date() })
      .where(eq(enquiries.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Enquiry not found.' });
    return res.json({ enquiry: updated });
  } catch (err) {
    console.error('Enquiry update error:', err);
    return res.status(500).json({ error: 'Failed to update enquiry.' });
  }
});

// --- Course Management ---
router.get('/admin/courses', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const cats = await db.select().from(courseCategories).orderBy(courseCategories.sortOrder);
    const rows = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        code: courses.code,
        title: courses.title,
        categoryId: courses.categoryId,
        categoryName: courseCategories.name,
        level: courses.level,
        duration: courses.duration,
        learningMode: courses.learningMode,
        eligibility: courses.eligibility,
        feesNote: courses.feesNote,
        summary: courses.summary,
        curriculumOutline: courses.curriculumOutline,
        isActive: courses.isActive,
      })
      .from(courses)
      .innerJoin(courseCategories, eq(courses.categoryId, courseCategories.id))
      .orderBy(desc(courses.createdAt));

    return res.json({ categories: cats, courses: rows });
  } catch (err) {
    console.error('Admin courses error:', err);
    return res.status(500).json({ error: 'Failed to fetch courses.' });
  }
});

router.post('/admin/courses', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = courseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid course details.',
      });
    }

    const d = parsed.data;
    const slug = `${slugify(d.title)}-${crypto.randomBytes(2).toString('hex')}`;
    const [created] = await db
      .insert(courses)
      .values({ ...d, slug })
      .returning();

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'CREATE_COURSE',
      entityType: 'course',
      entityId: created.code,
      details: created.title,
      ipAddress: req.ip || '',
    });

    return res.status(201).json({ course: created });
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({ error: 'Unable to create course (check unique code).' });
  }
});

router.patch('/admin/courses/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const parsed = courseInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid course fields.' });
    }
    const [updated] = await db
      .update(courses)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Course not found.' });

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_COURSE',
      entityType: 'course',
      entityId: updated.code,
      details: updated.title,
      ipAddress: req.ip || '',
    });

    return res.json({ course: updated });
  } catch (err) {
    console.error('Update course error:', err);
    return res.status(500).json({ error: 'Failed to update course.' });
  }
});

router.delete('/admin/courses/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(courses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Course not found.' });

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'ARCHIVE_COURSE',
      entityType: 'course',
      entityId: updated.code,
      details: `Deactivated ${updated.title}`,
      ipAddress: req.ip || '',
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete course error:', err);
    return res.status(500).json({ error: 'Unable to remove course.' });
  }
});

// Helper to keep students.certificate_storage_uri and students.certificate_file_url
// linked to the latest stored Hostzens certificate
async function syncStudentCertificateUri(
  studentId: number,
  verifiedOverride?: boolean
): Promise<{ storageUri: string; fileUrl: string }> {
  const [latestCert] = await db
    .select({
      id: studentCertificates.id,
      enrollmentNumber: studentCertificates.enrollmentNumber,
      certificateNumber: studentCertificates.certificateNumber,
      storedName: studentCertificates.storedName,
    })
    .from(studentCertificates)
    .where(eq(studentCertificates.studentId, studentId))
    .orderBy(desc(studentCertificates.createdAt))
    .limit(1);

  const nextUri = latestCert?.storedName || '';
  const nextFileUrl = latestCert
    ? buildCertificateFileUrl(
        latestCert.id,
        latestCert.enrollmentNumber,
        latestCert.certificateNumber
      )
    : '';

  await db
    .update(students)
    .set({
      certificateStorageUri: nextUri,
      certificateFileUrl: nextFileUrl,
      ...(verifiedOverride ? { verificationStatus: 'verified' } : {}),
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId));

  return { storageUri: nextUri, fileUrl: nextFileUrl };
}

// --- Student Management ---
router.get('/admin/students', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(students).orderBy(desc(students.createdAt));
    return res.json({ students: rows });
  } catch (err) {
    console.error('Admin students error:', err);
    return res.status(500).json({ error: 'Failed to load students.' });
  }
});

router.post(
  '/admin/students',
  requireAdmin,
  (req, res, next) => {
    if (req.is('multipart/form-data')) {
      certificateMemoryUpload.single('certificate')(req, res, (err) => {
        if (err) {
          return res.status(400).json({ error: err.message || 'Invalid certificate upload.' });
        }
        next();
      });
    } else {
      next();
    }
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const enrollmentNumber = String(req.body?.enrollmentNumber || '').trim().toUpperCase();
      const fullName = String(req.body?.fullName || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const phone = String(req.body?.phone || '').trim();
      const dateOfBirth = String(req.body?.dateOfBirth || '').trim();
      const programmeName = String(req.body?.programmeName || '').trim();
      const admissionYear = Number(req.body?.admissionYear || new Date().getFullYear());
      const studyCentre = String(req.body?.studyCentre || 'New Delhi Head Office').trim();
      const city = String(req.body?.city || 'New Delhi').trim();

      if (!enrollmentNumber || !fullName || !email || !dateOfBirth || !programmeName) {
        return res.status(400).json({ error: 'All core student enrollment fields are required.' });
      }

      if (req.file) {
        const fileCheck = validateCertificateUploadFile(req.file.mimetype, req.file.size);
        if (!fileCheck.valid) {
          return res.status(400).json({ error: fileCheck.error });
        }
      }

      const [created] = await db
        .insert(students)
        .values({
          enrollmentNumber,
          fullName,
          email,
          phone: phone || 'N/A',
          dateOfBirth,
          programmeName,
          admissionYear,
          status: 'active',
          verificationStatus: 'verified',
          studyCentre,
          city,
          certificateStorageUri: '',
          certificateFileUrl: '',
        })
        .returning();

      let finalStudent = created;
      let createdCertificate = null;

      if (req.file) {
        const rawCertNum = String(req.body?.certificateNumber || '').trim().toUpperCase();
        const certificateNumber =
          rawCertNum ||
          `NIEM-CERT-${new Date().getFullYear()}-${crypto
            .randomBytes(3)
            .toString('hex')
            .toUpperCase()}`;
        const certTitle =
          String(req.body?.certificateTitle || '').trim() ||
          'Official Programme Completion Certificate';
        const issueDate =
          String(req.body?.issueDate || '').trim() || new Date().toISOString().slice(0, 10);
        const remarks = String(req.body?.remarks || '').trim();

        let storedName: string;
        let fileDataBase64 = '';
        if (isHostzenConfigured()) {
          const objectPath = buildStorageObjectPath(
            'certificates',
            created.enrollmentNumber,
            `${certificateNumber}-${req.file.originalname}`
          );
          const uploaded = await uploadToHostzenStorage({
            objectPath,
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
          });
          storedName = uploaded.storageUri;
        } else {
          const ext = path
            .extname(req.file.originalname)
            .replace(/[^a-zA-Z0-9.]/g, '')
            .slice(0, 10);
          storedName = `db-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
          fileDataBase64 = req.file.buffer.toString('base64');
        }

        const [certRow] = await db
          .insert(studentCertificates)
          .values({
            studentId: created.id,
            enrollmentNumber: created.enrollmentNumber,
            certificateNumber,
            title: certTitle,
            issueDate,
            verificationStatus: 'verified',
            originalName: req.file.originalname,
            storedName,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            fileDataBase64,
            isPublicViewable: true,
            uploadedByAdminEmail: req.adminUser!.email,
            remarks,
          })
          .returning();

        const fileUrl = buildCertificateFileUrl(
          certRow.id,
          certRow.enrollmentNumber,
          certRow.certificateNumber
        );

        const [updatedStudent] = await db
          .update(students)
          .set({
            certificateStorageUri: storedName,
            certificateFileUrl: fileUrl,
            updatedAt: new Date(),
          })
          .where(eq(students.id, created.id))
          .returning();
        if (updatedStudent) {
          finalStudent = updatedStudent;
        }

        const { fileDataBase64: _omitPayload, ...safeCert } = certRow;
        createdCertificate = {
          ...safeCert,
          studentName: finalStudent.fullName,
          programmeName: finalStudent.programmeName,
          fileUrl,
          hostzenObjectUrl: getHostzenStorageObjectUrl(storedName),
        };
      }

      await recordAuditLog({
        actorEmail: req.adminUser!.email,
        action: createdCertificate ? 'CREATE_STUDENT_WITH_CERTIFICATE' : 'CREATE_STUDENT_RECORD',
        entityType: 'student',
        entityId: finalStudent.enrollmentNumber,
        details: createdCertificate
          ? `${finalStudent.fullName} — linked Hostzens certificate ${finalStudent.certificateStorageUri} (${finalStudent.certificateFileUrl})`
          : finalStudent.fullName,
        ipAddress: req.ip || '',
      });

      return res.status(201).json({
        student: finalStudent,
        certificate: createdCertificate,
        fileUrl: finalStudent.certificateFileUrl || null,
        storageUri: finalStudent.certificateStorageUri || null,
      });
    } catch (err) {
      console.error('Create student error:', err);
      return res
        .status(500)
        .json({ error: 'Failed to create student record (check unique enrollment number).' });
    }
  }
);

// Direct per-student certificate upload to Hostzens Storage + student record linkage
router.post(
  '/admin/students/:id/certificate',
  requireAdmin,
  (req, res, next) => {
    certificateMemoryUpload.single('certificate')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Invalid certificate upload.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = Number(req.params.id);
      if (!Number.isInteger(studentId) || studentId <= 0) {
        return res.status(400).json({ error: 'Invalid student ID.' });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Please choose a certificate file (PDF, JPG, PNG, or WEBP up to 5 MB).',
        });
      }

      const fileCheck = validateCertificateUploadFile(req.file.mimetype, req.file.size);
      if (!fileCheck.valid) {
        return res.status(400).json({ error: fileCheck.error });
      }

      const [student] = await db.select().from(students).where(eq(students.id, studentId));
      if (!student) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      const title =
        String(req.body?.title || '').trim() || 'Official Programme Completion Certificate';
      const rawCertNum = String(req.body?.certificateNumber || '').trim().toUpperCase();
      const issueDate =
        String(req.body?.issueDate || '').trim() || new Date().toISOString().slice(0, 10);
      const verificationStatus = String(req.body?.verificationStatus || 'verified').trim();
      const isPublicViewable =
        String(req.body?.isPublicViewable ?? 'true').toLowerCase() !== 'false';
      const remarks = String(req.body?.remarks || '').trim();

      if (title.length < 3) {
        return res.status(400).json({ error: 'Certificate title must be at least 3 characters.' });
      }

      if (!['verified', 'pending_review', 'revoked'].includes(verificationStatus)) {
        return res.status(400).json({ error: 'Invalid verification status.' });
      }

      const certificateNumber =
        rawCertNum ||
        `NIEM-CERT-${new Date().getFullYear()}-${crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase()}`;

      let storedName: string;
      let fileDataBase64 = '';
      if (isHostzenConfigured()) {
        const objectPath = buildStorageObjectPath(
          'certificates',
          student.enrollmentNumber,
          `${certificateNumber}-${req.file.originalname}`
        );
        const uploaded = await uploadToHostzenStorage({
          objectPath,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });
        storedName = uploaded.storageUri;
      } else {
        const ext = path
          .extname(req.file.originalname)
          .replace(/[^a-zA-Z0-9.]/g, '')
          .slice(0, 10);
        storedName = `db-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        fileDataBase64 = req.file.buffer.toString('base64');
      }

      const [created] = await db
        .insert(studentCertificates)
        .values({
          studentId: student.id,
          enrollmentNumber: student.enrollmentNumber,
          certificateNumber,
          title,
          issueDate,
          verificationStatus,
          originalName: req.file.originalname,
          storedName,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          fileDataBase64,
          isPublicViewable,
          uploadedByAdminEmail: req.adminUser!.email,
          remarks,
        })
        .returning();

      const fileUrl = buildCertificateFileUrl(
        created.id,
        created.enrollmentNumber,
        created.certificateNumber
      );

      const [updatedStudent] = await db
        .update(students)
        .set({
          certificateStorageUri: storedName,
          certificateFileUrl: fileUrl,
          ...(verificationStatus === 'verified' ? { verificationStatus: 'verified' } : {}),
          updatedAt: new Date(),
        })
        .where(eq(students.id, student.id))
        .returning();

      const { fileDataBase64: _omitPayload, ...safeCert } = created;

      await recordAuditLog({
        actorEmail: req.adminUser!.email,
        action: 'UPLOAD_STUDENT_CERTIFICATE_TO_HOSTZEN',
        entityType: 'student',
        entityId: student.enrollmentNumber,
        details: `Linked ${safeCert.certificateNumber} (${safeCert.title}) in Hostzens Storage: ${storedName} (${fileUrl})`,
        ipAddress: req.ip || '',
      });

      return res.status(201).json({
        student: updatedStudent || {
          ...student,
          certificateStorageUri: storedName,
          certificateFileUrl: fileUrl,
        },
        certificate: {
          ...safeCert,
          studentName: student.fullName,
          programmeName: student.programmeName,
          fileUrl,
          hostzenObjectUrl: getHostzenStorageObjectUrl(storedName),
        },
        fileUrl,
        storageUri: storedName,
      });
    } catch (err) {
      console.error('Per-student certificate upload error:', err);
      return res.status(500).json({
        error:
          'Unable to upload certificate to Hostzens Storage (verify certificate number is unique).',
      });
    }
  }
);

router.patch('/admin/students/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body?.status || 'active');
    const verificationStatus = String(req.body?.verificationStatus || 'verified');
    const studyCentre = String(req.body?.studyCentre || '').trim();

    const [updated] = await db
      .update(students)
      .set({
        status,
        verificationStatus,
        ...(studyCentre ? { studyCentre } : {}),
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Student not found.' });

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_STUDENT_STATUS',
      entityType: 'student',
      entityId: updated.enrollmentNumber,
      details: `Standing: ${status} | Verification: ${verificationStatus}`,
      ipAddress: req.ip || '',
    });

    return res.json({ student: updated });
  } catch (err) {
    console.error('Update student error:', err);
    return res.status(500).json({ error: 'Failed to update student record.' });
  }
});

// --- Results Management ---
router.get('/admin/results', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db
      .select({
        id: examinationResults.id,
        studentId: examinationResults.studentId,
        enrollmentNumber: examinationResults.enrollmentNumber,
        studentName: students.fullName,
        termLabel: examinationResults.termLabel,
        programmeName: examinationResults.programmeName,
        examMode: examinationResults.examMode,
        gradeOrStatus: examinationResults.gradeOrStatus,
        percentageOrScore: examinationResults.percentageOrScore,
        remarks: examinationResults.remarks,
        isPublished: examinationResults.isPublished,
        allowDownload: examinationResults.allowDownload,
        publishedAt: examinationResults.publishedAt,
      })
      .from(examinationResults)
      .innerJoin(students, eq(examinationResults.studentId, students.id))
      .orderBy(desc(examinationResults.createdAt));

    return res.json({ results: rows });
  } catch (err) {
    console.error('Admin results error:', err);
    return res.status(500).json({ error: 'Failed to load examination results.' });
  }
});

router.post('/admin/results', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = Number(req.body?.studentId);
    const termLabel = String(req.body?.termLabel || '').trim();
    const examMode = String(req.body?.examMode || 'Study Centre Supervised Examination').trim();
    const gradeOrStatus = String(req.body?.gradeOrStatus || '').trim();
    const percentageOrScore = String(req.body?.percentageOrScore || '').trim();
    const remarks = String(req.body?.remarks || '').trim();
    const isPublished = Boolean(req.body?.isPublished);
    const allowDownload = Boolean(req.body?.allowDownload);

    const [st] = await db.select().from(students).where(eq(students.id, studentId));
    if (!st) return res.status(404).json({ error: 'Selected student was not found.' });
    if (!termLabel || !gradeOrStatus || !percentageOrScore) {
      return res.status(400).json({ error: 'Term label, result status, and score are required.' });
    }

    const [created] = await db
      .insert(examinationResults)
      .values({
        studentId: st.id,
        enrollmentNumber: st.enrollmentNumber,
        termLabel,
        programmeName: st.programmeName,
        examMode,
        gradeOrStatus,
        percentageOrScore,
        remarks,
        isPublished,
        allowDownload,
        publishedAt: isPublished ? new Date() : null,
      })
      .returning();

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'CREATE_EXAM_RESULT',
      entityType: 'examination_result',
      entityId: `${st.enrollmentNumber} (${termLabel})`,
      details: `Published: ${isPublished}, Download: ${allowDownload}`,
      ipAddress: req.ip || '',
    });

    return res.status(201).json({ result: created });
  } catch (err) {
    console.error('Create result error:', err);
    return res.status(500).json({ error: 'Failed to save examination result.' });
  }
});

router.patch('/admin/results/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const isPublished = Boolean(req.body?.isPublished);
    const allowDownload = Boolean(req.body?.allowDownload);
    const gradeOrStatus = req.body?.gradeOrStatus ? String(req.body.gradeOrStatus).trim() : undefined;
    const percentageOrScore = req.body?.percentageOrScore
      ? String(req.body.percentageOrScore).trim()
      : undefined;

    const [updated] = await db
      .update(examinationResults)
      .set({
        isPublished,
        allowDownload,
        ...(gradeOrStatus ? { gradeOrStatus } : {}),
        ...(percentageOrScore ? { percentageOrScore } : {}),
        publishedAt: isPublished ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(examinationResults.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Result record not found.' });

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_EXAM_RESULT',
      entityType: 'examination_result',
      entityId: String(id),
      details: `Published: ${isPublished} | Download: ${allowDownload}`,
      ipAddress: req.ip || '',
    });

    return res.json({ result: updated });
  } catch (err) {
    console.error('Update result error:', err);
    return res.status(500).json({ error: 'Failed to update result.' });
  }
});

// --- Content, Announcements & Accreditations Management ---
router.get('/admin/announcements', requireAdmin, async (_req: AuthRequest, res: Response) => {
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.publishedDate));
  return res.json({ announcements: rows });
});

router.post('/admin/announcements', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const title = String(req.body?.title || '').trim();
    const category = String(req.body?.category || 'Academic Notice').trim();
    const summary = String(req.body?.summary || '').trim();
    const content = String(req.body?.content || '').trim();
    const publishedDate =
      String(req.body?.publishedDate || '').trim() || new Date().toISOString().slice(0, 10);
    const isPinned = Boolean(req.body?.isPinned);

    if (title.length < 4 || summary.length < 10) {
      return res.status(400).json({ error: 'Announcement title and summary are required.' });
    }

    const slug = `${slugify(title)}-${crypto.randomBytes(2).toString('hex')}`;
    const [created] = await db
      .insert(announcements)
      .values({
        slug,
        title,
        category,
        summary,
        content: content || summary,
        publishedDate,
        isPublished: true,
        isPinned,
      })
      .returning();

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'CREATE_ANNOUNCEMENT',
      entityType: 'announcement',
      entityId: created.slug,
      details: created.title,
      ipAddress: req.ip || '',
    });

    return res.status(201).json({ announcement: created });
  } catch (err) {
    console.error('Create announcement error:', err);
    return res.status(500).json({ error: 'Failed to publish announcement.' });
  }
});

router.delete('/admin/announcements/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(announcements).where(eq(announcements.id, id));
  return res.json({ ok: true });
});

router.patch('/admin/accreditations/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const description = String(req.body?.description || '').trim();
    const verificationStatus = String(req.body?.verificationStatus || 'pending_verification');
    const verificationNote = String(req.body?.verificationNote || '').trim();

    if (
      !['documented', 'pending_verification', 'reference_only', 'under_review'].includes(
        verificationStatus
      )
    ) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }

    const [updated] = await db
      .update(accreditationRecords)
      .set({
        ...(description ? { description } : {}),
        verificationStatus,
        ...(verificationNote ? { verificationNote } : {}),
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accreditationRecords.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Accreditation record not found.' });

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_ACCREDITATION_STATUS',
      entityType: 'accreditation',
      entityId: updated.code,
      details: `${updated.bodyName} -> ${verificationStatus}`,
      ipAddress: req.ip || '',
    });

    return res.json({ record: updated });
  } catch (err) {
    console.error('Update accreditation error:', err);
    return res.status(500).json({ error: 'Failed to update accreditation record.' });
  }
});

router.patch('/admin/site-settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body?.settings as Record<string, string> | undefined;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Settings object is required.' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await db
        .update(siteSettings)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    }

    await recordAuditLog({
      actorUserId: req.authUser!.id,
      actorEmail: req.authUser!.email,
      action: 'UPDATE_SITE_CONTENT',
      entityType: 'site_settings',
      details: `Updated keys: ${Object.keys(updates).join(', ')}`,
      ipAddress: req.ip || '',
    });

    const rows = await db.select().from(siteSettings);
    return res.json({ items: rows });
  } catch (err) {
    console.error('Site settings update error:', err);
    return res.status(500).json({ error: 'Failed to save institutional settings.' });
  }
});

// --- Student Verification & Certificates Management (Admin Only) ---
router.get('/admin/certificates', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [certRows, verificationLogs] = await Promise.all([
      db
        .select({
          id: studentCertificates.id,
          studentId: studentCertificates.studentId,
          enrollmentNumber: studentCertificates.enrollmentNumber,
          studentName: students.fullName,
          programmeName: students.programmeName,
          certificateNumber: studentCertificates.certificateNumber,
          title: studentCertificates.title,
          issueDate: studentCertificates.issueDate,
          verificationStatus: studentCertificates.verificationStatus,
          originalName: studentCertificates.originalName,
          storedName: studentCertificates.storedName,
          mimeType: studentCertificates.mimeType,
          sizeBytes: studentCertificates.sizeBytes,
          isPublicViewable: studentCertificates.isPublicViewable,
          uploadedByAdminEmail: studentCertificates.uploadedByAdminEmail,
          remarks: studentCertificates.remarks,
          createdAt: studentCertificates.createdAt,
        })
        .from(studentCertificates)
        .innerJoin(students, eq(studentCertificates.studentId, students.id))
        .orderBy(desc(studentCertificates.createdAt)),
      db
        .select()
        .from(enquiries)
        .where(eq(enquiries.enquiryType, 'verification'))
        .orderBy(desc(enquiries.createdAt))
        .limit(40),
    ]);

    return res.json({
      certificates: certRows,
      verifications: verificationLogs,
    });
  } catch (err) {
    console.error('Admin certificates load error:', err);
    return res.status(500).json({ error: 'Failed to load student verification certificates.' });
  }
});

// Unified Admin Endpoint: Add Student + Upload Official Certificate directly into Hostzens DB
router.post(
  '/admin/student-verification',
  requireAdmin,
  (req, res, next) => {
    certificateMemoryUpload.single('certificate')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Invalid certificate upload.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const parsed = quickStudentVerificationSchema.safeParse({
        enrollmentNumber: req.body?.enrollmentNumber,
        fullName: req.body?.fullName,
        programmeName: req.body?.programmeName,
        admissionYear: req.body?.admissionYear || new Date().getFullYear(),
        studyCentre: req.body?.studyCentre || 'New Delhi Head Office (Nehru Place)',
        city: req.body?.city || 'New Delhi',
        email: req.body?.email || '',
        phone: req.body?.phone || '',
        dateOfBirth: req.body?.dateOfBirth || '',
        status: req.body?.status || 'active',
        certificateTitle:
          req.body?.certificateTitle || 'Official Programme Completion Certificate',
        certificateNumber: req.body?.certificateNumber || '',
        issueDate: req.body?.issueDate || new Date().toISOString().slice(0, 10),
        verificationStatus: req.body?.verificationStatus || 'verified',
        isPublicViewable: String(req.body?.isPublicViewable ?? 'true').toLowerCase() !== 'false',
        remarks: req.body?.remarks || '',
      });

      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Please check all required student fields.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'Please upload the student’s official certificate (PNG, JPG, WEBP, or PDF up to 5 MB).',
        });
      }

      const fileCheck = validateCertificateUploadFile(req.file.mimetype, req.file.size);
      if (!fileCheck.valid) {
        return res.status(400).json({ error: fileCheck.error });
      }

      const data = parsed.data;

      // Check if student with this Student ID already exists; update or create in Hostzens DB
      let [student] = await db
        .select()
        .from(students)
        .where(ilike(students.enrollmentNumber, data.enrollmentNumber));

      let createdNewStudent = false;
      if (!student) {
        const safeEmail =
          data.email ||
          `${data.enrollmentNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.smnie.in`;
        const [insertedStudent] = await db
          .insert(students)
          .values({
            enrollmentNumber: data.enrollmentNumber,
            fullName: data.fullName,
            email: safeEmail,
            phone: data.phone || 'N/A',
            dateOfBirth: data.dateOfBirth || '2000-01-01',
            programmeName: data.programmeName,
            admissionYear: data.admissionYear,
            status: data.status,
            verificationStatus:
              data.verificationStatus === 'revoked' ? 'not_verified' : data.verificationStatus,
            studyCentre: data.studyCentre || 'New Delhi Head Office (Nehru Place)',
            city: data.city || 'New Delhi',
          })
          .returning();
        student = insertedStudent;
        createdNewStudent = true;
      } else {
        const [updatedStudent] = await db
          .update(students)
          .set({
            fullName: data.fullName,
            programmeName: data.programmeName,
            admissionYear: data.admissionYear,
            status: data.status,
            verificationStatus:
              data.verificationStatus === 'revoked' ? 'not_verified' : data.verificationStatus,
            studyCentre: data.studyCentre || student.studyCentre,
            ...(data.email ? { email: data.email } : {}),
            ...(data.phone ? { phone: data.phone } : {}),
            ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
            updatedAt: new Date(),
          })
          .where(eq(students.id, student.id))
          .returning();
        student = updatedStudent;
      }

      const certificateNumber =
        (data.certificateNumber && data.certificateNumber.toUpperCase()) ||
        `NIEM-CERT-${new Date().getFullYear()}-${crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase()}`;

      let storedName: string;
      let fileDataBase64 = '';
      if (isHostzenConfigured()) {
        const objectPath = buildStorageObjectPath(
          'certificates',
          student.enrollmentNumber,
          `${certificateNumber}-${req.file.originalname}`
        );
        const uploaded = await uploadToHostzenStorage({
          objectPath,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });
        storedName = uploaded.storageUri;
      } else {
        const ext = path
          .extname(req.file.originalname)
          .replace(/[^a-zA-Z0-9.]/g, '')
          .slice(0, 10);
        storedName = `db-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        fileDataBase64 = req.file.buffer.toString('base64');
      }

      const [createdCert] = await db
        .insert(studentCertificates)
        .values({
          studentId: student.id,
          enrollmentNumber: student.enrollmentNumber,
          certificateNumber,
          title: data.certificateTitle,
          issueDate: data.issueDate || new Date().toISOString().slice(0, 10),
          verificationStatus: data.verificationStatus,
          originalName: req.file.originalname,
          storedName,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          fileDataBase64,
          isPublicViewable: data.isPublicViewable,
          uploadedByAdminEmail: req.adminUser!.email,
          remarks: data.remarks,
        })
        .returning();

      const synced = await syncStudentCertificateUri(
        student.id,
        data.verificationStatus === 'verified'
      );
      student = {
        ...student,
        certificateStorageUri: synced.storageUri || storedName,
        certificateFileUrl: synced.fileUrl,
      };

      const { fileDataBase64: _omitPayload, ...safeCreatedCert } = createdCert;

      await recordAuditLog({
        actorEmail: req.adminUser!.email,
        action: createdNewStudent
          ? 'ADD_STUDENT_WITH_CERTIFICATE'
          : 'UPDATE_STUDENT_AND_UPLOAD_CERTIFICATE',
        entityType: 'student_certificate',
        entityId: safeCreatedCert.certificateNumber,
        details: `${student.enrollmentNumber} (${student.fullName}) — ${safeCreatedCert.title} uploaded to Hostzens Storage (${storedName})`,
        ipAddress: req.ip || '',
      });

      return res.status(201).json({
        createdNewStudent,
        student,
        certificate: {
          ...safeCreatedCert,
          studentName: student.fullName,
          programmeName: student.programmeName,
          fileUrl: synced.fileUrl,
          hostzenObjectUrl: getHostzenStorageObjectUrl(storedName),
        },
        fileUrl: synced.fileUrl,
        storageUri: storedName,
      });
    } catch (err) {
      console.error('Unified student verification save error:', err);
      return res.status(500).json({
        error:
          'Unable to save student and certificate to Hostzens database (verify that the certificate number is unique).',
      });
    }
  }
);

router.post(
  '/admin/certificates',
  requireAdmin,
  (req, res, next) => {
    certificateMemoryUpload.single('certificate')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Invalid certificate upload.' });
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const studentId = Number(req.body?.studentId);
      const title = String(req.body?.title || '').trim();
      const rawCertNum = String(req.body?.certificateNumber || '').trim().toUpperCase();
      const issueDate =
        String(req.body?.issueDate || '').trim() || new Date().toISOString().slice(0, 10);
      const verificationStatus = String(req.body?.verificationStatus || 'verified').trim();
      const isPublicViewable =
        String(req.body?.isPublicViewable ?? 'true').toLowerCase() !== 'false';
      const remarks = String(req.body?.remarks || '').trim();

      if (!req.file) {
        return res.status(400).json({
          error: 'Please upload a certificate file (PDF, JPG, PNG, or WEBP up to 5 MB).',
        });
      }

      const fileCheck = validateCertificateUploadFile(req.file.mimetype, req.file.size);
      if (!fileCheck.valid) {
        return res.status(400).json({ error: fileCheck.error });
      }

      if (!Number.isInteger(studentId) || title.length < 3) {
        return res.status(400).json({
          error: 'Select a valid enrolled student and provide a certificate title.',
        });
      }

      if (!['verified', 'pending_review', 'revoked'].includes(verificationStatus)) {
        return res.status(400).json({ error: 'Invalid verification status.' });
      }

      const [student] = await db.select().from(students).where(eq(students.id, studentId));
      if (!student) {
        return res.status(404).json({ error: 'Selected student record was not found.' });
      }

      const certificateNumber =
        rawCertNum ||
        `NIEM-CERT-${new Date().getFullYear()}-${crypto
          .randomBytes(3)
          .toString('hex')
          .toUpperCase()}`;

      let storedName: string;
      let fileDataBase64 = '';
      if (isHostzenConfigured()) {
        const objectPath = buildStorageObjectPath(
          'certificates',
          student.enrollmentNumber,
          `${certificateNumber}-${req.file.originalname}`
        );
        const uploaded = await uploadToHostzenStorage({
          objectPath,
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
        });
        storedName = uploaded.storageUri;
      } else {
        const ext = path
          .extname(req.file.originalname)
          .replace(/[^a-zA-Z0-9.]/g, '')
          .slice(0, 10);
        storedName = `db-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        fileDataBase64 = req.file.buffer.toString('base64');
      }

      const [created] = await db
        .insert(studentCertificates)
        .values({
          studentId: student.id,
          enrollmentNumber: student.enrollmentNumber,
          certificateNumber,
          title,
          issueDate,
          verificationStatus,
          originalName: req.file.originalname,
          storedName,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          fileDataBase64,
          isPublicViewable,
          uploadedByAdminEmail: req.adminUser!.email,
          remarks,
        })
        .returning();

      await syncStudentCertificateUri(student.id, verificationStatus === 'verified');

      const { fileDataBase64: _omitCreatedPayload, ...safeCreated } = created;

      await recordAuditLog({
        actorEmail: req.adminUser!.email,
        action: 'UPLOAD_STUDENT_CERTIFICATE',
        entityType: 'student_certificate',
        entityId: safeCreated.certificateNumber,
        details: `${student.enrollmentNumber} — ${safeCreated.title} (${verificationStatus}) uploaded to Hostzens Storage (${storedName})`,
        ipAddress: req.ip || '',
      });

      return res.status(201).json({
        certificate: {
          ...safeCreated,
          studentName: student.fullName,
          programmeName: student.programmeName,
        },
      });
    } catch (err) {
      console.error('Upload certificate error:', err);
      return res.status(500).json({
        error: 'Unable to upload certificate (verify that the certificate number is unique).',
      });
    }
  }
);

router.patch('/admin/certificates/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID.' });
    }

    const title = req.body?.title ? String(req.body.title).trim() : undefined;
    const issueDate = req.body?.issueDate ? String(req.body.issueDate).trim() : undefined;
    const verificationStatus = req.body?.verificationStatus
      ? String(req.body.verificationStatus).trim()
      : undefined;
    const isPublicViewable =
      typeof req.body?.isPublicViewable === 'boolean' ? req.body.isPublicViewable : undefined;
    const remarks =
      req.body?.remarks !== undefined ? String(req.body.remarks).trim() : undefined;

    if (
      verificationStatus &&
      !['verified', 'pending_review', 'revoked'].includes(verificationStatus)
    ) {
      return res.status(400).json({ error: 'Invalid verification status.' });
    }

    const [updated] = await db
      .update(studentCertificates)
      .set({
        ...(title ? { title } : {}),
        ...(issueDate ? { issueDate } : {}),
        ...(verificationStatus ? { verificationStatus } : {}),
        ...(isPublicViewable !== undefined ? { isPublicViewable } : {}),
        ...(remarks !== undefined ? { remarks } : {}),
        updatedAt: new Date(),
      })
      .where(eq(studentCertificates.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const { fileDataBase64: _omitUpdatedPayload, ...safeUpdated } = updated;

    await recordAuditLog({
      actorEmail: req.adminUser!.email,
      action: 'UPDATE_STUDENT_CERTIFICATE',
      entityType: 'student_certificate',
      entityId: safeUpdated.certificateNumber,
      details: `Status: ${safeUpdated.verificationStatus} | Public: ${safeUpdated.isPublicViewable}`,
      ipAddress: req.ip || '',
    });

    return res.json({ certificate: safeUpdated });
  } catch (err) {
    console.error('Update certificate error:', err);
    return res.status(500).json({ error: 'Failed to update certificate record.' });
  }
});

router.delete('/admin/certificates/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID.' });
    }

    const [existing] = await db
      .select({
        id: studentCertificates.id,
        studentId: studentCertificates.studentId,
        certificateNumber: studentCertificates.certificateNumber,
        storedName: studentCertificates.storedName,
      })
      .from(studentCertificates)
      .where(eq(studentCertificates.id, id));

    if (!existing) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    await db.delete(studentCertificates).where(eq(studentCertificates.id, id));
    await syncStudentCertificateUri(existing.studentId);

    if (parseHostzenStorageUri(existing.storedName)) {
      try {
        await deleteFromHostzenStorage(existing.storedName);
      } catch (storageErr) {
        console.error('Hostzens Storage cleanup warning:', storageErr);
      }
    } else {
      const safeFilePath = path.join(PRIVATE_UPLOAD_DIR, path.basename(existing.storedName));
      if (fs.existsSync(safeFilePath)) {
        try {
          fs.unlinkSync(safeFilePath);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    await recordAuditLog({
      actorEmail: req.adminUser!.email,
      action: 'DELETE_STUDENT_CERTIFICATE',
      entityType: 'student_certificate',
      entityId: existing.certificateNumber,
      details: 'Removed student certificate from registry and Hostzens Storage',
      ipAddress: req.ip || '',
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete certificate error:', err);
    return res.status(500).json({ error: 'Failed to delete certificate.' });
  }
});

router.get('/admin/certificates/:id/file', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID.' });
    }

    const [cert] = await db
      .select()
      .from(studentCertificates)
      .where(eq(studentCertificates.id, id));

    if (!cert) {
      return res.status(404).json({ error: 'Certificate not found.' });
    }

    const download = String(req.query.download || '') === '1';
    const disposition = download ? 'attachment' : 'inline';
    const cleanFilename = cert.originalName.replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', cert.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${disposition}; filename="${cleanFilename}"`);

    // Serve directly from Hostzens.com Storage bucket first (fallback to legacy base64/disk)
    if (parseHostzenStorageUri(cert.storedName)) {
      const storageFile = await downloadFromHostzenStorage(cert.storedName);
      if (storageFile) {
        return res.send(storageFile.buffer);
      }
    }
    if (cert.fileDataBase64) {
      return res.send(Buffer.from(cert.fileDataBase64, 'base64'));
    }
    const safeFilePath = path.join(PRIVATE_UPLOAD_DIR, path.basename(cert.storedName));
    if (fs.existsSync(safeFilePath)) {
      return res.sendFile(safeFilePath);
    }
    return res.status(404).json({ error: 'Certificate file payload is unavailable.' });
  } catch (err) {
    console.error('Admin certificate file error:', err);
    return res.status(500).json({ error: 'Failed to load certificate file.' });
  }
});

export default router;
