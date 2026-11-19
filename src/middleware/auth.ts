import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { adminSessions, adminUsers, auditLogs, roles, users } from '../db/schema.ts';
import { ensureSeeded } from '../db/seed.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string | null;
  email: string;
  fullName: string;
  role: 'admin' | 'staff' | 'student';
}

export interface AuthenticatedAdmin {
  id: number;
  sessionId: string;
  email: string;
  fullName: string;
  roleTitle: string;
  roleCode: 'SUPER_ADMIN' | 'ADMIN';
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
  adminUser?: AuthenticatedAdmin;
}

const PUBLIC_SESSION_COOKIE_NAME = 'niem_session';
const ADMIN_SESSION_COOKIE_NAME = 'niem_admin_session';

const PUBLIC_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
export const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getPublicSessionSecret(): string {
  return process.env.SESSION_SECRET || 'niem-institutional-public-session-key-2026';
}

function getAdminSessionSecret(): string {
  const base = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || 'niem-institutional-admin-key-2026';
  return crypto.createHash('sha256').update(`niem-super-admin-scope::${base}`).digest('hex');
}

function signPayload(payload: Record<string, unknown>, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifySignedPayload<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, sig] = parts;
    if (!data || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T & { exp?: number };
    if (!parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isHttpsRequest(req: Request): boolean {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return req.secure || proto === 'https' || process.env.NODE_ENV === 'production';
}

// ============================================================================
// PUBLIC / STUDENT SESSION HELPERS (STRICTLY ISOLATED FROM ADMIN PANEL)
// ============================================================================

export function createSessionToken(payload: { userId: number; email: string; role: string }): string {
  return signPayload(
    {
      scope: 'student',
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      exp: Date.now() + PUBLIC_SESSION_TTL_MS,
    },
    getPublicSessionSecret()
  );
}

export function verifySessionToken(
  token: string
): { userId: number; email: string; role: string } | null {
  const parsed = verifySignedPayload<{
    scope?: string;
    userId: number;
    email: string;
    role: string;
  }>(token, getPublicSessionSecret());
  if (!parsed || parsed.scope !== 'student') return null;
  return { userId: parsed.userId, email: parsed.email, role: parsed.role };
}

export function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isHttpsRequest(req);
  res.cookie(PUBLIC_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: PUBLIC_SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  const secure = isHttpsRequest(req);
  res.clearCookie(PUBLIC_SESSION_COOKIE_NAME, {
    path: '/',
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
}

export async function resolveAuthUser(req: AuthRequest): Promise<AuthenticatedUser | null> {
  let rawToken: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.slice('Bearer '.length).trim();
    if (candidate) rawToken = candidate;
  }
  if (!rawToken) {
    rawToken = req.cookies?.[PUBLIC_SESSION_COOKIE_NAME];
  }
  if (!rawToken) return null;

  const payload = verifySessionToken(rawToken);
  if (!payload) return null;

  await ensureSeeded();
  const rows = await db
    .select({
      id: users.id,
      uid: users.uid,
      email: users.email,
      fullName: users.fullName,
      isActive: users.isActive,
      roleName: roles.name,
    })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, payload.userId));

  const found = rows[0];
  if (found && found.isActive) {
    return {
      id: found.id,
      uid: found.uid,
      email: found.email,
      fullName: found.fullName,
      role: found.roleName as AuthenticatedUser['role'],
    };
  }
  return null;
}

// ============================================================================
// INDEPENDENT ADMIN SESSION HELPERS (SUPER_ADMIN RBAC + DB REVOCATION)
// ============================================================================

export function createAdminSessionToken(payload: {
  sessionId: string;
  adminUserId: number;
  email: string;
  roleCode: string;
  expiresAtMs: number;
}): string {
  return signPayload(
    {
      scope: 'admin',
      sid: payload.sessionId,
      adminId: payload.adminUserId,
      email: payload.email,
      roleCode: payload.roleCode,
      exp: payload.expiresAtMs,
    },
    getAdminSessionSecret()
  );
}

export function verifyAdminSessionToken(
  token: string
): { sessionId: string; adminUserId: number; email: string; roleCode: string } | null {
  const parsed = verifySignedPayload<{
    scope?: string;
    sid: string;
    adminId: number;
    email: string;
    roleCode: string;
  }>(token, getAdminSessionSecret());
  if (!parsed || parsed.scope !== 'admin' || !parsed.sid || !parsed.adminId) return null;
  return {
    sessionId: parsed.sid,
    adminUserId: parsed.adminId,
    email: parsed.email,
    roleCode: parsed.roleCode,
  };
}

export function setAdminSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isHttpsRequest(req);
  res.cookie(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: ADMIN_SESSION_TTL_MS,
    path: '/api',
  });
}

