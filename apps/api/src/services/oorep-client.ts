const OOREP_BASE = (process.env.OOREP_BASE_URL ?? 'https://www.oorep.com').replace(/\/$/, '');
const OOREP_TIMEOUT_MS = Number(process.env.OOREP_TIMEOUT_MS ?? 30000);

type RawWeightedRemedy = {
  remedy: { id: number; nameAbbrev: string; nameLong: string; namealt?: string[] | null };
  weight: number;
};

type RawRepertoryCase = {
  rubric: { abbrev: string; id: number; fullPath?: string; textt?: string | null; path?: string | null };
  repertoryAbbrev: string;
  rubricLabel?: string | null;
  weightedRemedies: RawWeightedRemedy[];
};

type RawRepertoryPayload = {
  totalNumberOfResults: number;
  totalNumberOfPages: number;
  currPage: number;
  results: RawRepertoryCase[];
};

type RawRepertoryResponse = [RawRepertoryPayload, unknown[]?];

type RawMateriaMedicaResponse = {
  results: Array<{
    abbrev: string;
    remedy_id: number;
    remedy_fullname: string;
    result_sections: Array<{ id: number; depth?: number | null; heading?: string | null; content?: string | null }>;
  }>;
};

class CookieJar {
  private readonly cookies = new Map<string, string>();

  hasCookies() {
    return this.cookies.size > 0;
  }

  clear() {
    this.cookies.clear();
  }

  setFromHeaders(headers: string[]) {
    for (const header of headers) {
      const [cookiePair] = header.split(';');
      const [name, ...valueParts] = cookiePair.split('=');
      if (!name || valueParts.length === 0) continue;
      const value = valueParts.join('=').trim();
      if (value) this.cookies.set(name.trim(), value);
    }
  }

