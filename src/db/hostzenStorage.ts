import path from 'path';
import { isHostzenConfigured } from './hostzen.ts';

export const HOSTZEN_STORAGE_BUCKET = (
  process.env.HOSTZEN_STORAGE_BUCKET || 'niem-media'
).trim();

export const HOSTZEN_STORAGE_URI_PREFIX = 'hostzen://';

export type HostzenStorageFolder = 'certificates' | 'applications' | 'website';

let cachedServiceKey: string | null = null;
let serviceKeyFetchedAt = 0;
let bucketReady = false;
let bucketReadyPromise: Promise<void> | null = null;

function getHostzenApiBase(): string {
  return (process.env.HOSTZEN_API_URL || 'https://hostzens.com/api').replace(/\/+$/, '');
}

function getHostzenOrigin(): string {
  return getHostzenApiBase().replace(/\/api$/, '');
}

/**
 * Sanitize a path segment to safe ASCII characters without directory traversal.
 */
export function sanitizeStorageSegment(input: string, fallback = 'file'): string {
  const cleaned = input
    .trim()
    .replace(/[/\\]+/g, '-')
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return cleaned || fallback;
}

/**
 * Build a clean, deterministic, traversal-safe object path inside the Hostzens Storage bucket.
 */
export function buildStorageObjectPath(
  folder: HostzenStorageFolder,
  subKey: string,
  filename: string
): string {
  const safeSub = sanitizeStorageSegment(subKey, 'general');
  const ext = path.extname(filename).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase().slice(0, 10);
  const baseName = sanitizeStorageSegment(path.basename(filename, path.extname(filename)), 'asset');
  if (folder === 'website') {
    return `${folder}/${baseName}${ext}`;
  }
  return `${folder}/${safeSub}/${baseName}${ext}`;
}

export function formatHostzenStorageUri(bucket: string, objectPath: string): string {
  const cleanPath = objectPath.replace(/^\/+/, '');
  return `${HOSTZEN_STORAGE_URI_PREFIX}${bucket}/${cleanPath}`;
}

export function parseHostzenStorageUri(
  storedName: string
): { bucket: string; objectPath: string } | null {
  if (!storedName || !storedName.startsWith(HOSTZEN_STORAGE_URI_PREFIX)) {
    return null;
  }
  const rest = storedName.slice(HOSTZEN_STORAGE_URI_PREFIX.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx <= 0 || slashIdx >= rest.length - 1) {
    return null;
  }
  const bucket = rest.slice(0, slashIdx);
  const objectPath = rest.slice(slashIdx + 1).replace(/^\/+/, '');
  if (!bucket || !objectPath || objectPath.includes('..')) {
    return null;
  }
  return { bucket, objectPath };
}

