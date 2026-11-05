'use client';

import { isLanguageCode, type LanguageCode, type StoredBill } from '@wattwise/core';
import type { User } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type MessageKey } from '@/i18n';
import { firebaseApp, isFirebaseConfigured } from '@/lib/firebase';
import { LocalDataStore } from '@/lib/localStore';
import type { DataStore, Profile, ThemePreference } from '@/lib/types';

type Status = 'loading' | 'signed_out' | 'ready';

export interface AuthUser {
  uid: string;
  email: string | null;
  isLocal: boolean;
}

interface AppContextValue {
  status: Status;
  mode: 'firebase' | 'local';
  user: AuthUser | null;
  store: DataStore | null;
  profile: Profile | null;
  bills: StoredBill[];
  billsLoading: boolean;
  error: string | null;
  language: LanguageCode;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  setLanguage: (lang: LanguageCode) => void;
  setTheme: (theme: ThemePreference) => void;
  saveProfile: (p: Profile) => Promise<void>;
  refreshBills: () => Promise<void>;
  startLocalSession: () => void;
  signOut: () => Promise<void>;
  /** Firebase ID token for server calls, or null in local mode. */
  getIdToken: () => Promise<string | null>;
  firebaseUser: User | null;
}

const AppContext = createContext<AppContextValue | null>(null);

const LOCAL_SESSION_KEY = 'wattwise.local.session';
const LANG_KEY = 'wattwise.lang';
const THEME_KEY = 'wattwise.theme';

function detectLanguage(): LanguageCode {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (isLanguageCode(saved)) return saved;
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
  return isLanguageCode(nav) ? nav : 'en';
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const mode: 'firebase' | 'local' = isFirebaseConfigured() ? 'firebase' : 'local';
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [store, setStore] = useState<DataStore | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bills, setBills] = useState<StoredBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguageState] = useState<LanguageCode>('en');

  useEffect(() => {
    setLanguageState(detectLanguage());
    try {
      applyTheme((window.localStorage.getItem(THEME_KEY) as ThemePreference) || 'dark');
    } catch {
      applyTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const loadForStore = useCallback(async (s: DataStore) => {
    setStore(s);
    try {
      const p = await s.getProfile();
      setProfile(p);
      if (p) {
        setLanguageState(p.language);
        applyTheme(p.theme);
      }
      setBillsLoading(true);
      setBills(p ? await s.listBills() : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBillsLoading(false);
      setStatus('ready');
    }
  }, []);

  // Auth state
  useEffect(() => {
    if (mode === 'local') {
      let has = false;
      try {
        has = window.localStorage.getItem(LOCAL_SESSION_KEY) === '1';
      } catch {
        /* ignore */
      }
      if (has) {
        setUser({ uid: 'local', email: null, isLocal: true });
        void loadForStore(new LocalDataStore());
      } else setStatus('signed_out');
      return;
    }
    let unsub = () => {};
    void (async () => {
      const [{ getAuth, onAuthStateChanged }, { FirestoreDataStore }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firestoreStore'),
      ]);
      unsub = onAuthStateChanged(getAuth(firebaseApp()), (u) => {
        setFirebaseUser(u);
        if (!u) {
          setUser(null);
          setStore(null);
          setProfile(null);
          setBills([]);
          setStatus('signed_out');
          return;
        }
        setUser({ uid: u.uid, email: u.email, isLocal: false });
        void loadForStore(new FirestoreDataStore(u));
      });
    })();
    return () => unsub();
  }, [mode, loadForStore]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      mode,
      user,
      store,
      profile,
      bills,
      billsLoading,
      error,
      language,
      firebaseUser,
      t: (key, params) => translate(language, key, params),
      setLanguage: (lang) => {
        setLanguageState(lang);
        try {
          window.localStorage.setItem(LANG_KEY, lang);
        } catch {
          /* ignore */
        }
      },
      setTheme: (theme) => {
        applyTheme(theme);
        try {
          window.localStorage.setItem(THEME_KEY, theme);
        } catch {
          /* ignore */
        }
      },
      saveProfile: async (p) => {
        if (!store) throw new Error('Not signed in');
        await store.saveProfile(p);
        setProfile(p);
        setLanguageState(p.language);
        applyTheme(p.theme);
        setBills(await store.listBills());
      },
      refreshBills: async () => {
        if (!store) return;
        setBillsLoading(true);
        try {
          setBills(await store.listBills());
        } finally {
          setBillsLoading(false);
        }
      },
      startLocalSession: () => {
        window.localStorage.setItem(LOCAL_SESSION_KEY, '1');
        setUser({ uid: 'local', email: null, isLocal: true });
        setStatus('loading');
        void loadForStore(new LocalDataStore());
      },
      signOut: async () => {
        if (mode === 'local') {
          window.localStorage.removeItem(LOCAL_SESSION_KEY);
          setUser(null);
          setStore(null);
          setProfile(null);
          setBills([]);
          setStatus('signed_out');
          return;
        }
        const { getAuth, signOut } = await import('firebase/auth');
        await signOut(getAuth(firebaseApp()));
      },
      getIdToken: async () => (firebaseUser ? firebaseUser.getIdToken() : null),
    }),
    [status, mode, user, store, profile, bills, billsLoading, error, language, firebaseUser, loadForStore],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
