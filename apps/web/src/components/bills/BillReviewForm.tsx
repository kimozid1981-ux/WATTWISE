'use client';

import {
  CONSUMPTION_UNITS,
  ENERGY_TYPES,
  LINE_CATEGORIES,
  READING_TYPES,
  type BillDraft,
  type ChargeLine,
  type ValidationIssue,
} from '@wattwise/core';
import { Plus, Trash2 } from 'lucide-react';
import type { MessageKey } from '@/i18n';
import { useApp } from '../AppProvider';
import { Field, inputClass, cx } from '../ui';
import { NumberInput } from './NumberInput';

/**
 * Editable review of an extracted (or blank) bill. Nothing is used for
 * calculations until the user confirms this form and validation passes.
 */
export function BillReviewForm({
  draft,
  onChange,
  issues,
  uncertain,
}: {
  draft: BillDraft;
  onChange: (d: BillDraft) => void;
  issues: ValidationIssue[];
  uncertain: string[];
}) {
  const { t } = useApp();
  const set = <K extends keyof BillDraft>(k: K, v: BillDraft[K]) => onChange({ ...draft, [k]: v });
  const issueFor = (field: string): string | null => {
    const i = issues.find((x) => x.field === field);
    return i ? t(`validation.${i.code}` as MessageKey) : null;
  };
  const hint = (field: string): string | undefined => (uncertain.includes(field) ? t('review.uncertain') : undefined);
  const flag = (field: string) => cx(uncertain.includes(field) && 'border-warn/70 bg-warn/5');

  const setLine = (i: number, patch: Partial<ChargeLine>) =>
    set(
      'lines',
      draft.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)),
    );

  return (
    <div className="space-y-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display font-semibold">{t('review.sectionContract')}</legend>
        <Field label={t('field.energyType')} htmlFor="energyType" error={issueFor('energyType')} hint={hint('energyType')}>
          <select
            id="energyType"
            className={cx(inputClass, flag('energyType'))}
            aria-invalid={!!issueFor('energyType')}
            value={draft.energyType ?? ''}
            onChange={(e) => {
              const v = (e.target.value || null) as BillDraft['energyType'];
              onChange({ ...draft, energyType: v, consumptionUnit: v === 'electricity' ? 'kWh' : draft.consumptionUnit });
            }}
          >
            <option value="">{t('common.select')}</option>
            {ENERGY_TYPES.map((e) => (
              <option key={e} value={e}>
                {t(`energy.${e}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('field.supplier')} htmlFor="supplier" hint={hint('supplier')}>
          <input id="supplier" className={cx(inputClass, flag('supplier'))} value={draft.supplier ?? ''} onChange={(e) => set('supplier', e.target.value || null)} />
        </Field>
        <Field label={t('field.contractName')} htmlFor="contractName" hint={hint('contractName')}>
          <input id="contractName" className={cx(inputClass, flag('contractName'))} value={draft.contractName ?? ''} onChange={(e) => set('contractName', e.target.value || null)} />
        </Field>
        <Field label={t('field.readingType')} htmlFor="readingType" hint={hint('readingType') ?? t('review.readingHint')}>
          <select id="readingType" className={cx(inputClass, flag('readingType'))} value={draft.readingType} onChange={(e) => set('readingType', e.target.value as BillDraft['readingType'])}>
            {READING_TYPES.map((r) => (
              <option key={r} value={r}>
                {t(`reading.${r}`)}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-display font-semibold">{t('review.sectionPeriod')}</legend>
        <Field label={t('field.periodStart')} htmlFor="periodStart" error={issueFor('periodStart')} hint={hint('periodStart')}>
          <input id="periodStart" type="date" aria-invalid={!!issueFor('periodStart')} className={cx(inputClass, flag('periodStart'))} value={draft.periodStart ?? ''} onChange={(e) => set('periodStart', e.target.value || null)} />
        </Field>
        <Field label={t('field.periodEnd')} htmlFor="periodEnd" error={issueFor('periodEnd')} hint={hint('periodEnd')}>
          <input id="periodEnd" type="date" aria-invalid={!!issueFor('periodEnd')} className={cx(inputClass, flag('periodEnd'))} value={draft.periodEnd ?? ''} onChange={(e) => set('periodEnd', e.target.value || null)} />
        </Field>
        <Field label={t('field.issueDate')} htmlFor="issueDate" error={issueFor('issueDate')} hint={hint('issueDate')}>
          <input id="issueDate" type="date" className={cx(inputClass, flag('issueDate'))} value={draft.issueDate ?? ''} onChange={(e) => set('issueDate', e.target.value || null)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-display font-semibold">{t('review.sectionConsumption')}</legend>
        <Field label={t('field.consumption')} htmlFor="consumption" error={issueFor('consumption')} hint={hint('consumption')}>
          <NumberInput id="consumption" value={draft.consumption} onChange={(v) => set('consumption', v)} invalid={!!issueFor('consumption')} className={flag('consumption')} />
        </Field>
        <Field label={t('field.consumptionUnit')} htmlFor="consumptionUnit" error={issueFor('consumptionUnit')} hint={hint('consumptionUnit')}>
          <select id="consumptionUnit" aria-invalid={!!issueFor('consumptionUnit')} className={cx(inputClass, flag('consumptionUnit'))} value={draft.consumptionUnit ?? ''} onChange={(e) => set('consumptionUnit', (e.target.value || null) as BillDraft['consumptionUnit'])}>
            <option value="">{t('common.select')}</option>
            {CONSUMPTION_UNITS.filter((u) => draft.energyType !== 'electricity' || u === 'kWh').map((u) => (
              <option key={u} value={u}>
                {u === 'm3' ? 'm³' : u}
              </option>
            ))}
          </select>
        </Field>
        {draft.energyType === 'gas' && draft.consumptionUnit === 'm3' && (
          <Field label={t('field.gasConversionFactor')} htmlFor="gcf" error={issueFor('gasConversionFactor')} hint={t('review.gasFactorHint')}>
            <NumberInput id="gcf" value={draft.gasConversionFactor} onChange={(v) => set('gasConversionFactor', v)} />
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 font-display font-semibold">{t('review.sectionLines')}</legend>
        <p className="text-xs text-muted">{t('review.linesHint')}</p>
        <div className="space-y-3">
          {draft.lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-line bg-surface-2 p-3 sm:grid-cols-[2fr_1.3fr_1fr_0.7fr_1fr_1fr_auto]">
              <input aria-label={t('line.label')} className={inputClass} value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} />
              <select aria-label={t('line.category')} className={inputClass} value={l.category} onChange={(e) => setLine(i, { category: e.target.value as ChargeLine['category'] })}>
                {LINE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
              <NumberInput ariaLabel={t('line.quantity')} placeholder={t('line.quantity')} value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} className={flag(`lines.${i}.quantity`)} />
              <input aria-label={t('line.unit')} placeholder={t('line.unit')} className={inputClass} value={l.quantityUnit ?? ''} onChange={(e) => setLine(i, { quantityUnit: e.target.value || null })} />
              <NumberInput ariaLabel={t('line.unitPrice')} placeholder={t('line.unitPrice')} value={l.unitPrice} onChange={(v) => setLine(i, { unitPrice: v })} className={flag(`lines.${i}.unitPrice`)} />
              <NumberInput ariaLabel={t('line.amount')} placeholder={t('line.amount')} value={l.amount} onChange={(v) => setLine(i, { amount: v })} className={flag(`lines.${i}.amount`)} />
              <button
                type="button"
                aria-label={t('line.remove')}
                className="grid min-h-11 place-items-center rounded-xl px-3 text-muted hover:bg-danger/10 hover:text-danger"
                onClick={() => set('lines', draft.lines.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-line px-4 py-2 text-sm text-muted hover:text-ink"
          onClick={() =>
            set('lines', [
              ...draft.lines,
              { label: '', category: 'energy', timeBand: null, quantity: null, quantityUnit: 'kWh', unitPrice: null, amount: null },
            ])
          }
        >
          <Plus className="size-4" aria-hidden />
          {t('line.add')}
        </button>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-3 font-display font-semibold">{t('review.sectionTotal')}</legend>
        <Field label={t('field.totalAmount')} htmlFor="totalAmount" error={issueFor('totalAmount')} hint={hint('totalAmount') ?? t('review.totalHint')}>
          <NumberInput id="totalAmount" value={draft.totalAmount} onChange={(v) => set('totalAmount', v)} invalid={!!issueFor('totalAmount')} className={flag('totalAmount')} />
        </Field>
        <Field label={t('field.amountDue')} htmlFor="amountDue" hint={hint('amountDue') ?? t('review.amountDueHint')}>
          <NumberInput id="amountDue" value={draft.amountDue} onChange={(v) => set('amountDue', v)} className={flag('amountDue')} />
        </Field>
        <Field label={t('field.currency')} htmlFor="currency" error={issueFor('currency')} hint={hint('currency')}>
          <input id="currency" maxLength={3} aria-invalid={!!issueFor('currency')} className={cx(inputClass, 'uppercase', flag('currency'))} value={draft.currency ?? ''} onChange={(e) => set('currency', e.target.value.toUpperCase() || null)} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display font-semibold">{t('review.sectionPrivacy')}</legend>
        <Field label={t('field.meterReference')} htmlFor="meterRef" hint={t('review.meterHint')}>
          <div className="flex gap-2">
            <input id="meterRef" className={inputClass} value={draft.meterReference ?? ''} onChange={(e) => set('meterReference', e.target.value || null)} />
            {draft.meterReference && (
              <button type="button" className="rounded-xl border border-line px-3 text-xs text-muted hover:text-ink" onClick={() => set('meterReference', null)}>
                {t('review.remove')}
              </button>
            )}
          </div>
        </Field>
      </fieldset>
    </div>
  );
}