  header(): string | undefined {
    if (!this.hasCookies()) return undefined;
    return Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

const cookieJar = new CookieJar();
let sessionPromise: Promise<void> | null = null;

function extractSetCookie(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie() ?? [];
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSession(force = false) {
  if (sessionPromise) {
    await sessionPromise;
    if (!force && cookieJar.hasCookies()) return;
  }
  if (!force && cookieJar.hasCookies()) return;
  if (force && !sessionPromise) cookieJar.clear();

  if (!sessionPromise) {
    sessionPromise = bootstrapSession().finally(() => {
      sessionPromise = null;
    });
  }
  await sessionPromise;
}

async function bootstrapSession() {
  const url = `${OOREP_BASE}/api/available_remedies?limit=1`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'hopehub-homeopathy/1.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  }, OOREP_TIMEOUT_MS);

  if (!response.ok) {
    throw new Error(`OOREP session init failed: HTTP ${response.status}`);
  }
  cookieJar.setFromHeaders(extractSetCookie(response));
  await response.text();
}

async function oorepRequest<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T | null> {
  await ensureSession();
  const url = new URL(`${OOREP_BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.append(key, String(value));
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'hopehub-homeopathy/1.0',
    'X-Requested-With': 'XMLHttpRequest'
  };
  const cookie = cookieJar.header();
  if (cookie) headers.Cookie = cookie;

  const response = await fetchWithTimeout(url.toString(), { method: 'GET', headers }, OOREP_TIMEOUT_MS);

  if (response.status === 401) {
    await ensureSession(true);
    return oorepRequest<T>(endpoint, params);
  }

  if (response.status === 204) return null;
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OOREP API error ${response.status}: ${text.slice(0, 200)}`);
  }

  cookieJar.setFromHeaders(extractSetCookie(response));
  const body = await response.text();
  if (!body) return null;
  return JSON.parse(body) as T;
}

export const OOREP_SOURCE_PREFIX = 'oorep:';
export const OOREP_MM_PREFIX = 'oorep-mm:';

export function isOorepSourceId(sourceId: string) {
  return sourceId.startsWith(OOREP_SOURCE_PREFIX);
}

export function isOorepMmSourceId(sourceId: string) {
  return sourceId.startsWith(OOREP_MM_PREFIX);
}

export function oorepAbbrevFromSourceId(sourceId: string) {
  return sourceId.slice(OOREP_SOURCE_PREFIX.length);
}

export function oorepMmAbbrevFromSourceId(sourceId: string) {
  return sourceId.slice(OOREP_MM_PREFIX.length);
}

export type OorepRepertoryMeta = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rubricCount: null;
  provider: 'oorep';
};

export type OorepMmMeta = {
  id: string;
  code: string;
  name: string;
  author: string | null;
  language: string | null;
  provider: 'oorep';
};

export async function listOorepRepertories(): Promise<OorepRepertoryMeta[]> {
  const rows = await oorepRequest<Array<{ info: { abbrev: string; title: string; authorLastName?: string; authorFirstName?: string; language?: string } }>>(
    '/api/available_rems_and_reps'
  );
  return (rows ?? []).map((item) => {
    const author = [item.info.authorFirstName, item.info.authorLastName].filter(Boolean).join(' ').trim();
    return {
      id: `${OOREP_SOURCE_PREFIX}${item.info.abbrev}`,
      code: item.info.abbrev,
      name: item.info.title || item.info.abbrev,
      description: author ? `${author}${item.info.language ? ` · ${item.info.language}` : ''}` : item.info.language ?? null,
      rubricCount: null,
      provider: 'oorep' as const
    };
  });
}

export async function listOorepMateriaMedicas(): Promise<OorepMmMeta[]> {
  const rows = await oorepRequest<Array<{ mminfo: { abbrev: string; displaytitle?: string; fulltitle?: string; authorlastname?: string; authorfirstname?: string; lang?: string } }>>(
    '/api/available_rems_and_mms'
  );
  return (rows ?? []).map((item) => {
    const author = [item.mminfo.authorfirstname, item.mminfo.authorlastname].filter(Boolean).join(' ').trim() || null;
    return {
      id: `${OOREP_MM_PREFIX}${item.mminfo.abbrev}`,
      code: item.mminfo.abbrev,
      name: item.mminfo.displaytitle || item.mminfo.fulltitle || item.mminfo.abbrev,
      author,
      language: item.mminfo.lang ?? null,
      provider: 'oorep' as const
    };
  });
}

export type OorepRubricResult = {
  id: string;
  chapter: string;
  subchapter: string | null;
  text: string;
  parentPath: string | null;
  source: { id: string; name: string; code: string };
  remedies: Array<{ grade: number; remedy: { id: string; name: string; abbreviation: string } }>;
};

export async function searchOorepRepertory(options: {
  symptom: string;
  repertory: string;
  page?: number;
  minWeight?: number;
  remedy?: string;
  limit?: number;
}): Promise<{ rubrics: OorepRubricResult[]; totalResults: number; page: number; totalPages: number }> {
  const response = await oorepRequest<RawRepertoryResponse>('/api/lookup_rep', {
    repertory: options.repertory,
    symptom: options.symptom,
    page: options.page ?? 0,
    remedyString: options.remedy?.trim() ?? '',
    minWeight: options.minWeight && options.minWeight > 0 ? options.minWeight : 1,
    getRemedies: 0
  });

  const payload = response?.[0];
  if (!payload) return { rubrics: [], totalResults: 0, page: 0, totalPages: 0 };

  const limit = options.limit ?? 50;
  const rubrics = payload.results.slice(0, limit).map((item) => {
    const label = item.rubricLabel || item.rubric.fullPath || item.rubric.path || '';
    const parts = label.split(' > ').filter(Boolean);
    const chapter = parts[0] || 'General';
    const text = parts[parts.length - 1] || label;
    const parentPath = parts.length > 2 ? parts.slice(1, -1).join(' > ') : parts.length === 2 ? parts[1] : null;

    return {
      id: `oorep-rubric-${item.repertoryAbbrev}-${item.rubric.id}`,
      chapter,
      subchapter: null,
      text,
      parentPath,
      source: {
        id: `${OOREP_SOURCE_PREFIX}${item.repertoryAbbrev}`,
        name: item.repertoryAbbrev,
        code: item.repertoryAbbrev
      },
      remedies: item.weightedRemedies.map((link) => ({
        grade: link.weight,
        remedy: {
          id: `oorep-remedy-${link.remedy.id}`,
          name: link.remedy.nameLong,
          abbreviation: link.remedy.nameAbbrev
        }
      }))
    };
  });

  return {
    rubrics,
    totalResults: payload.totalNumberOfResults,
    page: payload.currPage,
    totalPages: payload.totalNumberOfPages
  };
}

export type OorepMmSectionResult = {
  remedyId: string;
  remedyName: string;
  remedyAbbreviation: string;
  sections: Array<{ id: string; heading: string | null; content: string; depth: number }>;
};

export async function searchOorepMateriaMedica(options: {
  symptom: string;
  materiaMedica: string;
  remedy?: string;
  page?: number;
  limit?: number;
}): Promise<{ results: OorepMmSectionResult[]; totalResults: number }> {
  const response = await oorepRequest<RawMateriaMedicaResponse>('/api/lookup_mm', {
    mmAbbrev: options.materiaMedica,
    symptom: options.symptom,
    page: options.page ?? 0,
    remedyString: options.remedy?.trim() ?? ''
  });

  if (!response?.results?.length) return { results: [], totalResults: 0 };

  const limit = options.limit ?? 40;
  const results = response.results.slice(0, limit).map((item) => ({
    remedyId: `oorep-remedy-${item.remedy_id}`,
    remedyName: item.remedy_fullname,
    remedyAbbreviation: item.abbrev,
    sections: item.result_sections.map((section) => ({
      id: `oorep-mm-${section.id}`,
      heading: section.heading ?? null,
      content: section.content ?? '',
      depth: section.depth ?? 1
    }))
  }));

  return { results, totalResults: response.results.length };
}

export async function searchOorepRemedies(q: string, limit = 40) {
  const rows = await oorepRequest<Array<{ id: number; nameAbbrev: string; nameLong: string; namealt?: string[] }>>(
    '/api/available_remedies'
  );
  const query = q.trim().toLowerCase();
  const normalized = query.replace(/[^a-z0-9]/g, '');

  return (rows ?? [])
    .filter((rem) => {
      const abbrev = rem.nameAbbrev.toLowerCase();
      const name = rem.nameLong.toLowerCase();
      const alts = (rem.namealt ?? []).map((a) => a.toLowerCase());
      return abbrev.includes(query) || name.includes(query) || alts.some((a) => a.includes(query)) ||
        name.replace(/[^a-z0-9]/g, '').includes(normalized);
    })
    .slice(0, limit)
    .map((rem) => ({
      id: `oorep-remedy-${rem.id}`,
      name: rem.nameLong,
      abbreviation: rem.nameAbbrev
    }));
}

export async function isOorepReachable() {
  try {
    await ensureSession();
    return true;
  } catch {
    return false;
  }
}
