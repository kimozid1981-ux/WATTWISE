import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FINDING_CODES_FOR_TEST } from './testFixtures';
import { coverage, DICTIONARIES, translate } from './index';
import { en } from './en';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(tsx?|ts)$/.test(name) && !name.endsWith('.test.ts') ? [p] : [];
  });
}

describe('i18n', () => {
  it('interpolates parameters and falls back to English', () => {
    expect(translate('fr', 'dashboard.greeting', { name: 'Maison' })).toBe('Bonjour · Maison');
    expect(translate('de', 'bill.explainTitle')).toBe(en['bill.explainTitle']);
  });

  it('French is complete', () => {
    expect(coverage('fr').translated).toBe(Object.keys(en).length);
  });

  it('no dictionary contains keys unknown to English', () => {
    for (const dict of Object.values(DICTIONARIES)) for (const k of Object.keys(dict)) expect(en).toHaveProperty(k);
  });

  it('placeholders match between English and translations', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const [lang, dict] of Object.entries(DICTIONARIES))
      for (const [k, v] of Object.entries(dict)) expect(ph(v as string), `${lang}:${k}`).toBe(ph(en[k as keyof typeof en]));
  });

  it('every static key used in the code exists in the English dictionary', () => {
    const root = path.resolve(__dirname, '..');
    const used = new Set<string>();
    for (const f of sourceFiles(root)) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]!);
    }
    expect(used.size).toBeGreaterThan(100);
    const missing = [...used].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it('has title/body/action text for every analysis finding', () => {
    for (const code of FINDING_CODES_FOR_TEST)
      for (const part of ['title', 'body', 'action']) expect(en).toHaveProperty(`finding.${code}.${part}`);
  });

  it('reports coverage of partial languages', () => {
    const report = Object.fromEntries(
      (['de', 'es', 'pt', 'nl', 'it'] as const).map((l) => [l, `${coverage(l).translated}/${coverage(l).total}`]),
    );
    console.info('Translation coverage', report);
    expect(coverage('de').translated).toBeGreaterThan(50);
  });
});
