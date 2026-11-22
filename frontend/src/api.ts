// One place for every call to the ASP.NET Core API.
// Vite forwards /api/... to the server (see vite.config.ts), so we use relative URLs.

const TOKEN_KEY = 'drivemate.token';

// While a super admin "views as" someone, their own token waits here so they can switch back.
const SUPER_TOKEN_KEY = 'drivemate.superToken';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(SUPER_TOKEN_KEY); },
  getSuper: () => localStorage.getItem(SUPER_TOKEN_KEY),
  setSuper: (token: string) => localStorage.setItem(SUPER_TOKEN_KEY, token),
  clearSuper: () => localStorage.removeItem(SUPER_TOKEN_KEY),
};

/** An error with a readable message taken from the API's ProblemDetails body. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ProblemDetails {
  title?: string;
  errors?: Record<string, string[]>;
}

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {}; // the JWT "ID card"
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...authHeaders() };
  // FormData (file uploads) sets its own Content-Type with a "boundary", so we leave it alone.
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  await throwIfError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    // ASP.NET Core sends errors as ProblemDetails: { title, errors: { field: [messages] } }.
    const problem = (await res.json().catch(() => ({}))) as ProblemDetails;
    const fieldErrors = problem.errors ? Object.values(problem.errors).flat() : [];
    const message = fieldErrors.length > 0 ? fieldErrors.join(' ') : problem.title ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
}

/** Builds "?a=1&b=2", skipping empty values. */
export function queryString(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),

  /** Uploads one photo. Pass bookingId for trip photos. Returns the new file's id. */
  upload: (file: Blob, fileName: string, bookingId?: number) => {
    const form = new FormData();
    form.append('file', file, fileName);
    if (bookingId !== undefined) form.append('bookingId', String(bookingId));
    return request<{ id: string }>('POST', '/files', form);
  },

  /**
   * Private photos need the login token, but <img src> can't send headers.
   * So we download the image with fetch and turn it into a temporary "blob:" URL.
   */
  imageUrl: async (fileId: string) => {
    const res = await fetch(`/api/files/${fileId}`, { headers: authHeaders() });
    await throwIfError(res);
    return URL.createObjectURL(await res.blob());
  },
};