function encodeStorageObjectPath(objectPath: string): string {
  return objectPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Build the canonical Hostzens Storage HTTPS object URL from a `hostzen://` URI.
 */
export function getHostzenStorageObjectUrl(storageUri: string): string | null {
  const parsed = parseHostzenStorageUri(storageUri);
  if (!parsed) return null;
  return `${getHostzenOrigin()}/storage/v1/object/${encodeURIComponent(parsed.bucket)}/${encodeStorageObjectPath(parsed.objectPath)}`;
}

/**
 * Resolve the Hostzens project service_role key on the server only.
 * Never exposed to client bundles.
 */
export async function getHostzenServiceKey(forceRefresh = false): Promise<string> {
  if (process.env.HOSTZEN_SERVICE_KEY) {
    return process.env.HOSTZEN_SERVICE_KEY.trim();
  }

  const now = Date.now();
  if (!forceRefresh && cachedServiceKey && now - serviceKeyFetchedAt < 1000 * 60 * 30) {
    return cachedServiceKey;
  }

  const projectId = process.env.HOSTZEN_PROJECT_ID;
  const apiKey = process.env.HOSTZEN_API_KEY;
  if (!projectId || !apiKey) {
    throw new Error('Hostzens storage requires HOSTZEN_PROJECT_ID and HOSTZEN_API_KEY.');
  }

  const res = await fetch(`${getHostzenApiBase()}/projects/${encodeURIComponent(projectId)}/keys`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch Hostzens project keys (${res.status}): ${body.slice(0, 180)}`);
  }

  const json = (await res.json()) as { serviceKey?: string };
  if (!json.serviceKey) {
    throw new Error('Hostzens project keys response did not include a serviceKey.');
  }

  cachedServiceKey = json.serviceKey;
  serviceKeyFetchedAt = now;
  return cachedServiceKey;
}

/**
 * Idempotently ensure the NIEM Hostzens Storage bucket exists.
 */
export async function ensureHostzenBucket(bucketName = HOSTZEN_STORAGE_BUCKET): Promise<void> {
  if (!isHostzenConfigured()) return;
  if (bucketReady && bucketName === HOSTZEN_STORAGE_BUCKET) return;

  const init = async () => {
    const serviceKey = await getHostzenServiceKey();
    const origin = getHostzenOrigin();

    const listRes = await fetch(`${origin}/storage/v1/bucket`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (listRes.ok) {
      const buckets = (await listRes.json()) as Array<{ name?: string; id?: string }>;
      const exists =
        Array.isArray(buckets) &&
        buckets.some((b) => b.name === bucketName || b.id === bucketName);
      if (exists) {
        if (bucketName === HOSTZEN_STORAGE_BUCKET) bucketReady = true;
        return;
      }
    }

    const createRes = await fetch(`${origin}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: false,
      }),
    });

    if (!createRes.ok && createRes.status !== 409) {
      const errText = await createRes.text();
      if (!errText.toLowerCase().includes('already exists')) {
        throw new Error(
          `Unable to ensure Hostzens Storage bucket "${bucketName}" (${createRes.status}): ${errText.slice(0, 200)}`
        );
      }
    }

    if (bucketName === HOSTZEN_STORAGE_BUCKET) bucketReady = true;
  };

  if (bucketName === HOSTZEN_STORAGE_BUCKET) {
    if (!bucketReadyPromise) {
      bucketReadyPromise = init().catch((err) => {
        bucketReadyPromise = null;
        throw err;
      });
    }
    return bucketReadyPromise;
  }

  return init();
}

/**
 * Upload a binary buffer (image or PDF) into the Hostzens.com Storage section.
 */
export async function uploadToHostzenStorage(params: {
  objectPath: string;
  buffer: Buffer;
  contentType: string;
  bucket?: string;
}): Promise<{ bucket: string; objectPath: string; storageUri: string }> {
  const bucket = params.bucket || HOSTZEN_STORAGE_BUCKET;
  await ensureHostzenBucket(bucket);

  const serviceKey = await getHostzenServiceKey();
  const origin = getHostzenOrigin();
  const encodedPath = encodeStorageObjectPath(params.objectPath);
  const url = `${origin}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': params.contentType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: new Uint8Array(params.buffer),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Hostzens Storage upload failed (${res.status}): ${text.slice(0, 220)}`
    );
  }

  return {
    bucket,
    objectPath: params.objectPath.replace(/^\/+/, ''),
    storageUri: formatHostzenStorageUri(bucket, params.objectPath),
  };
}

/**
 * Download an object directly from the Hostzens.com Storage bucket.
 */
export async function downloadFromHostzenStorage(
  storageUri: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const parsed = parseHostzenStorageUri(storageUri);
  if (!parsed) return null;

  const serviceKey = await getHostzenServiceKey();
  const origin = getHostzenOrigin();
  const encodedPath = encodeStorageObjectPath(parsed.objectPath);
  const url = `${origin}/storage/v1/object/${encodeURIComponent(parsed.bucket)}/${encodedPath}`;

  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hostzens Storage download failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuf),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Delete an object from Hostzens.com Storage.
 */
