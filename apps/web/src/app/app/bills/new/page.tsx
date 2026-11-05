'use client';

import {
  emptyBillDraft,
  getCountry,
  MAX_UPLOAD_BYTES,
  SUPPORTED_UPLOAD_TYPES,
  validateBillDraft,
  type BillDraft,
  type BillOrigin,
  type ValidationIssue,
} from '@wattwise/core';
import { Camera, FileUp, PencilLine, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { BillReviewForm } from '@/components/bills/BillReviewForm';
import { Button, Card, Notice, Spinner, cx } from '@/components/ui';
import type { MessageKey } from '@/i18n';

type Stage = 'select' | 'extracting' | 'review';

interface AiStatus {
  aiConfigured: boolean;
  authRequired: boolean;
}

export default function NewBillPage() {
  const { t, profile, store, saveProfile, refreshBills, getIdToken, mode } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('select');
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<BillDraft>(emptyBillDraft());
  const [origin, setOrigin] = useState<BillOrigin>('manual');
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetch('/api/bills/extract')
      .then((r) => r.json())
      .then((s: AiStatus) => setAi(s))
      .catch(() => setAi({ aiConfigured: false, authRequired: false }));
  }, []);

  if (!profile) return null;
  const country = getCountry(profile.country);
  const hasAiConsent = Boolean(profile.consents.aiDocumentProcessing);

  const startManual = () => {
    setDraft(emptyBillDraft({ currency: country.currency, consumptionUnit: 'kWh', energyType: 'electricity' }));
    setOrigin('manual');
    setUncertain([]);
    setNotes([]);
    setFile(null);
    setStage('review');
  };

  const grantAiConsent = async () => {
    const now = new Date().toISOString();
    await saveProfile({ ...profile, consents: { ...profile.consents, aiDocumentProcessing: now }, updatedAt: now });
  };

  const handleFile = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!(SUPPORTED_UPLOAD_TYPES as readonly string[]).includes(f.type)) return setError(t('upload.err.type'));
    if (f.size > MAX_UPLOAD_BYTES) return setError(t('upload.err.size'));
    setFile(f);
    setStage('extracting');
    try {
      const body = new FormData();
      body.append('file', f);
      body.append('country', country.code);
      const token = await getIdToken();
      const res = await fetch('/api/bills/extract', {
        method: 'POST',
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = `upload.err.${json.code ?? 'generic'}` as MessageKey;
        setError(t(key));
        setStage('select');
        return;
      }
      setDraft({ ...json.draft, currency: json.draft.currency ?? country.currency });
      setUncertain(json.uncertainFields ?? []);
      setNotes(json.draft.notes ?? []);
      setOrigin('ai_extraction');
      setStage('review');
    } catch {
      setError(t('upload.err.network'));
      setStage('select');
    }
  };

  const confirm = async () => {
    if (!store) return;
    const result = validateBillDraft(draft, { expectedCurrency: country.currency });
    if (!result.ok) {
      setIssues(result.issues);
      setError(t('review.fixErrors', { count: result.issues.length }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIssues([]);
    setError(null);
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await store.saveBill(
        { id, origin, confirmedAt: new Date().toISOString(), data: result.bill },
        keepOriginal && mode === 'firebase' ? file : null,
      );
      await refreshBills();
      router.push(`/app/bills/view?id=${encodeURIComponent(id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-display text-2xl font-bold">{t('upload.title')}</h1>
      <p className="mb-6 text-sm text-muted">{t('upload.subtitle')}</p>

      {error && <Notice tone="error" className="mb-4">{error}</Notice>}

      {stage === 'select' && (
        <div className="grid gap-4">
          {ai === null ? (
            <Spinner />
          ) : !ai.aiConfigured ? (
            <Notice tone="info" title={t('upload.aiOffTitle')}>
              {t('upload.aiOffBody')}
            </Notice>
          ) : !hasAiConsent ? (
            <Notice tone="info" title={t('upload.consentTitle')}>
              <p>{t('consent.ai.body')}</p>
              <Button className="mt-3" onClick={grantAiConsent}>
                {t('upload.consentGive')}
              </Button>
            </Notice>
          ) : null}

          {ai?.aiConfigured && hasAiConsent && (
            <Card
              className={cx('border-2 border-dashed transition', dragOver ? 'border-accent bg-accent/5' : 'border-line')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files[0]);
              }}
            >
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-accent/12 text-accent-text">
                  <Sparkles className="size-6" aria-hidden />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">{t('upload.dropTitle')}</p>
                  <p className="text-sm text-muted">{t('upload.dropBody')}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button onClick={() => fileRef.current?.click()}>
                    <FileUp className="size-4" aria-hidden />
                    {t('upload.choose')}
                  </Button>
                  <Button variant="secondary" className="sm:hidden" onClick={() => cameraRef.current?.click()}>
                    <Camera className="size-4" aria-hidden />
                    {t('upload.photo')}
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept={SUPPORTED_UPLOAD_TYPES.join(',')}
                  data-testid="bill-file-input"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <input ref={cameraRef} type="file" className="sr-only" accept="image/*" capture="environment" onChange={(e) => void handleFile(e.target.files?.[0])} />
                <p className="text-xs text-muted">{t('upload.privacyNote')}</p>
              </div>
            </Card>
          )}

          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{t('upload.manualTitle')}</p>
              <p className="text-sm text-muted">{t('upload.manualBody')}</p>
            </div>
            <Button variant="secondary" onClick={startManual}>
              <PencilLine className="size-4" aria-hidden />
              {t('upload.manual')}
            </Button>
          </Card>
        </div>
      )}

      {stage === 'extracting' && (
        <Card>
          <Spinner label={t('upload.extracting')} />
        </Card>
      )}

      {stage === 'review' && (
        <Card className="space-y-6">
          {origin === 'ai_extraction' ? (
            <Notice tone="warn" title={t('review.aiTitle')}>
              {t('review.aiBody')}
              {uncertain.length > 0 && <p className="mt-1">{t('review.uncertainCount', { count: uncertain.length })}</p>}
            </Notice>
          ) : (
            <Notice tone="info">{t('review.manualBody')}</Notice>
          )}
          {notes.length > 0 && (
            <div className="rounded-2xl bg-surface-2 p-4 text-sm">
              <p className="mb-1 font-semibold">{t('review.notes')}</p>
              <ul className="list-disc space-y-1 pl-5 text-muted">
                {notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <BillReviewForm draft={draft} onChange={setDraft} issues={issues} uncertain={uncertain} />
          {file && mode === 'firebase' && (
            <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--ww-accent)]" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} />
              <span>
                <span className="font-semibold">{t('review.keepOriginal')}</span>
                <span className="block text-muted">{t('review.keepOriginalHint')}</span>
              </span>
            </label>
          )}
          <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5">
            <Button variant="ghost" onClick={() => setStage('select')}>
              {t('common.back')}
            </Button>
            <Button onClick={confirm} loading={saving}>
              {t('review.confirm')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
