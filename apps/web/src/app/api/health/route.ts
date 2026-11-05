import { NextResponse } from 'next/server';
import { extractorFromEnv } from '@/server/openaiExtractor';

export const dynamic = 'force-dynamic';

/** Which features are configured. Booleans only; never echoes configuration values. */
export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      firebaseConfigured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      aiExtractionConfigured: extractorFromEnv() !== null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
