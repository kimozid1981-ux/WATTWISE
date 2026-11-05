import { expect, test } from '@playwright/test';

/** Firebase mode against the Emulator Suite: real Auth, Firestore and security rules. */
test('sign up, onboard, save a bill to Firestore, sign out/in, delete account', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;
  const password = 'correct-horse-battery';
  await page.addInitScript(() => localStorage.setItem('wattwise.lang', 'en'));

  await page.goto('/signin');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Where is your home?' })).toBeVisible();
  await page.getByRole('radio', { name: /Belgium/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Household name').fill('Brussels flat');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Process my energy data to show analyses').click();
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByText('Hello · Brussels flat')).toBeVisible();
  await expect(page.getByText('Local mode')).toHaveCount(0);

  await page.goto('/app/bills/new');
  await page.getByRole('button', { name: 'Enter manually' }).click();
  await page.getByLabel('Supplier').fill('Emulator Energy');
  await page.getByLabel('Period start').fill('2026-07-01');
  await page.getByLabel('Period end').fill('2026-07-31');
  await page.locator('#consumption').fill('186');
  await page.locator('#totalAmount').fill('62,40');
  await page.getByRole('button', { name: 'Confirm and analyse' }).click();
  await expect(page.getByRole('heading', { name: 'Emulator Energy' })).toBeVisible();

  // Persisted in Firestore: survives a reload and a new sign-in.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Emulator Energy' })).toBeVisible();
  await page.goto('/app/profile');
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Hello · Brussels flat')).toBeVisible();
  await page.getByRole('link', { name: 'Bills' }).first().click();
  await expect(page.getByText('Emulator Energy')).toBeVisible();

  // Delete everything, including the auth account.
  await page.getByRole('link', { name: 'Profile' }).first().click();
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Understand your energy.');
  await page.goto('/signin');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
});
