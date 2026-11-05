import { getCountry, isCountryCode, MAX_UPLOAD_BYTES, SUPPORTED_UPLOAD_TYPES } from '@wattwise/core';
import { NextResponse, type NextRequest } from 'next/server';
import { authoriseExtraction, RateLimiter } from '@/server/auth';
import { ExtractionError, extractorFromEnv } from '@/server/openaiExtractor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new RateLimiter(20, 60 * 60 * 1000);

function err(status: number, code: string) {
  return NextResponse.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Feature status for the client: booleans only, never configuration values. */
export async function GET() {
  return NextResponse.json(
    {
      aiConfigured: extractorFromEnv() !== null,
      authRequired: !(process.env.ALLOW_ANONYMOUS_EXTRACTION === 'true' && process.env.NODE_ENV !== 'production'),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/**
 * Extract bill data from an uploaded document. The file is processed in
 * memory and never stored by this endpoint. The result is a DRAFT that the
 * user must review and confirm.
 */
export async function POST(req: NextRequest) {
  const extractor = extractorFromEnv();
  if (!extractor) return err(503, 'ai_not_configured');

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const access = await authoriseExtraction(req.headers.get('authorization'), ip);
  if (!access.allowed) return err(access.status, access.code);
  if (!limiter.take(access.subject)) return err(429, 'rate_limited');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err(400, 'type');
  }
  const file = form.get('file');
  const country = form.get('country');
  if (!(file instanceof File)) return err(400, 'type');
  if (!isCountryCode(country)) return err(400, 'country');
  if (!(SUPPORTED_UPLOAD_TYPES as readonly string[]).includes(file.type)) return err(415, 'type');
  if (file.size > MAX_UPLOAD_BYTES) return err(413, 'size');

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractor.extract({
      bytes,
      mimeType: file.type,
      fileName: file.name.slice(0, 100),
      country: getCountry(country),
    });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof ExtractionError) {
      console.warn(`[extract] ${e.code}: ${e.message}`);
      return err(e.code === 'not_a_bill' ? 422 : e.code === 'timeout' ? 504 : 502, e.code);
    }
    console.error('[extract] unexpected error', (e as Error).message);
    return err(500, 'generic');
  }
}
