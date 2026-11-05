'use client';

import { HardDrive } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useApp } from '@/components/AppProvider';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Logo } from '@/components/Logo';
import { Button, Field, Notice, inputClass } from '@/components/ui';
import { firebaseApp } from '@/lib/firebase';
import type { MessageKey } from '@/i18n';

type AuthMode = 'signin' | 'signup' | 'reset';

const FIREBASE_ERRORS: Record<string, MessageKey> = {
  'auth/invalid-credential': 'auth.err.invalidCredential',
  'auth/wrong-password': 'auth.err.invalidCredential',
  'auth/user-not-found': 'auth.err.invalidCredential',
  'auth/email-already-in-use': 'auth.err.emailInUse',
  'auth/weak-password': 'auth.err.weakPassword',
  'auth/invalid-email': 'auth.err.invalidEmail',
  'auth/too-many-requests': 'auth.err.tooMany',
  'auth/popup-closed-by-user': 'auth.err.popupClosed',
  'auth/network-request-failed': 'auth.err.network',
};

export default function SignInPage() {
  const { t, mode, status, startLocalSession } = useApp();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'ready') router.replace('/app');
  }, [status, router]);

  const fail = (e: unknown) => {
    const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: string }).code) : '';
    setError(t(FIREBASE_ERRORS[code] ?? 'auth.err.generic'));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const auth = await import('firebase/auth');
      const a = auth.getAuth(firebaseApp());
      if (authMode === 'signin') await auth.signInWithEmailAndPassword(a, email, password);
      else if (authMode === 'signup') {
        const cred = await auth.createUserWithEmailAndPassword(a, email, password);
        await auth.sendEmailVerification(cred.user).catch(() => undefined);
      } else {
        await auth.sendPasswordResetEmail(a, email);
        setInfo(t('auth.resetSent'));
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const auth = await import('firebase/auth');
      await auth.signInWithPopup(auth.getAuth(firebaseApp()), new auth.GoogleAuthProvider());
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/" aria-label="WATTWISE">
          <Logo />
        </Link>
        <LanguageSelect compact />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 md:items-center">
        <div className="card w-full max-w-md space-y-6 p-6 md:p-8 fade-in">
          <div>
            <h1 className="font-display text-2xl font-bold">
              {authMode === 'signup' ? t('auth.createTitle') : authMode === 'reset' ? t('auth.resetTitle') : t('auth.title')}
            </h1>
            <p className="mt-1 text-sm text-muted">{t('auth.subtitle')}</p>
          </div>

          {mode === 'local' ? (
            <div className="space-y-4">
              <Notice tone="warn" title={t('auth.localTitle')}>
                {t('auth.localBody')}
              </Notice>
              <Button className="w-full" onClick={startLocalSession}>
                <HardDrive className="size-4" aria-hidden />
                {t('auth.continueLocal')}
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label={t('auth.email')} htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                {authMode !== 'reset' && (
                  <Field
                    label={t('auth.password')}
                    htmlFor="password"
                    hint={authMode === 'signup' ? t('auth.passwordHint') : undefined}
                  >
                    <input
                      id="password"
                      type="password"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      minLength={authMode === 'signup' ? 10 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {info && <Notice tone="success">{info}</Notice>}
                <Button
                  type="submit"
                  className="w-full"
                  loading={busy}
                  disabled={!email || (authMode !== 'reset' && password.length < (authMode === 'signup' ? 10 : 1))}
                >
                  {authMode === 'signup' ? t('auth.createAccount') : authMode === 'reset' ? t('auth.sendReset') : t('auth.signIn')}
                </Button>
              </form>
              {authMode !== 'reset' && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="h-px flex-1 bg-line" />
                    {t('auth.or')}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <Button variant="secondary" className="w-full" onClick={google} disabled={busy}>
                    {t('auth.google')}
                  </Button>
                </>
              )}
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                {authMode === 'signin' ? (
                  <>
                    <button className="text-accent-text hover:underline" onClick={() => setAuthMode('signup')}>
                      {t('auth.noAccount')}
                    </button>
                    <button className="text-muted hover:text-ink" onClick={() => setAuthMode('reset')}>
                      {t('auth.forgot')}
                    </button>
                  </>
                ) : (
                  <button className="text-accent-text hover:underline" onClick={() => setAuthMode('signin')}>
                    {t('auth.haveAccount')}
                  </button>
                )}
              </div>
            </>
          )}
          <p className="text-xs text-muted">
            {t('auth.legal')}{' '}
            <Link href="/privacy" className="underline">
              {t('legal.privacy')}
            </Link>{' '}
            ·{' '}
            <Link href="/terms" className="underline">
              {t('legal.terms')}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
