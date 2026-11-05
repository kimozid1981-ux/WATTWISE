'use client';

import type { StoredBill } from '@wattwise/core';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { deleteObject, getStorage, ref, uploadBytes } from 'firebase/storage';
import { firebaseApp } from './firebase';
import type { DataStore, Household, Profile, UserDataExport } from './types';

/**
 * Firestore-backed store.
 *
 *   users/{uid}                                   profile + householdId
 *   households/{householdId}                      household, ownerId, memberIds
 *   households/{householdId}/energy_bills/{id}    confirmed bills
 *   Storage: households/{householdId}/bills/{id}/original   (only if the user opted in)
 *
 * Access is enforced by firebase/firestore.rules and firebase/storage.rules.
 */
export class FirestoreDataStore implements DataStore {
  readonly kind = 'firebase' as const;
  private db: Firestore;
  private householdId: string | null = null;

  constructor(private user: User) {
    this.db = getFirestore(firebaseApp());
  }

  private userRef() {
    return doc(this.db, 'users', this.user.uid);
  }

  private async ensureHouseholdId(): Promise<string | null> {
    if (this.householdId) return this.householdId;
    const snap = await getDoc(this.userRef());
    this.householdId = (snap.exists() && (snap.data().householdId as string | undefined)) || null;
    return this.householdId;
  }

  async getProfile(): Promise<Profile | null> {
    const snap = await getDoc(this.userRef());
    if (!snap.exists()) return null;
    const u = snap.data();
    this.householdId = u.householdId ?? null;
    if (!this.householdId) return null;
    const h = await getDoc(doc(this.db, 'households', this.householdId));
    if (!h.exists()) return null;
    const hd = h.data();
    const household: Household = {
      name: hd.name,
      occupants: hd.occupants,
      homeType: hd.homeType,
      heating: hd.heating,
      hasGas: hd.hasGas,
    };
    return {
      displayName: u.displayName ?? null,
      country: u.country,
      language: u.language,
      theme: u.theme ?? 'dark',
      consents: u.consents,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      household,
    };
  }

  async saveProfile(profile: Profile): Promise<void> {
    let householdId = await this.ensureHouseholdId();
    const isNew = !householdId;
    if (!householdId) householdId = doc(collection(this.db, 'households')).id;
    const batch = writeBatch(this.db);
    const hRef = doc(this.db, 'households', householdId);
    batch.set(
      hRef,
      {
        ...profile.household,
        country: profile.country,
        updatedAt: serverTimestamp(),
        ...(isNew ? { ownerId: this.user.uid, memberIds: [this.user.uid], createdAt: serverTimestamp() } : {}),
      },
      { merge: true },
    );
    batch.set(
      this.userRef(),
      {
        displayName: profile.displayName,
        country: profile.country,
        language: profile.language,
        theme: profile.theme,
        consents: profile.consents,
        householdId,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      { merge: true },
    );
    await batch.commit();
    this.householdId = householdId;
  }

  private async billsCollection() {
    const hid = await this.ensureHouseholdId();
    if (!hid) throw new Error('Household not set up yet');
    return collection(this.db, 'households', hid, 'energy_bills');
  }

  async listBills(): Promise<StoredBill[]> {
    const hid = await this.ensureHouseholdId();
    if (!hid) return [];
    const snap = await getDocs(collection(this.db, 'households', hid, 'energy_bills'));
    return snap.docs.map((d) => {
      const v = d.data();
      return { id: d.id, origin: v.origin, confirmedAt: v.confirmedAt, data: v.data } as StoredBill;
    });
  }

  async saveBill(bill: StoredBill, originalFile?: File | null): Promise<void> {
    const col = await this.billsCollection();
    let originalDocumentPath: string | null = null;
    if (originalFile) {
      originalDocumentPath = `households/${this.householdId}/bills/${bill.id}/original`;
      await uploadBytes(ref(getStorage(firebaseApp()), originalDocumentPath), originalFile, {
        contentType: originalFile.type,
      });
    }
    await setDoc(doc(col, bill.id), {
      origin: bill.origin,
      confirmedAt: bill.confirmedAt,
      data: bill.data,
      createdBy: this.user.uid,
      originalDocumentPath,
      createdAt: serverTimestamp(),
    });
  }

  async deleteBill(id: string): Promise<void> {
    const col = await this.billsCollection();
    const ref_ = doc(col, id);
    const snap = await getDoc(ref_);
    const path = snap.exists() ? (snap.data().originalDocumentPath as string | null) : null;
    if (path) await deleteObject(ref(getStorage(firebaseApp()), path)).catch(() => undefined);
    await deleteDoc(ref_);
  }

  async exportAll(): Promise<UserDataExport> {
    return {
      exportedAt: new Date().toISOString(),
      format: 'wattwise-export-v1',
      storage: 'firebase',
      profile: await this.getProfile(),
      bills: await this.listBills(),
    };
  }

  async deleteAll(): Promise<void> {
    const hid = await this.ensureHouseholdId();
    if (hid) {
      for (const b of await this.listBills()) await this.deleteBill(b.id);
      await deleteDoc(doc(this.db, 'households', hid));
    }
    await deleteDoc(this.userRef());
    this.householdId = null;
  }
}
