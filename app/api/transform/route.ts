import { env } from 'cloudflare:workers';
import { usageSchema } from '@/db/schema';

export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MIN_UPLOAD_BYTES = 20 * 1024;
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
const DAILY_LIMIT = 3;
const MONTHLY_LIMIT = 120;

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedSizes = new Set(['1024x1024', '1536x1024', '1024x1536']);

const lensPrompts = {
  ecological: `Edit this public-place photograph into a plausible, photorealistic near-future civic design visualization through an ecological lens. Preserve the exact camera viewpoint, recognizable architecture, paths, building facades, mature trees, street geometry, lighting, and weather. Introduce climate-appropriate layered planting, meaningful shade, permeable ground, and visible stormwater capture where spatially credible. Keep existing access and circulation legible. Make the intervention modest, maintainable, and reversible rather than futuristic or monumental. Do not add text, logos, official signs, or invented landmarks. Do not change recognizable faces or bodies. The result is a grounded conversation image, not an approved plan.`,
  communal: `Edit this public-place photograph into a plausible, photorealistic near-future civic design visualization through a communal lens. Preserve the exact camera viewpoint, recognizable architecture, paths, building facades, mature trees, street geometry, lighting, and weather. Add robust shared seating or a long table, gentle practical lighting, clear circulation, and a small flexible element that nearby people could steward together. Keep the intervention inclusive, modest, maintainable, and reversible rather than polished or monumental. Do not add text, logos, official signs, crowds, or invented landmarks. Do not change recognizable faces or bodies. The result is a grounded conversation image, not an approved plan.`,
  contemplative: `Edit this public-place photograph into a plausible, photorealistic near-future civic design visualization through a contemplative lens. Preserve the exact camera viewpoint, recognizable architecture, paths, building facades, mature trees, street geometry, lighting, and weather. Introduce a quiet threshold with a few movable seats, softer permeable ground, framed views, subtle shade, and one restrained sensory element such as a rain chain or breeze-responsive planting. Keep movement unobstructed and make the intervention modest, maintainable, and reversible. Do not add text, logos, official signs, crowds, or invented landmarks. Do not change recognizable faces or bodies. The result is a grounded conversation image, not an approved plan.`,
} as const;

type LensId = keyof typeof lensPrompts;
type RuntimeEnv = {
  DB?: D1Database;
  OPENAI_API_KEY?: string;
};

type Reservation = {
  dailyRemaining: number;
  monthlyRemaining: number;
  releaseMonth: (completed: boolean) => Promise<void>;
};

const runtimeEnv = env as unknown as RuntimeEnv;
let schemaReady = false;

const memoryDaily = new Map<string, number>();
const memoryMonthly = new Map<string, { completed: number; reserved: number }>();

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('X-Content-Type-Options', 'nosniff');
  return Response.json(body, {
    status,
    headers,
  });
}

function isSameOrigin(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function hasValidImageSignature(bytes: Uint8Array) {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return jpeg || png || webp;
}

function getApiKey() {
  return runtimeEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
}

async function visitorHash(request: Request, apiKey: string) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'local';
  const material = new TextEncoder().encode(`${apiKey.slice(-24)}:${address}`);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;
  await db.batch(usageSchema.map((statement) => db.prepare(statement)));
  schemaReady = true;
}

