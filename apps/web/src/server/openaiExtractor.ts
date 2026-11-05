import {
  BILL_EXTRACTION_JSON_SCHEMA,
  buildExtractionInstructions,
  normaliseExtraction,
  type BillExtractor,
  type ExtractionInput,
  type ExtractionOutput,
} from '@wattwise/core';

/**
 * OpenAI implementation of the model-independent BillExtractor interface.
 * Runs server-side only; the API key never reaches a browser or mobile app.
 * Uses plain HTTPS (Responses API) so the provider can be swapped easily.
 */
export class ExtractionError extends Error {
  constructor(
    public code: 'ai_failed' | 'not_a_bill' | 'timeout',
    message: string,
  ) {
    super(message);
  }
}

export interface OpenAIExtractorConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OpenAIBillExtractor implements BillExtractor {
  readonly provider = 'openai';
  constructor(private cfg: OpenAIExtractorConfig) {}

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    const b64 = Buffer.from(input.bytes).toString('base64');
    const dataUrl = `data:${input.mimeType};base64,${b64}`;
    const filePart =
      input.mimeType === 'application/pdf'
        ? { type: 'input_file', filename: input.fileName || 'bill.pdf', file_data: dataUrl }
        : { type: 'input_image', image_url: dataUrl, detail: 'high' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs ?? 90_000);
    let res: Response;
    try {
      res = await (this.cfg.fetchImpl ?? fetch)(`${this.cfg.baseUrl ?? 'https://api.openai.com/v1'}/responses`, {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${this.cfg.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.cfg.model,
          instructions: buildExtractionInstructions(input.country),
          input: [
            {
              role: 'user',
              content: [filePart, { type: 'input_text', text: 'Extract the data of this energy bill as JSON.' }],
            },
          ],
          text: {
            format: { type: 'json_schema', name: 'bill_extraction', strict: true, schema: BILL_EXTRACTION_JSON_SCHEMA },
          },
          // Do not let the provider retain the request for later retrieval.
          store: false,
        }),
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw new ExtractionError('timeout', 'AI extraction timed out');
      throw new ExtractionError('ai_failed', `AI request failed: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // Log status only, never document content.
      throw new ExtractionError('ai_failed', `AI provider returned HTTP ${res.status}`);
    }
    const body = (await res.json()) as {
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string; refusal?: string }> }>;
    };
    const text = body.output
      ?.flatMap((o) => o.content ?? [])
      .find((c) => c.type === 'output_text' && typeof c.text === 'string')?.text;
    if (!text) throw new ExtractionError('ai_failed', 'AI provider returned no structured output');

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ExtractionError('ai_failed', 'AI provider returned invalid JSON');
    }
    const { draft, uncertainFields, isEnergyBill } = normaliseExtraction(raw);
    if (!isEnergyBill) throw new ExtractionError('not_a_bill', 'Document is not an energy bill');
    return { draft, uncertainFields, provider: this.provider, model: this.cfg.model };
  }
}

export function extractorFromEnv(env: NodeJS.ProcessEnv = process.env): OpenAIBillExtractor | null {
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) return null;
  return new OpenAIBillExtractor({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL || undefined,
  });
}