export async function deleteFromHostzenStorage(storageUri: string): Promise<boolean> {
  const parsed = parseHostzenStorageUri(storageUri);
  if (!parsed) return false;

  const serviceKey = await getHostzenServiceKey();
  const origin = getHostzenOrigin();
  const encodedPath = encodeStorageObjectPath(parsed.objectPath);
  const url = `${origin}/storage/v1/object/${encodeURIComponent(parsed.bucket)}/${encodedPath}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  return res.ok || res.status === 404;
}

/**
 * List objects in Hostzens.com Storage under a given folder prefix.
 */
export async function listHostzenStorageObjects(
  prefix = '',
  bucket = HOSTZEN_STORAGE_BUCKET
): Promise<
  Array<{
    name: string;
    id: string;
    size: number;
    mimetype: string;
    updatedAt: string;
  }>
> {
  await ensureHostzenBucket(bucket);
  const serviceKey = await getHostzenServiceKey();
  const origin = getHostzenOrigin();

  const res = await fetch(`${origin}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix }),
  });

  if (!res.ok) {
    return [];
  }

  const items = (await res.json()) as Array<{
    name?: string;
    id?: string;
    updated_at?: string;
    metadata?: { size?: number; mimetype?: string };
  }>;

  if (!Array.isArray(items)) return [];

  return items.map((item) => ({
    name: item.name || '',
    id: item.id || item.name || '',
    size: Number(item.metadata?.size || 0),
    mimetype: item.metadata?.mimetype || 'application/octet-stream',
    updatedAt: item.updated_at || '',
  }));
}

export const LEGACY_WEBSITE_MEDIA_KEYS = [
  'campus-hero.jpg',
  'engineering-lab.jpg',
  'management-seminar.jpg',
  'safety-training.jpg',
  'director-portrait.jpg',
] as const;

export const WEBSITE_MEDIA_FILES: Record<
  string,
  { localRelativePath: string; contentType: string; objectPath: string }
> = {
  'nie-building.jpg': {
    localRelativePath: 'public/assets/aistudio/nie_bulding_d-22-p-7_ed02527d.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/nie-building.jpg',
  },
  'nie-logo.jpg': {
    localRelativePath: 'public/assets/aistudio/NIE_LOGO_347614dc.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/nie-logo.jpg',
  },
  'classroom-primary.jpg': {
    localRelativePath: 'public/assets/aistudio/istoc_dcded119.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/classroom-primary.jpg',
  },
  'lecture-hall.jpg': {
    localRelativePath: 'public/assets/aistudio/istockphoto-95431111-612x612_ba84a8bf.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/lecture-hall.jpg',
  },
  'mahatma-gandhi.jpg': {
    localRelativePath: 'public/assets/aistudio/gandi_f4a38714.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/mahatma-gandhi.jpg',
  },
  'indira-gandhi.jpg': {
    localRelativePath: 'public/assets/aistudio/ig_051cf76a.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/indira-gandhi.jpg',
  },
  'ignou-heritage.jpg': {
    localRelativePath: 'public/assets/aistudio/IGNOU-extends-admission_1985dded.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/ignou-heritage.jpg',
  },
  'ignou-gate.jpg': {
    localRelativePath: 'public/assets/aistudio/IGNOU_c4af0343.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/ignou-gate.jpg',
  },
  'ignou-regional.jpg': {
    localRelativePath: 'public/assets/aistudio/2_abdbdce4.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/ignou-regional.jpg',
  },
  'ignou-wall.jpg': {
    localRelativePath: 'public/assets/aistudio/placr_e8f20e1d.jpg',
    contentType: 'image/jpeg',
    objectPath: 'website/ignou-wall.jpg',
  },
};

let websiteMediaSyncPromise: Promise<void> | null = null;
let websiteMediaSynced = false;

/**
 * Idempotently syncs all current institutional website images into Hostzens.com Storage
 * under `niem-media/website/*` and removes retired legacy website images.
 */