async function reserveInD1(
  db: D1Database,
  day: string,
  month: string,
  hash: string,
  now: string,
  retentionFloor: string,
): Promise<Reservation | 'daily' | 'monthly'> {
  await ensureSchema(db);
  await db.batch([
    db.prepare(
      'INSERT OR IGNORE INTO beta_daily_usage (day, visitor_hash, attempts, updated_at) VALUES (?, ?, 0, ?)',
    ).bind(day, hash, now),
    db.prepare(
      'INSERT OR IGNORE INTO beta_monthly_usage (month, completed, reserved, updated_at) VALUES (?, 0, 0, ?)',
    ).bind(month, now),
    db.prepare('DELETE FROM beta_daily_usage WHERE day < ?').bind(retentionFloor),
  ]);

  const dailyUpdate = await db
    .prepare(
      'UPDATE beta_daily_usage SET attempts = attempts + 1, updated_at = ? WHERE day = ? AND visitor_hash = ? AND attempts < ?',
    )
    .bind(now, day, hash, DAILY_LIMIT)
    .run();

  if (Number(dailyUpdate.meta.changes ?? 0) !== 1) return 'daily';

  const monthUpdate = await db
    .prepare(
      'UPDATE beta_monthly_usage SET reserved = reserved + 1, updated_at = ? WHERE month = ? AND completed + reserved < ?',
    )
    .bind(now, month, MONTHLY_LIMIT)
    .run();

  if (Number(monthUpdate.meta.changes ?? 0) !== 1) return 'monthly';

  const [dailyRow, monthRow] = await Promise.all([
    db
      .prepare('SELECT attempts FROM beta_daily_usage WHERE day = ? AND visitor_hash = ?')
      .bind(day, hash)
      .first<{ attempts: number }>(),
    db
      .prepare('SELECT completed, reserved FROM beta_monthly_usage WHERE month = ?')
      .bind(month)
      .first<{ completed: number; reserved: number }>(),
  ]);

  return {
    dailyRemaining: Math.max(0, DAILY_LIMIT - Number(dailyRow?.attempts ?? DAILY_LIMIT)),
    monthlyRemaining: Math.max(
      0,
      MONTHLY_LIMIT - Number(monthRow?.completed ?? 0) - Number(monthRow?.reserved ?? 0),
    ),
    releaseMonth: async (completed) => {
      await db
        .prepare(
          `UPDATE beta_monthly_usage
           SET reserved = MAX(reserved - 1, 0),
               completed = completed + ?,
               updated_at = ?
           WHERE month = ?`,
        )
        .bind(completed ? 1 : 0, new Date().toISOString(), month)
        .run();
    },
  };
}

function reserveInMemory(day: string, month: string, hash: string): Reservation | 'daily' | 'monthly' {
  const dailyKey = `${day}:${hash}`;
  const attempts = memoryDaily.get(dailyKey) ?? 0;
  if (attempts >= DAILY_LIMIT) return 'daily';
  memoryDaily.set(dailyKey, attempts + 1);

  const usage = memoryMonthly.get(month) ?? { completed: 0, reserved: 0 };
  if (usage.completed + usage.reserved >= MONTHLY_LIMIT) return 'monthly';
  usage.reserved += 1;
  memoryMonthly.set(month, usage);

  return {
    dailyRemaining: DAILY_LIMIT - attempts - 1,
    monthlyRemaining: MONTHLY_LIMIT - usage.completed - usage.reserved,
    releaseMonth: async (completed) => {
      usage.reserved = Math.max(0, usage.reserved - 1);
      if (completed) usage.completed += 1;
    },
  };
}

async function reserveUsage(request: Request, apiKey: string) {
  const now = new Date();
  const iso = now.toISOString();
  const day = iso.slice(0, 10);
  const month = iso.slice(0, 7);
  const retentionFloor = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const hash = await visitorHash(request, apiKey);
  const db = runtimeEnv.DB;
  if (db) return reserveInD1(db, day, month, hash, iso, retentionFloor);

  const hostname = new URL(request.url).hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error('Usage controls are unavailable.');
  }
  return reserveInMemory(day, month, hash);
}

function secondsUntilUtcMidnight() {
  const now = new Date();
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((midnight - now.getTime()) / 1000));
}