export function clearAdminSessionCookie(req: Request, res: Response): void {
  const secure = isHttpsRequest(req);
  res.clearCookie(ADMIN_SESSION_COOKIE_NAME, {
    path: '/api',
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
}

export function extractAdminTokenFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.slice('Bearer '.length).trim();
    if (candidate && verifyAdminSessionToken(candidate)) {
      return candidate;
    }
  }
  const cookieToken = req.cookies?.[ADMIN_SESSION_COOKIE_NAME];
  if (cookieToken && verifyAdminSessionToken(cookieToken)) {
    return cookieToken;
  }
  return undefined;
}

export async function resolveAdminUser(req: AuthRequest): Promise<AuthenticatedAdmin | null> {
  const rawToken = extractAdminTokenFromRequest(req);
  if (!rawToken) return null;

  const payload = verifyAdminSessionToken(rawToken);
  if (!payload) return null;

  await ensureSeeded();

  const rows = await db
    .select({
      sessionId: adminSessions.sessionId,
      expiresAt: adminSessions.expiresAt,
      revokedAt: adminSessions.revokedAt,
      adminId: adminUsers.id,
      email: adminUsers.email,
      fullName: adminUsers.fullName,
      roleTitle: adminUsers.roleTitle,
      roleCode: adminUsers.roleCode,
      isActive: adminUsers.isActive,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(
      and(
        eq(adminSessions.sessionId, payload.sessionId),
        eq(adminUsers.id, payload.adminUserId),
        isNull(adminSessions.revokedAt)
      )
    );

  const found = rows[0];
  if (!found || !found.isActive) return null;

  const expiresMs = found.expiresAt instanceof Date ? found.expiresAt.getTime() : new Date(found.expiresAt).getTime();
  if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
    return null;
  }

  return {
    id: found.adminId,
    sessionId: found.sessionId,
    email: found.email,
    fullName: found.fullName,
    roleTitle: found.roleTitle,
    roleCode: (found.roleCode === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN'),
  };
}

// ============================================================================
// EXPRESS MIDDLEWARE GUARDS
// ============================================================================

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const user = await resolveAuthUser(req);
    if (user) {
      req.authUser = user;
    }
  } catch {
    // ignore optional auth failure
  }
  next();
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await resolveAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    }
    req.authUser = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

/**
 * Strictly requires an active, non-revoked Admin Panel session from admin_sessions + admin_users.
 * Public frontend student sessions (niem_session / scope: 'student') are ALWAYS rejected.
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const admin = await resolveAdminUser(req);
    if (!admin) {
      // Check if caller presented a public student session attempting to access admin APIs
      const publicUser = await resolveAuthUser(req);
      if (publicUser) {
        return res.status(403).json({
          error: 'Access denied. Public portal sessions cannot access Administrator APIs.',
        });
      }
      return res.status(401).json({
        error: 'Administrator authentication required. Please sign in at the Admin Panel.',
      });
    }

    req.adminUser = admin;
    // Provide compatible actor metadata for existing audit logging without exposing public users
    req.authUser = {
      id: 0,
      uid: `admin:${admin.id}`,
      email: admin.email,
      fullName: admin.fullName,
      role: 'admin',
    };
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({ error: 'Administrator authentication failed.' });
  }
};

/**
 * Allows either an authenticated Admin (via Admin session) OR an authenticated Student (via Public session).
 * Used specifically for authorized private document downloads.
 */
export const requireStudentOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const admin = await resolveAdminUser(req);
    if (admin) {
      req.adminUser = admin;
      req.authUser = {
        id: 0,
        uid: `admin:${admin.id}`,
        email: admin.email,
        fullName: admin.fullName,
        role: 'admin',
      };
      return next();
    }
    const user = await resolveAuthUser(req);
    if (user) {
      req.authUser = user;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required to download this document.' });
  } catch {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

export async function recordAuditLog(params: {
  actorUserId?: number | null;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId && params.actorUserId > 0 ? params.actorUserId : null,
      actorEmail: params.actorEmail,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? '',
      details: params.details ?? '',
      ipAddress: params.ipAddress ?? '',
    });
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}