export async function ensureWebsiteMediaInHostzenStorage(): Promise<void> {
  if (!isHostzenConfigured() || websiteMediaSynced) return;
  if (!websiteMediaSyncPromise) {
    websiteMediaSyncPromise = (async () => {
      const fs = await import('fs');
      await ensureHostzenBucket(HOSTZEN_STORAGE_BUCKET);
      const existing = await listHostzenStorageObjects('website', HOSTZEN_STORAGE_BUCKET);
      const existingNames = new Set(existing.map((item) => item.name));

      // Remove retired legacy website images from Hostzens Storage
      for (const legacyKey of LEGACY_WEBSITE_MEDIA_KEYS) {
        if (existingNames.has(legacyKey)) {
          await deleteFromHostzenStorage(
            formatHostzenStorageUri(HOSTZEN_STORAGE_BUCKET, `website/${legacyKey}`)
          ).catch(() => {});
        }
      }

      // Upload all current institutional images to Hostzens Storage
      for (const [key, meta] of Object.entries(WEBSITE_MEDIA_FILES)) {
        if (existingNames.has(key)) continue;
        const absPath = path.resolve(process.cwd(), meta.localRelativePath);
        if (!fs.existsSync(absPath)) continue;
        const buffer = fs.readFileSync(absPath);
        await uploadToHostzenStorage({
          objectPath: meta.objectPath,
          buffer,
          contentType: meta.contentType,
          bucket: HOSTZEN_STORAGE_BUCKET,
        });
      }
      websiteMediaSynced = true;
    })().catch((err) => {
      websiteMediaSyncPromise = null;
      console.error('Website media sync to Hostzens Storage failed:', err);
    });
  }
  return websiteMediaSyncPromise;
}

let legacyCertMigrationPromise: Promise<number> | null = null;
let legacyCertMigrationDone = false;

/**
 * Idempotently migrates any legacy student_certificates rows (previously saved as
 * base64 in PostgreSQL or local disk) into the Hostzens.com Storage bucket under
 * `niem-media/certificates/<enrollmentNumber>/<certificateNumber>-<filename>`.
 */
export async function migrateLegacyCertificatesToHostzenStorage(): Promise<number> {
  if (!isHostzenConfigured() || legacyCertMigrationDone) return 0;
  if (!legacyCertMigrationPromise) {
    legacyCertMigrationPromise = (async () => {
      const fs = await import('fs');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./index.ts');
      const { studentCertificates } = await import('./schema.ts');

      const rows = await db
        .select({
          id: studentCertificates.id,
          enrollmentNumber: studentCertificates.enrollmentNumber,
          certificateNumber: studentCertificates.certificateNumber,
          originalName: studentCertificates.originalName,
          storedName: studentCertificates.storedName,
          mimeType: studentCertificates.mimeType,
          fileDataBase64: studentCertificates.fileDataBase64,
        })
        .from(studentCertificates);

      let migratedCount = 0;
      const legacyDir = path.resolve(process.cwd(), 'private_uploads');

      for (const row of rows) {
        if (parseHostzenStorageUri(row.storedName)) continue;

        let buffer: Buffer | null = null;
        if (row.fileDataBase64) {
          buffer = Buffer.from(row.fileDataBase64, 'base64');
        } else if (row.storedName) {
          const diskPath = path.join(legacyDir, path.basename(row.storedName));
          if (fs.existsSync(diskPath)) {
            buffer = fs.readFileSync(diskPath);
          }
        }

        if (!buffer || buffer.length === 0) continue;

        const objectPath = buildStorageObjectPath(
          'certificates',
          row.enrollmentNumber,
          `${row.certificateNumber}-${row.originalName}`
        );

        const uploaded = await uploadToHostzenStorage({
          objectPath,
          buffer,
          contentType: row.mimeType || 'application/octet-stream',
          bucket: HOSTZEN_STORAGE_BUCKET,
        });

        await db
          .update(studentCertificates)
          .set({
            storedName: uploaded.storageUri,
            fileDataBase64: '',
            updatedAt: new Date(),
          })
          .where(eq(studentCertificates.id, row.id));

        migratedCount++;
      }

      legacyCertMigrationDone = true;
      return migratedCount;
    })().catch((err) => {
      legacyCertMigrationPromise = null;
      console.error('Legacy certificate migration to Hostzens Storage failed:', err);
      return 0;
    });
  }
  return legacyCertMigrationPromise;
}
