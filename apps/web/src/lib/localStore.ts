import type { StoredBill } from '@wattwise/core';
import type { DataStore, Profile, UserDataExport } from './types';

/**
 * LOCAL MODE store: everything stays in this browser's localStorage.
 * Used when Firebase is not configured. Original documents are never stored.
 */
const PROFILE_KEY = 'wattwise.local.profile.v1';
const BILLS_KEY = 'wattwise.local.bills.v1';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export class LocalDataStore implements DataStore {
  readonly kind = 'local' as const;

  async getProfile(): Promise<Profile | null> {
    return read<Profile | null>(PROFILE_KEY, null);
  }

  async saveProfile(profile: Profile): Promise<void> {
    write(PROFILE_KEY, profile);
  }

  async listBills(): Promise<StoredBill[]> {
    return read<StoredBill[]>(BILLS_KEY, []);
  }

  async saveBill(bill: StoredBill): Promise<void> {
    const bills = (await this.listBills()).filter((b) => b.id !== bill.id);
    bills.push(bill);
    write(BILLS_KEY, bills);
  }

  async deleteBill(id: string): Promise<void> {
    write(
      BILLS_KEY,
      (await this.listBills()).filter((b) => b.id !== id),
    );
  }

  async exportAll(): Promise<UserDataExport> {
    return {
      exportedAt: new Date().toISOString(),
      format: 'wattwise-export-v1',
      storage: 'local',
      profile: await this.getProfile(),
      bills: await this.listBills(),
    };
  }

  async deleteAll(): Promise<void> {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(BILLS_KEY);
  }
}
