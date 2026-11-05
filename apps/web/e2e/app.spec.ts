import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const SHOTS = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

/** Local-mode sign-in + onboarding for France, in English. */
async function onboard(page: Page) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-init')) {
      localStorage.clear();
      localStorage.setItem('wattwise.lang', 'en');
      sessionStorage.setItem('e2e-init', '1');
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand your energy.');
  await page.getByRole('link', { name: 'Get started free' }).click();
  await expect(page.getByText('Accounts are not configured on this installation')).toBeVisible();
  await page.getByRole('button', { name: 'Continue in local mode' }).click();

  await expect(page.getByRole('heading', { name: 'Where is your home?' })).toBeVisible();
  const cont = page.getByRole('button', { name: 'Continue' });
  await expect(cont).toBeDisabled();
  await page.getByRole('radio', { name: /France/ }).click();
  await cont.click();
  await page.getByLabel('Household name').fill('Lyon flat');
  await page.getByLabel('Main heating').selectOption('electric');
  await page.getByRole('button', { name: 'Continue' }).click();
  const finish = page.getByRole('button', { name: 'Finish setup' });
  await expect(finish).toBeDisabled();
  await page.getByText('Process my energy data to show analyses').click();
  await page.getByText('Allow AI reading of uploaded documents').click();
  await finish.click();
  await expect(page.getByRole('heading', { name: 'Your energy overview' })).toBeVisible();
}

test('onboarding leads to an empty dashboard, then DEMO data fills it with labels', async ({ page }) => {
  await onboard(page);
  await expect(page.getByText('Add your first bill to see your dashboard')).toBeVisible();
  await expect(page.getByText('Local mode').first()).toBeVisible();
  await shot(page, '01-dashboard-empty');

  await page.getByRole('button', { name: 'Explore with DEMO data' }).click();
  await expect(page.getByText(/DEMO data is loaded/)).toBeVisible();
  await expect(page.getByText('Average per day')).toBeVisible();
  await expect(page.getByText('Estimated per year')).toBeVisible();
  await expect(page.getByText('sum of your last 12 months of bills')).toBeVisible();
  await expect(page.getByText('DEMO', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();
  await shot(page, '02-dashboard-demo');

  await page.getByRole('link', { name: 'Bills' }).first().click();
  await expect(page.getByRole('heading', { name: 'Bills' })).toBeVisible();
  await expect(page.locator('a[href^="/app/bills/view"]')).toHaveCount(12);

  // Remove demo data from Profile
  await page.getByRole('link', { name: 'Profile' }).first().click();
  await page.getByRole('button', { name: 'Remove DEMO data' }).click();
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByText('Add your first bill to see your dashboard')).toBeVisible();
});

test('upload → AI extraction (mock) → review → confirm → analysis', async ({ page }) => {
  await onboard(page);
  await page.goto('/app/bills/new');
  await expect(page.getByText('Drop your bill here')).toBeVisible();

  // Wrong type is rejected client-side
  await page.getByTestId('bill-file-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByText('This file type is not supported')).toBeVisible();

  await page.getByTestId('bill-file-input').setInputFiles({
    name: 'facture.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fictional test bill'),
  });
  await expect(page.getByText('Please check what we read')).toBeVisible();
  await expect(page.getByLabel('Supplier')).toHaveValue('E2E Test Énergie');
  await expect(page.getByLabel('Period start')).toHaveValue('2026-08-01');
  await expect(page.getByText('1 field(s) are highlighted')).toBeVisible();
  await expect(page.getByText('Fictional end-to-end test document.')).toBeVisible();
  await shot(page, '03-review');

  // Data minimisation: drop the meter reference before saving
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByLabel('Meter / delivery point reference')).toHaveValue('');

  await page.getByRole('button', { name: 'Confirm and analyse' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Test Énergie' })).toBeVisible();
  await expect(page.getByText('Your bill in simple words')).toBeVisible();
  // 310 kWh × 0.20 = 62.00 but bill prints 65.00 → mismatch; estimated reading flagged
  await expect(page.locator('[data-finding="LINE_MATH_MISMATCH"]')).toContainText('€62.00');
  await expect(page.locator('[data-finding="READING_ESTIMATED"]')).toBeVisible();
  await expect(page.locator('[data-finding="FIRST_BILL"]')).toBeVisible();
  await expect(page.getByText('Does not match the printed amount')).toBeVisible();
  await shot(page, '04-analysis');

  // Dashboard now uses the confirmed bill (31 days, 310 kWh → 10 kWh/day)
  await page.getByRole('link', { name: 'Home' }).first().click();
  await expect(page.getByRole('img', { name: /Average daily consumption: 10 kWh/ })).toBeVisible();
  await expect(page.getByText('Where the money goes')).toBeVisible();
});

test('manual entry validates fields before saving', async ({ page }) => {
  await onboard(page);
  await page.goto('/app/bills/new');
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByRole('button', { name: 'Confirm and analyse' }).click();
  await expect(page.getByText(/Please fix \d+ field\(s\)/)).toBeVisible();
  await expect(page.getByText('This field is required.').first()).toBeVisible();

  await page.getByLabel('Period start').fill('2026-09-01');
  await page.getByLabel('Period end').fill('2026-08-01');
  await page.locator('#consumption').fill('250,5');
  await page.locator('#totalAmount').fill('80,00');
  await page.getByRole('button', { name: 'Confirm and analyse' }).click();
  await expect(page.getByText('The end date is before the start date.')).toBeVisible();

  await page.getByLabel('Period end').fill('2026-09-30');
  await page.getByRole('button', { name: 'Confirm and analyse' }).click();
  await expect(page.getByText('Your bill in simple words')).toBeVisible();
  await expect(page.getByText(/This bill covers 30 days\. You used 251\skWh/)).toBeVisible();
});

test('profile: language switch, export and delete everything', async ({ page }) => {
  await onboard(page);
  await page.getByRole('link', { name: 'Profile' }).first().click();
  await page.locator('#p-lang').selectOption('fr');
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Accueil' }).first()).toBeVisible();
  await page.locator('#p-lang').selectOption('en');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export my data (JSON)' }).click();
  const download = await downloadPromise;
  const data = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(data.format).toBe('wattwise-export-v1');
  expect(data.profile.country).toBe('FR');
  expect(data.profile.household.name).toBe('Lyon flat');

  const del = page.getByRole('button', { name: 'Delete everything' });
  await expect(del).toBeDisabled();
  await page.getByLabel('Type DELETE to confirm').fill('delete');
  await del.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand your energy.');
  const stored = await page.evaluate(() => localStorage.getItem('wattwise.local.profile.v1'));
  expect(stored).toBeNull();
});

test('@mobile bottom navigation and dashboard on a phone', async ({ page }) => {
  await onboard(page);
  await page.getByRole('button', { name: 'Explore with DEMO data' }).click();
  await expect(page.getByText('Average per day')).toBeVisible();
  const nav = page.locator('nav.fixed');
  await expect(nav).toBeVisible();
  await shot(page, '05-mobile-dashboard');
  await nav.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { name: 'Insights', level: 1 })).toBeVisible();
  await expect(page.getByText('Appliance cost calculator')).toBeVisible();
  // 2000 W × 3 h × 0.20 €/kWh (DEMO price) = 6 kWh → €1.20
  await expect(page.getByText(/6\skWh per day, costing about €1\.20 per day/)).toBeVisible();
  await shot(page, '06-mobile-insights');
});
