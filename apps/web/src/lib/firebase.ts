'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

/**
 * Firebase web configuration. These values identify the project and are safe
 * to ship to browsers; access is enforced by security rules and App Check.
 * If they are missing the app runs in LOCAL MODE (no account, browser storage).
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let appCheckStarted = false;
let emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new Error('Firebase is not configured');
  const app = getApps().length ? getApp() : initializeApp(config);
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (siteKey && !appCheckStarted && typeof window !== 'undefined') {
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
    appCheckStarted = true;
  }
  // Local development / automated tests against the Firebase Emulator Suite.
  if (process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true' && !emulatorsConnected) {
    emulatorsConnected = true;
    connectAuthEmulator(getAuth(app), 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(getFirestore(app), '127.0.0.1', 8080);
    connectStorageEmulator(getStorage(app), '127.0.0.1', 9199);
  }
  return app;
}