function publicOpenAiError(status: number, code?: string) {
  if (status === 400 || code === 'content_policy_violation') {
    return 'This photo could not be transformed. Try a clear public-space photo without close-up faces, private interiors, or sensitive content.';
  }
  if (status === 429) return 'The image service is busy. Please wait a little and try again.';
  if (status === 401 || status === 403) return 'The beta image service is temporarily unavailable.';
  return 'The transformation did not finish. Please try again later.';
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Cross-site requests are not accepted.' }, 403);

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_REQUEST_BYTES) {
    return json({ error: 'The prepared image must be 4 MB or smaller.' }, 413);
  }
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return json({ error: 'Upload a JPEG, PNG, or WebP photo.' }, 415);
  }

  const apiKey = getApiKey();
  if (!apiKey) return json({ error: 'The beta image service is not configured.' }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'The upload could not be read.' }, 400);
  }

  const company = form.get('company');
  if (typeof company === 'string' && company.trim()) {
    return json({ error: 'The request could not be accepted.' }, 400);
  }

  const lensValue = form.get('lens');
  const sizeValue = form.get('outputSize');
  const lens = (typeof lensValue === 'string' ? lensValue : '') as LensId;
  const outputSize = typeof sizeValue === 'string' ? sizeValue : '1024x1024';
  const image = form.get('image');

  if (!(lens in lensPrompts)) return json({ error: 'Choose a vision lens.' }, 400);
  if (!allowedSizes.has(outputSize)) return json({ error: 'The image shape is not supported.' }, 400);
  if (!(image instanceof File)) return json({ error: 'Choose a photo to transform.' }, 400);
  if (image.size < MIN_UPLOAD_BYTES || image.size > MAX_UPLOAD_BYTES) {
    return json({ error: 'The prepared image must be between 20 KB and 4 MB.' }, 413);
  }
  if (!allowedTypes.has(image.type)) {
    return json({ error: 'Use a JPEG, PNG, or WebP photo.' }, 415);
  }

  const signature = new Uint8Array(await image.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(signature)) {
    return json({ error: 'This file does not appear to be a valid image.' }, 415);
  }

  let reservation: Reservation | 'daily' | 'monthly';
  try {
    reservation = await reserveUsage(request, apiKey);
  } catch {
    return json({ error: 'Usage controls are temporarily unavailable.' }, 503);
  }

  if (reservation === 'daily') {
    return json(
      { error: 'This network has used today’s three beta transformations. Try again tomorrow.' },
      429,
      { 'Retry-After': String(secondsUntilUtcMidnight()) },
    );
  }
  if (reservation === 'monthly') {
    return json(
      { error: 'This month’s public beta pool has been used. It resets next month.' },
      429,
      { 'Retry-After': '86400' },
    );
  }

  const body = new FormData();
  body.append('model', 'gpt-image-2');
  body.append('image[]', image, 'possible-city-place.jpg');
  body.append('prompt', lensPrompts[lens]);
  body.append('quality', 'low');
  body.append('size', outputSize);
  body.append('output_format', 'jpeg');
  body.append('output_compression', '82');
  body.append('moderation', 'auto');
  body.append('n', '1');

  try {
    const openAiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(118_000),
    });

    const requestId = openAiResponse.headers.get('x-request-id') ?? undefined;
    const payload = (await openAiResponse.json().catch(() => ({}))) as {
      data?: Array<{ b64_json?: string }>;
      error?: { code?: string };
    };

    if (!openAiResponse.ok) {
      await reservation.releaseMonth(true);
      return json(
        {
          error: publicOpenAiError(openAiResponse.status, payload.error?.code),
          requestId,
        },
        openAiResponse.status >= 500 ? 502 : openAiResponse.status,
      );
    }

    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) {
      await reservation.releaseMonth(true);
      return json({ error: 'The image service returned no transformation.', requestId }, 502);
    }

    await reservation.releaseMonth(true);
    return json({
      image: `data:image/jpeg;base64,${base64}`,
      lens,
      dailyRemaining: reservation.dailyRemaining,
      monthlyRemaining: reservation.monthlyRemaining,
    });
  } catch {
    await reservation.releaseMonth(true);
    return json({ error: 'The transformation timed out. Please try again later.' }, 504);
  }
}
