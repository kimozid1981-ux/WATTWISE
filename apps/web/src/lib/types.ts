import type { CountryCode, LanguageCode, StoredBill } from '@wattwise/core';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface Household {
  name: string;
  occupants: number;
  homeType: 'apartment' | 'house' | 'other';
  heating: 'electric' | 'gas' | 'heat_pump' | 'district' | 'oil' | 'other' | 'unknown';
  hasGas: boolean;
}

export interface Consents {
  /** Required: process the energy data the user enters, to show analyses. ISO timestamp. */
  dataProcessing: string | null;
  /** Optional: send uploaded documents to the AI processor for extraction. ISO timestamp. */
  aiDocumentProcessing: string | null;
  /** Optional: keep a copy of original bill documents. */
  keepOriginalDocuments: boolean;
}

export interface Profile {
  displayName: string | null;
  country: CountryCode;
  language: LanguageCode;
  theme: ThemePreference;
  household: Household;
  consents: Consents;
  createdAt: string;
  updatedAt: string;
}

export interface UserDataExport {
  exportedAt: string;
  format: 'wattwise-export-v1';
  storage: 'firebase' | 'local';
  profile: Profile | null;
  bills: StoredBill[];
}

/** Persistence boundary. Firebase and browser-local implementations share it. */
export interface DataStore {
  readonly kind: 'firebase' | 'local';
  getProfile(): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  listBills(): Promise<StoredBill[]>;
  saveBill(bill: StoredBill, originalFile?: File | null): Promise<void>;
  deleteBill(id: string): Promise<void>;
  exportAll(): Promise<UserDataExport>;
  /** Deletes every piece of data this store holds for the user. */
  deleteAll(): Promise<void>;
}
