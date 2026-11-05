import { COUNTRIES } from '@wattwise/core';
import { describe, expect, it, vi } from 'vitest';
import { parseDecimal } from '@/components/bills/NumberInput';
import { authoriseExtraction, RateLimiter } from './auth';
import { ExtractionError, OpenAIBillExtractor, extractorFromEnv } from './openaiExtractor';

describe('parseDecimal', () => {
  it.each([
    ['0,2516', 0.2516],
    ['1 234,56', 1234.56],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['42', 42],
    ['', null],
    ['abc', undefined],
  ])('%s → %s', (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });
});

describe('authoriseExtraction', () => {
  const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;
  it('accepts a valid Firebase token', async () => {
    const r = await authoriseExtraction('Bearer good', '1.2.3.4', env({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'p' }), async (t) =>
      t === 'good' ? { uid: 'u1' } : null,
    );
    expect(r).toEqual({ allowed: true, subject: 'uid:u1' });
  });
  it('rejects an invalid token', async () => {
    const r = await authoriseExtraction('Bearer bad', 'ip', env({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'p' }), async () => null);
    expect(r.allowed).toBe(false);
  });
  it('rejects anonymous calls by default and in production', async () => {
    expect((await authoriseExtraction(null, 'ip', env({}))).allowed).toBe(false);
    expect(
      (await authoriseExtraction(null, 'ip', env({ ALLOW_ANONYMOUS_EXTRACTION: 'true', NODE_ENV: 'production' }))).allowed,
    ).toBe(false);
  });
  it('allows anonymous calls only when explicitly enabled outside production', async () => {
    const r = await authoriseExtraction(null, 'ip', env({ ALLOW_ANONYMOUS_EXTRACTION: 'true', NODE_ENV: 'development' }));
    expect(r).toEqual({ allowed: true, subject: 'ip:ip' });
  });
});

describe('RateLimiter', () => {
  it('limits per key within a window', () => {
    const l = new RateLimiter(2, 1000);
    expect(l.take('a', 0)).toBe(true);
    expect(l.take('a', 1)).toBe(true);
    expect(l.take('a', 2)).toBe(false);
    expect(l.take('b', 2)).toBe(true);
    expect(l.take('a', 1001)).toBe(true);
  });
});

describe('OpenAIBillExtractor', () => {
  const input = { bytes: new Uint8Array([37, 80, 68, 70]), mimeType: 'application/pdf', fileName: 'b.pdf', country: COUNTRIES.FR };

  it('is disabled without key and model', () => {
    expect(extractorFromEnv({} as NodeJS.ProcessEnv)).toBeNull();
    expect(extractorFromEnv({ OPENAI_API_KEY: 'k' } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });

  it('sends a strict JSON-schema request without storing it, and normalises the answer', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.store).toBe(false);
      expect(body.text.format.strict).toBe(true);
      expect(body.input[0].content[0].type).toBe('input_file');
      expect(body.instructions).toContain('FR');
      return new Response(
        JSON.stringify({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    isEnergyBill: true,
                    energyType: 'electricity',
                    supplier: 'Test',
                    periodStart: '2026-01-01',
                    periodEnd: '2026-01-31',
                    consumption: 620,
                    consumptionUnit: 'kWh',
                    readingType: 'actual',
                    lines: [],
                    totalAmount: 166.8,
                    currency: 'EUR',
                    notes: [],
                    uncertainFields: [],
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      );
    });
    const ex = new OpenAIBillExtractor({ apiKey: 'k', model: 'm', fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = await ex.extract(input);
    expect(out.draft.consumption).toBe(620);
    expect(out.provider).toBe('openai');
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('maps provider failures and non-bills to typed errors', async () => {
    const failing = new OpenAIBillExtractor({ apiKey: 'k', model: 'm', fetchImpl: (async () => new Response('x', { status: 500 })) as unknown as typeof fetch });
    await expect(failing.extract(input)).rejects.toMatchObject({ code: 'ai_failed' });
    const notBill = new OpenAIBillExtractor({
      apiKey: 'k',
      model: 'm',
      fetchImpl: (async () =>
        new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: '{"isEnergyBill":false}' }] }] }))) as unknown as typeof fetch,
    });
    await expect(notBill.extract(input)).rejects.toBeInstanceOf(ExtractionError);
    await expect(notBill.extract(input)).rejects.toMatchObject({ code: 'not_a_bill' });
  });
});
