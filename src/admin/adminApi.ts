const ADMIN_SESSION_STORAGE_KEY = 'niem_admin_session_token';
export const ADMIN_SESSION_EXPIRED_EVENT = 'niem-admin-session-expired';

export function getAdminSessionToken(): string | null {
  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminSessionToken(token: string | null): void {
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    }
  } catch {
    // sessionStorage unavailable
  }
}

export function clearAdminSessionToken(): void {
  setAdminSessionToken(null);
}

function notifyAdminSessionExpired(): void {
  clearAdminSessionToken();
  try {
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
  } catch {
    // ignore dispatch failure
  }
}

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

export async function adminApiFetch<T>(
  path: string,
  options: RequestInit = {},
  opts?: { suppressExpiredRedirect?: boolean }
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAdminSessionToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    if (!opts?.suppressExpiredRedirect) {
      notifyAdminSessionExpired();
    }
    const payload = await res.json().catch(() => ({}));
    throw new AdminApiError(
      payload?.error || 'Administrator session has expired. Please sign in again.',
      401
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    if (contentType.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data?.error) errorMessage = data.error;
    }
    throw new AdminApiError(errorMessage, res.status);
  }

  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

export async function adminFetchBlob(path: string): Promise<{ blob: Blob; contentType: string }> {
  const headers = new Headers();
  const token = getAdminSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, {
    credentials: 'include',
    headers,
  });

  if (res.status === 401) {
    notifyAdminSessionExpired();
    throw new AdminApiError('Administrator session has expired. Please sign in again.', 401);
  }

  if (!res.ok) {
    let errorMessage = `Unable to load file (${res.status})`;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json().catch(() => null);
      if (data?.error) errorMessage = data.error;
    }
    throw new AdminApiError(errorMessage, res.status);
  }

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const blob = await res.blob();
  return { blob, contentType };
}

export async function adminApiDownload(path: string, fallbackFilename: string): Promise<void> {
  const { blob } = await adminFetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface UploadProgressInfo {
  percent: number;
  loaded: number;
  total: number;
  phase: 'uploading' | 'processing';
}

export function adminApiUploadWithProgress<T>(
  path: string,
  formData: FormData,
  options?: {
    method?: 'POST' | 'PATCH' | 'PUT';
    onProgress?: (info: UploadProgressInfo) => void;
    signal?: AbortSignal;
  }
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new DOMException('Upload cancelled.', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open(options?.method || 'POST', path, true);
    xhr.withCredentials = true;

    const token = getAdminSessionToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    const handleAbort = () => {
      xhr.abort();
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', handleAbort, { once: true });
    }

    const cleanup = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', handleAbort);
      }
    };

    xhr.upload.onprogress = (evt) => {
      if (!options?.onProgress) return;
      if (evt.lengthComputable && evt.total > 0) {
        const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
        options.onProgress({
          percent,
          loaded: evt.loaded,
          total: evt.total,
          phase: percent >= 100 ? 'processing' : 'uploading',
        });
      }
    };

    xhr.upload.onload = () => {
      options?.onProgress?.({
        percent: 100,
        loaded: 1,
        total: 1,
        phase: 'processing',
      });
    };

    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('Upload cancelled.', 'AbortError'));
    };

    xhr.onerror = () => {
      cleanup();
      reject(new AdminApiError('Network error while uploading certificate file. Please retry.', 0));
    };

    xhr.onload = () => {
      cleanup();
      const contentType = xhr.getResponseHeader('content-type') || '';
      const rawText = xhr.responseText || '';
      let parsed: any = null;
      if (contentType.includes('application/json') && rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = null;
        }
      }

      if (xhr.status === 401) {
        notifyAdminSessionExpired();
        reject(
          new AdminApiError(
            parsed?.error || 'Administrator session has expired. Please sign in again.',
            401
          )
        );
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new AdminApiError(
            parsed?.error || `Certificate upload failed (${xhr.status}).`,
            xhr.status
          )
        );
        return;
      }

      resolve((parsed !== null ? parsed : rawText) as T);
    };

    xhr.send(formData);
  });
}
