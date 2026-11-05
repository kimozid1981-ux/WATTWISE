import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { afterAll, beforeEach, describe, it } from 'vitest';

const env = await initializeTestEnvironment({
  projectId: 'demo-wattwise',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8') },
});
afterAll(() => env.cleanup());

const household = (uid) => ({ ownerId: uid, memberIds: [uid], country: 'FR', name: 'Home', occupants: 2, homeType: 'apartment', heating: 'electric', hasGas: false });
const profile = (hid) => ({ displayName: null, country: 'FR', language: 'fr', theme: 'dark', consents: { dataProcessing: '2026-11-05T00:00:00Z', aiDocumentProcessing: null, keepOriginalDocuments: false }, householdId: hid, createdAt: 'x', updatedAt: 'x' });
const bill = (uid, overrides = {}) => ({
  origin: 'manual', confirmedAt: 'x', createdBy: uid, originalDocumentPath: null,
  data: { energyType: 'electricity', periodStart: '2026-01-01', periodEnd: '2026-01-31', consumption: 620, totalAmount: 166.8, currency: 'EUR', lines: [] },
  ...overrides,
});

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'households/hAlice'), household('alice'));
    await setDoc(doc(db, 'users/alice'), profile('hAlice'));
    await setDoc(doc(db, 'households/hAlice/energy_bills/b1'), bill('alice'));
  });
}

beforeEach(async () => {
  await env.clearFirestore();
  await seed();
});

describe('users', () => {
  it('a user can read their own profile but not someone else’s', async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext('alice').firestore(), 'users/alice')));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice')));
  });
  it('onboarding batch creates household + profile together', async () => {
    const db = env.authenticatedContext('bob').firestore();
    const b = writeBatch(db);
    b.set(doc(db, 'households/hBob'), household('bob'));
    b.set(doc(db, 'users/bob'), profile('hBob'));
    await assertSucceeds(b.commit());
  });
  it('cannot point a profile at another user’s household', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(), 'users/bob'), profile('hAlice')));
  });
  it('rejects unknown fields and unsupported countries', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile('hAlice'), isAdmin: true }));
    await assertFails(setDoc(doc(db, 'users/alice'), { ...profile('hAlice'), country: 'US' }));
  });
});

describe('households', () => {
  it('only members can read a household and its bills', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(alice, 'households/hAlice')));
    await assertSucceeds(getDoc(doc(alice, 'households/hAlice/energy_bills/b1')));
    await assertFails(getDoc(doc(bob, 'households/hAlice')));
    await assertFails(getDoc(doc(bob, 'households/hAlice/energy_bills/b1')));
  });
  it('cannot create a household for someone else or with extra members', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'households/h2'), household('alice')));
    await assertFails(setDoc(doc(bob, 'households/h3'), { ...household('bob'), memberIds: ['bob', 'alice'] }));
  });
  it('outsiders cannot add themselves as members', async () => {
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(updateDoc(doc(bob, 'households/hAlice'), { memberIds: ['alice', 'bob'] }));
  });
  it('a non-owner member cannot change membership', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'households/hAlice'), { memberIds: ['alice', 'carol'] }));
    const carol = env.authenticatedContext('carol').firestore();
    await assertSucceeds(updateDoc(doc(carol, 'households/hAlice'), { occupants: 3 }));
    await assertFails(updateDoc(doc(carol, 'households/hAlice'), { memberIds: ['carol'] }));
    await assertFails(deleteDoc(doc(carol, 'households/hAlice')));
  });
});

describe('energy bills', () => {
  it('members can add valid bills; invalid or foreign ones are rejected', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'households/hAlice/energy_bills/b2'), bill('alice')));
    await assertFails(setDoc(doc(alice, 'households/hAlice/energy_bills/b3'), bill('bob')));
    await assertFails(setDoc(doc(alice, 'households/hAlice/energy_bills/b4'), bill('alice', { data: { ...bill('alice').data, consumption: -5 } })));
    await assertFails(setDoc(doc(alice, 'households/hAlice/energy_bills/b5'), bill('alice', { data: { ...bill('alice').data, periodEnd: '2025-12-01' } })));
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'households/hAlice/energy_bills/b6'), bill('bob')));
  });
  it('confirmed bills are immutable but deletable by members', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(alice, 'households/hAlice/energy_bills/b1'), { 'data.totalAmount': 1 }));
    await assertSucceeds(deleteDoc(doc(alice, 'households/hAlice/energy_bills/b1')));
  });
  it('server-only collections are closed to clients', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('alice').firestore(), 'audit_logs/x')));
  });
});

describe('storage', () => {
  const pdf = new Uint8Array([37, 80, 68, 70]);
  it('members can upload and read original documents; others cannot', async () => {
    const aliceRef = ref(env.authenticatedContext('alice').storage(), 'users/alice/bills/b1/original');
    await assertSucceeds(uploadBytes(aliceRef, pdf, { contentType: 'application/pdf' }));
    await assertSucceeds(getBytes(aliceRef));
    await assertFails(getBytes(ref(env.authenticatedContext('bob').storage(), 'users/alice/bills/b1/original')));
  });
  it('rejects other file types and paths', async () => {
    const s = env.authenticatedContext('alice').storage();
    await assertFails(uploadBytes(ref(s, 'users/alice/bills/b1/original'), pdf, { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(s, 'public/anything'), pdf, { contentType: 'application/pdf' }));
  });
});
