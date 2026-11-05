'use client';

import { getCountry, launchCountries, type CountryCode } from '@wattwise/core';
import { Download, ExternalLink, LogOut, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { AFTER_SIGN_OUT_KEY } from '@/components/AppShell';
import { HouseholdFields } from '@/components/HouseholdFields';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Button, Card, Field, Notice, SectionTitle, inputClass, cx } from '@/components/ui';
import { countryName } from '@/i18n';
import { removeDemoData } from '@/lib/demo';
import type { Profile, ThemePreference } from '@/lib/types';

export default function ProfilePage() {
  const { t, profile, saveProfile, language, store, signOut, mode, user, bills, refreshBills, setTheme, firebaseUser } = useApp();
  const router = useRouter();
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (!profile || !draft) return null;
  const country = getCountry(profile.country);
  const hasDemo = bills.some((b) => b.origin === 'demo');

  const save = async (next: Profile = draft) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile({ ...next, language, updatedAt: new Date().toISOString() });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    if (!store) return;
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wattwise-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteEverything = async () => {
    if (!store) return;
    setDeleting(true);
    setError(null);
    sessionStorage.setItem(AFTER_SIGN_OUT_KEY, '/');
    try {
      await store.deleteAll();
      if (mode === 'firebase' && firebaseUser) {
        const { deleteUser } = await import('firebase/auth');
        await deleteUser(firebaseUser);
      } else await signOut();
      router.replace('/');
    } catch (e) {
      const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
      sessionStorage.removeItem(AFTER_SIGN_OUT_KEY);
      setError(code === 'auth/requires-recent-login' ? t('profile.reauth') : e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  const deleteWord = t('profile.deleteWord');

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('profile.title')}</h1>
        <p className="text-sm text-muted">
          {mode === 'local' ? t('profile.localAccount') : t('profile.signedInAs', { email: user?.email ?? '' })}
        </p>
      </div>

      <Card className="space-y-4">
        <SectionTitle>{t('profile.preferences')}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('profile.country')} htmlFor="p-country" hint={t('profile.countryHint')}>
            <select
              id="p-country"
              className={inputClass}
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value as CountryCode })}
            >
              {launchCountries().map((c) => (
                <option key={c.code} value={c.code}>
                  {countryName(c.code, language)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('profile.language')} htmlFor="p-lang">
            <LanguageSelect id="p-lang" />
          </Field>
          <Field label={t('profile.theme')} htmlFor="p-theme">
            <select
              id="p-theme"
              className={inputClass}
              value={draft.theme}
              onChange={(e) => {
                const theme = e.target.value as ThemePreference;
                setTheme(theme);
                setDraft({ ...draft, theme });
              }}
            >
              {(['dark', 'light', 'system'] as const).map((th) => (
                <option key={th} value={th}>
                  {t(`theme.${th}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>{t('profile.household')}</SectionTitle>
        <HouseholdFields value={draft.household} onChange={(household) => setDraft({ ...draft, household })} />
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-accent-text">{t('common.saved')}</span>}
        <Button onClick={() => save()} loading={saving}>
          {t('common.save')}
        </Button>
      </div>

      <Card className="space-y-4">
        <SectionTitle>{t('profile.privacy')}</SectionTitle>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-[var(--ww-accent)]"
            checked={Boolean(draft.consents.aiDocumentProcessing)}
            onChange={(e) => {
              const next = {
                ...draft,
                consents: { ...draft.consents, aiDocumentProcessing: e.target.checked ? new Date().toISOString() : null },
              };
              setDraft(next);
              void save(next);
            }}
          />
          <span>
            <span className="font-semibold">{t('consent.ai.title')}</span>
            <span className="block text-muted">{t('consent.ai.body')}</span>
          </span>
        </label>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download className="size-4" aria-hidden />
            {t('profile.export')}
          </Button>
          {hasDemo && (
            <Button
              variant="secondary"
              onClick={async () => {
                if (!store) return;
                await removeDemoData(store);
                await refreshBills();
              }}
            >
              {t('profile.removeDemo')}
            </Button>
          )}
        </div>
        <div className="rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="mb-2 font-semibold">{t('profile.sources', { country: countryName(country.code, language) })}</p>
          <ul className="space-y-1">
            {country.officialSources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent-text hover:underline">
                  {s.name}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
          {country.reviewStatus === 'draft' && <p className="mt-2 text-xs text-muted">{t('profile.sourcesDraft')}</p>}
        </div>
      </Card>

      <Card className="space-y-4 border-danger/30">
        <SectionTitle>{t('profile.dangerZone')}</SectionTitle>
        <p className="text-sm text-muted">{mode === 'local' ? t('profile.deleteLocalBody') : t('profile.deleteBody')}</p>
        <Field label={t('profile.typeToConfirm', { word: deleteWord })} htmlFor="del-confirm">
          <input id="del-confirm" className={cx(inputClass, 'max-w-xs')} value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex flex-wrap justify-between gap-3">
          <Button variant="danger" disabled={confirmDelete.trim().toUpperCase() !== deleteWord.toUpperCase()} loading={deleting} onClick={deleteEverything}>
            <Trash2 className="size-4" aria-hidden />
            {t('profile.deleteAll')}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              sessionStorage.setItem(AFTER_SIGN_OUT_KEY, '/');
              await signOut();
              router.replace('/');
            }}
          >
            <LogOut className="size-4" aria-hidden />
            {t('profile.signOut')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
