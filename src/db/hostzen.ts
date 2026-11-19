/**
 * Hostzens.com PostgreSQL HTTP SQL Adapter & Drizzle pg-proxy Driver
 * Connects both the NIEM public website and Admin Dashboard directly to the
 * isolated Hostzens project PostgreSQL schema via POST /api/sql/query.
 */

export interface HostzenSqlResponse {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
  executionMs?: number;
  error?: string;
}

const ISO_UTC_TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)Z$/;

/**
 * Safely serialize a JS parameter into a PostgreSQL standard-conforming literal.
 * Hostzens PostgreSQL 15 runs with standard_conforming_strings = on.
 */
export function escapePgLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid non-finite numeric SQL parameter: ${value}`);
    }
    return String(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Invalid Date SQL parameter');
    }
    return `'${value.toISOString()}'::timestamptz`;
  }
  if (value instanceof Uint8Array) {
    const hex = Buffer.from(value).toString('hex');
    return `'\\x${hex}'::bytea`;
  }
  if (typeof value === 'string') {
    const safe = value.replace(/\0/g, '').replace(/'/g, "''");
    return `'${safe}'`;
  }
  const serialized = JSON.stringify(value).replace(/\0/g, '').replace(/'/g, "''");
  return `'${serialized}'`;
}

/**
 * Bind positional $1, $2, ... placeholders outside SQL string literals,
 * quoted identifiers, and comments.
 */
export function bindSqlParams(sql: string, params: unknown[]): string {
  if (!params || params.length === 0) return sql;

  let out = '';
  let i = 0;
  const len = sql.length;

  while (i < len) {
    const ch = sql[i];

    // Single-quoted string literal ('...''...')
    if (ch === "'") {
      out += ch;
      i++;
      while (i < len) {
        out += sql[i];
        if (sql[i] === "'") {
          if (i + 1 < len && sql[i + 1] === "'") {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Double-quoted identifier ("...""...")
    if (ch === '"') {
      out += ch;
      i++;
      while (i < len) {
        out += sql[i];
        if (sql[i] === '"') {
          if (i + 1 < len && sql[i + 1] === '"') {
            out += sql[i + 1];
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Line comment (-- ...\n)
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      while (i < len && sql[i] !== '\n') {
        out += sql[i++];
      }
      continue;
    }

    // Block comment (/* ... */)
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      out += '/*';
      i += 2;
      while (i < len) {
        if (sql[i] === '*' && i + 1 < len && sql[i + 1] === '/') {
          out += '*/';
          i += 2;
          break;
        }
        out += sql[i++];
      }
      continue;
    }

    // Positional parameter ($1, $2, ...)
    if (ch === '$' && i + 1 < len && sql[i + 1] >= '1' && sql[i + 1] <= '9') {
      const prev = i > 0 ? sql[i - 1] : '';
      if (!/[a-zA-Z0-9_$]/.test(prev)) {
        let j = i + 1;
        while (j < len && sql[j] >= '0' && sql[j] <= '9') {
          j++;
        }
        const idx = Number(sql.slice(i + 1, j)) - 1;
        if (idx < 0 || idx >= params.length) {
          throw new Error(`Missing SQL parameter $${idx + 1}`);
        }
        out += escapePgLiteral(params[idx]);
        i = j;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Split a comma-separated SQL projection list at top-level parenthesis depth 0.
 */
function splitTopLevelCommas(exprList: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let i = 0;

  while (i < exprList.length) {
    const ch = exprList[i];
    if (ch === "'") {
      i++;
      while (i < exprList.length) {
        if (exprList[i] === "'" && exprList[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (exprList[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < exprList.length) {
        if (exprList[i] === '"' && exprList[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (exprList[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) {
      parts.push(exprList.slice(start, i));
      start = i + 1;
    }
    i++;
  }
  parts.push(exprList.slice(start));
  return parts;
}

/**
 * Find the first occurrence of a top-level SQL keyword (outside quotes and parens).
 */
function findTopLevelKeyword(sql: string, keyword: string, startIndex = 0): number {
  const kwLower = keyword.toLowerCase();
  const kwLen = kwLower.length;
  let depth = 0;
  let i = startIndex;

  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < sql.length) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === '(') {
      depth++;
      i++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }

    if (depth === 0) {
      const prev = i > 0 ? sql[i - 1] : ' ';
      const next = i + kwLen < sql.length ? sql[i + kwLen] : ' ';
      if (
        !/[a-zA-Z0-9_$]/.test(prev) &&
        !/[a-zA-Z0-9_$]/.test(next) &&
        sql.slice(i, i + kwLen).toLowerCase() === kwLower
      ) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

function stripOuterAlias(expr: string): string {
  const trimmed = expr.trim();
  // Strip trailing `AS "alias"` or `AS alias`
  const m = trimmed.match(/^(.*)\s+as\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)$/i);
  return m ? m[1].trim() : trimmed;
}

/**
 * Alias top-level SELECT or RETURNING columns as "__c0", "__c1", ...
 * so JSON-object row responses from Hostzens /api/sql/query never lose
 * duplicate column names across JOINs (e.g. courses.slug + course_categories.slug).
 */
export function aliasTopLevelColumns(sql: string): { sql: string; colCount: number } {
  const trimmed = sql.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('select ')) {
    let listStart = 7;
    const afterSelect = trimmed.slice(listStart).trimStart();
    if (afterSelect.toLowerCase().startsWith('distinct ')) {
      listStart = trimmed.length - afterSelect.length + 9;
    }
    const fromIdx = findTopLevelKeyword(trimmed, 'from', listStart);
    const listEnd = fromIdx === -1 ? trimmed.length : fromIdx;
    const projection = trimmed.slice(listStart, listEnd);
    const parts = splitTopLevelCommas(projection);
    if (parts.some((p) => p.trim() === '*' || p.trim().endsWith('.*'))) {
      return { sql: trimmed, colCount: 0 };
    }
    const aliased = parts
      .map((part, idx) => `${stripOuterAlias(part)} AS "__c${idx}"`)
      .join(', ');
    const rebuilt = `${trimmed.slice(0, listStart)}${aliased} ${trimmed.slice(listEnd)}`;
    return { sql: rebuilt.trim(), colCount: parts.length };
  }

  // Handle INSERT / UPDATE / DELETE ... RETURNING ...
  const returningIdx = findTopLevelKeyword(trimmed, 'returning', 0);
  if (returningIdx !== -1) {
    const listStart = returningIdx + 'returning'.length;
    const projection = trimmed.slice(listStart).replace(/;\s*$/, '');
    const parts = splitTopLevelCommas(projection);
    if (parts.some((p) => p.trim() === '*' || p.trim().endsWith('.*'))) {
      return { sql: trimmed, colCount: 0 };
    }
    const aliased = parts
      .map((part, idx) => `${stripOuterAlias(part)} AS "__c${idx}"`)
      .join(', ');
    const rebuilt = `${trimmed.slice(0, listStart)} ${aliased}`;
    return { sql: rebuilt.trim(), colCount: parts.length };
  }

  return { sql: trimmed, colCount: 0 };
}

/**
 * Convert Hostzens ISO-8601 UTC timestamp strings ("2026-11-19T05:32:14.123Z")
 * to PostgreSQL wire format ("2026-11-19 05:32:14.123") so Drizzle's
 * PgTimestamp.mapFromDriverValue parses them cleanly into valid Date objects.
 */
export function normalizeHostzenValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const m = value.match(ISO_UTC_TIMESTAMP_RE);
    if (m) {
      return `${m[1]} ${m[2]}`;
    }
  }
  return value;
}

export function isHostzenConfigured(): boolean {
  return Boolean(process.env.HOSTZEN_PROJECT_ID && process.env.HOSTZEN_API_KEY);
}

export async function executeHostzenSql(query: string): Promise<HostzenSqlResponse> {
  const apiUrl = (process.env.HOSTZEN_API_URL || 'https://hostzens.com/api').replace(/\/+$/, '');
  const projectId = process.env.HOSTZEN_PROJECT_ID;
  const apiKey = process.env.HOSTZEN_API_KEY;

  if (!projectId || !apiKey) {
    throw new Error(
      'Hostzens database is not configured. Set HOSTZEN_PROJECT_ID and HOSTZEN_API_KEY in environment.'
    );
  }

  const res = await fetch(`${apiUrl}/sql/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId, query }),
  });

  const text = await res.text();
  let data: HostzenSqlResponse;
  try {
    data = JSON.parse(text) as HostzenSqlResponse;
  } catch {
    throw new Error(`Hostzens SQL API returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || data.error) {
    throw new Error(`Hostzens SQL error (${res.status}): ${data.error || text.slice(0, 200)}`);
  }

  return data;
}

/**
 * Drizzle pg-proxy remote callback targeting Hostzens.com PostgreSQL.
 */
export async function hostzenProxyCallback(
  sql: string,
  params: unknown[],
  method: 'all' | 'execute'
): Promise<{ rows: unknown[][] }> {
  const bound = bindSqlParams(sql, params);

  if (method === 'execute') {
    await executeHostzenSql(bound);
    return { rows: [] };
  }

  const { sql: aliasedSql, colCount } = aliasTopLevelColumns(bound);
  const result = await executeHostzenSql(aliasedSql);
  const rawRows = Array.isArray(result.rows) ? result.rows : [];

  if (colCount > 0) {
    const mapped = rawRows.map((row) => {
      const tuple: unknown[] = new Array(colCount);
      for (let i = 0; i < colCount; i++) {
        tuple[i] = normalizeHostzenValue(row[`__c${i}`]);
      }
      return tuple;
    });
    return { rows: mapped };
  }

  const cols = Array.isArray(result.columns) ? result.columns : [];
  const mapped = rawRows.map((row) =>
    cols.map((col) => normalizeHostzenValue(row[col]))
  );
  return { rows: mapped };
}

let schemaReadyPromise: Promise<void> | null = null;
let schemaReady = false;

const NIEM_SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "description" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "uid" text UNIQUE,
  "email" text NOT NULL UNIQUE,
  "password_hash" text,
  "full_name" text NOT NULL,
  "role_id" integer NOT NULL REFERENCES "roles"("id"),
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "course_categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "code" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "category_id" integer NOT NULL REFERENCES "course_categories"("id"),
  "level" text NOT NULL,
  "duration" text NOT NULL,
  "learning_mode" text NOT NULL,
  "eligibility" text NOT NULL,
  "fees_note" text NOT NULL,
  "summary" text NOT NULL,
  "curriculum_outline" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "students" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer REFERENCES "users"("id"),
  "enrollment_number" text NOT NULL UNIQUE,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "date_of_birth" text NOT NULL,
  "course_id" integer REFERENCES "courses"("id"),
  "programme_name" text NOT NULL,
  "admission_year" integer NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "verification_status" text DEFAULT 'verified' NOT NULL,
  "study_centre" text NOT NULL,
  "city" text NOT NULL,
  "certificate_storage_uri" text DEFAULT '' NOT NULL,
  "certificate_file_url" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "applications" (
  "id" serial PRIMARY KEY NOT NULL,
  "reference_number" text NOT NULL UNIQUE,
  "user_id" integer REFERENCES "users"("id"),
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "mobile" text NOT NULL,
  "course_id" integer REFERENCES "courses"("id"),
  "course_name" text NOT NULL,
  "qualification" text NOT NULL,
  "city" text NOT NULL,
  "message" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "internal_notes" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "documents" (
  "id" serial PRIMARY KEY NOT NULL,
  "application_id" integer REFERENCES "applications"("id"),
  "student_id" integer REFERENCES "students"("id"),
  "uploaded_by_user_id" integer REFERENCES "users"("id"),
  "original_name" text NOT NULL,
  "stored_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "category" text DEFAULT 'admission_document' NOT NULL,
  "is_private" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "enquiries" (
  "id" serial PRIMARY KEY NOT NULL,
  "reference_code" text NOT NULL UNIQUE,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "mobile" text NOT NULL,
  "subject" text NOT NULL,
  "enquiry_type" text DEFAULT 'general' NOT NULL,
  "course_name" text DEFAULT '' NOT NULL,
  "city" text DEFAULT '' NOT NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "internal_notes" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "examination_results" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL REFERENCES "students"("id"),
  "enrollment_number" text NOT NULL,
  "term_label" text NOT NULL,
  "programme_name" text NOT NULL,
  "exam_mode" text NOT NULL,
  "grade_or_status" text NOT NULL,
  "percentage_or_score" text NOT NULL,
  "remarks" text DEFAULT '' NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "allow_download" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "category" text NOT NULL,
  "summary" text NOT NULL,
  "content" text NOT NULL,
  "published_date" text NOT NULL,
  "is_published" boolean DEFAULT true NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "accreditation_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "body_name" text NOT NULL,
  "short_title" text NOT NULL,
  "category" text NOT NULL,
  "description" text NOT NULL,
  "verification_status" text DEFAULT 'pending_verification' NOT NULL,
  "verification_note" text NOT NULL,
  "last_reviewed_at" timestamp DEFAULT now() NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "recipient_user_id" integer REFERENCES "users"("id"),
  "recipient_email" text NOT NULL,
  "recipient_role" text DEFAULT 'admin' NOT NULL,
  "channel" text DEFAULT 'in_app' NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "delivery_status" text DEFAULT 'unread' NOT NULL,
  "related_entity" text DEFAULT '' NOT NULL,
  "related_id" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_user_id" integer REFERENCES "users"("id"),
  "actor_email" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text DEFAULT '' NOT NULL,
  "details" text DEFAULT '' NOT NULL,
  "ip_address" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "role_title" text NOT NULL,
  "role_code" text DEFAULT 'SUPER_ADMIN' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp,
  "last_login_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "id" serial PRIMARY KEY NOT NULL,
  "session_id" text NOT NULL UNIQUE,
  "admin_user_id" integer NOT NULL REFERENCES "admin_users"("id"),
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "ip_address" text DEFAULT '' NOT NULL,
  "user_agent" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "student_certificates" (
  "id" serial PRIMARY KEY NOT NULL,
  "student_id" integer NOT NULL REFERENCES "students"("id"),
  "enrollment_number" text NOT NULL,
  "certificate_number" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "issue_date" text NOT NULL,
  "verification_status" text DEFAULT 'verified' NOT NULL,
  "original_name" text NOT NULL,
  "stored_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "file_data_base64" text DEFAULT '' NOT NULL,
  "is_public_viewable" boolean DEFAULT true NOT NULL,
  "uploaded_by_admin_email" text NOT NULL,
  "remarks" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "certificate_storage_uri" text DEFAULT '' NOT NULL;
UPDATE "students" s
SET "certificate_storage_uri" = sc."stored_name"
FROM (
  SELECT DISTINCT ON ("student_id") "student_id", "stored_name"
  FROM "student_certificates"
  WHERE "stored_name" LIKE 'hostzen://%'
  ORDER BY "student_id", "created_at" DESC
) sc
WHERE s."id" = sc."student_id" AND COALESCE(s."certificate_storage_uri", '') = '';

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "certificate_file_url" text DEFAULT '' NOT NULL;
UPDATE "students" s
SET "certificate_file_url" = '/api/certificates/' || sc."id" || '/view?enrollment=' || sc."enrollment_number" || '&cert=' || sc."certificate_number"
FROM (
  SELECT DISTINCT ON ("student_id") "student_id", "id", "enrollment_number", "certificate_number"
  FROM "student_certificates"
  ORDER BY "student_id", "created_at" DESC
) sc
WHERE s."id" = sc."student_id" AND COALESCE(s."certificate_file_url", '') = '';
`;

/**
 * Idempotently creates all 14 NIEM PostgreSQL tables inside the linked
 * Hostzens.com project schema on first database access.
 */
export async function ensureHostzenSchema(): Promise<void> {
  if (!isHostzenConfigured() || schemaReady) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = executeHostzenSql(NIEM_SCHEMA_DDL)
      .then(() => {
        schemaReady = true;
      })
      .catch((err) => {
        schemaReadyPromise = null;
        throw err;
      });
  }
  return schemaReadyPromise;
}
