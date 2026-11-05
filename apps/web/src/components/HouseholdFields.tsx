'use client';

import type { Household } from '@/lib/types';
import { useApp } from './AppProvider';
import { Field, inputClass } from './ui';

const HOME_TYPES: Household['homeType'][] = ['apartment', 'house', 'other'];
const HEATING: Household['heating'][] = ['electric', 'gas', 'heat_pump', 'district', 'oil', 'other', 'unknown'];

export function HouseholdFields({ value, onChange }: { value: Household; onChange: (h: Household) => void }) {
  const { t } = useApp();
  const set = <K extends keyof Household>(k: K, v: Household[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label={t('household.name')} htmlFor="hh-name" hint={t('household.nameHint')}>
          <input id="hh-name" className={inputClass} value={value.name} maxLength={60} onChange={(e) => set('name', e.target.value)} />
        </Field>
      </div>
      <Field label={t('household.occupants')} htmlFor="hh-occ">
        <input
          id="hh-occ"
          type="number"
          min={1}
          max={20}
          className={inputClass}
          value={value.occupants}
          onChange={(e) => set('occupants', Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        />
      </Field>
      <Field label={t('household.homeType')} htmlFor="hh-type">
        <select id="hh-type" className={inputClass} value={value.homeType} onChange={(e) => set('homeType', e.target.value as Household['homeType'])}>
          {HOME_TYPES.map((h) => (
            <option key={h} value={h}>
              {t(`household.home.${h}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t('household.heating')} htmlFor="hh-heat">
        <select id="hh-heat" className={inputClass} value={value.heating} onChange={(e) => set('heating', e.target.value as Household['heating'])}>
          {HEATING.map((h) => (
            <option key={h} value={h}>
              {t(`household.heat.${h}`)}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-3 self-end rounded-xl border border-line bg-surface-2 px-3 py-3 text-sm">
        <input type="checkbox" className="size-4 accent-[var(--ww-accent)]" checked={value.hasGas} onChange={(e) => set('hasGas', e.target.checked)} />
        {t('household.hasGas')}
      </label>
    </div>
  );
}
