import { demoBills, getCountry } from '@wattwise/core';
import type { DataStore, Profile } from './types';

/** Adds the clearly labelled DEMO household bills to the current store. */
export async function loadDemoData(store: DataStore, profile: Profile): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  for (const bill of demoBills(getCountry(profile.country), today)) await store.saveBill(bill);
}

export async function removeDemoData(store: DataStore): Promise<void> {
  for (const bill of await store.listBills()) if (bill.origin === 'demo') await store.deleteBill(bill.id);
}
