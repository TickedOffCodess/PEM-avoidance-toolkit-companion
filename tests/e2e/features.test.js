import { test, expect } from '@playwright/test';

// Helper: complete onboarding and dismiss tour
async function completeOnboarding(page) {
  await page.goto('/');
  // Wait for app to render (either onboarding or main UI)
  await page.waitForTimeout(1000);
  // Click Get Started if onboarding is shown
  const getStarted = page.getByRole('button', { name: 'Get Started' });
  if (await getStarted.isVisible().catch(() => false)) {
    await getStarted.click();
    await page.waitForTimeout(500);
    // Dismiss tour steps by clicking Skip
    const skip = page.getByText('Skip');
    if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(500);
    }
  }
  // Wait for header to confirm main UI is rendered
  await page.locator('header').waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Onboarding Tour', () => {
  test('shows tour after clicking Get Started', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByText('Get Started');
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
      // Tour should appear
      const stepText = page.getByText('Step 1 of 4');
      await expect(stepText).toBeVisible({ timeout: 2000 });
      await expect(page.getByText('Track Your Day')).toBeVisible();
    }
  });

  test('tour Next button advances to next step', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByText('Get Started');
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByText('Next').click();
      await expect(page.getByText('Step 2 of 4')).toBeVisible({ timeout: 2000 });
      await expect(page.getByText('See Your Patterns')).toBeVisible();
    }
  });

  test('tour Skip button closes the tour', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByText('Get Started');
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByText('Skip').click();
      // Tour overlay should disappear
      await expect(page.getByText('Step 1 of 4')).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('tour Done button on last step closes the tour', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByText('Get Started');
    if (await getStarted.isVisible({ timeout: 3000 }).catch(() => false)) {
      await getStarted.click();
      // Click Next 3 times to get to step 4
      for (let i = 0; i < 3; i++) {
        await page.getByText('Next').click();
        await page.waitForTimeout(200);
      }
      await expect(page.getByText('Step 4 of 4')).toBeVisible();
      await page.getByText('Done').click();
      await expect(page.getByText('Step 4 of 4')).not.toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Daily Logging Reminder', () => {
  test('shows reminder banner when no entry logged today', async ({ page }) => {
    await completeOnboarding(page);
    // Should show the reminder on the Track tab
    await expect(page.getByText("Don't forget to log today!")).toBeVisible({ timeout: 3000 });
  });

  test('dismiss button hides the reminder', async ({ page }) => {
    await completeOnboarding(page);
    const reminder = page.getByText("Don't forget to log today!");
    if (await reminder.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.getByLabel('Dismiss reminder').click();
      await expect(reminder).not.toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('Export & Backup Modal', () => {
  test('opens export modal with expected buttons', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Export data').click();
    await expect(page.getByText('Export & Backup')).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Copy to Clipboard')).toBeVisible();
    await expect(page.getByText('Download CSV')).toBeVisible();
    await expect(page.getByText('Print Report')).toBeVisible();
    await expect(page.getByText('Download Backup')).toBeVisible();
    await expect(page.getByText('Restore Backup')).toBeVisible();
  });

  test('close button dismisses export modal', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Export data').click();
    await expect(page.getByText('Export & Backup')).toBeVisible();
    await page.getByLabel('Close export dialog').click();
    await expect(page.getByText('Export & Backup')).not.toBeVisible({ timeout: 2000 });
  });

  test('export modal contains report text', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Export data').click();
    // The report text appears in the modal's preview area
    await expect(page.getByRole('dialog').getByText('PEM AVOIDANCE TOOLKIT')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Accessibility - ARIA attributes', () => {
  test('bottom navigation has aria-label', async ({ page }) => {
    await completeOnboarding(page);
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
  });

  test('nav buttons have aria-current for active tab', async ({ page }) => {
    await completeOnboarding(page);
    // Track tab should be active by default
    const trackBtn = page.locator('nav[aria-label="Main navigation"] button[aria-current="page"]');
    await expect(trackBtn).toBeVisible({ timeout: 3000 });
    const text = await trackBtn.textContent();
    expect(text).toContain('Track');
  });

  test('theme toggle has aria-label', async ({ page }) => {
    await completeOnboarding(page);
    const btn = page.getByLabel(/Switch to (light|dark) theme/);
    await expect(btn).toBeVisible();
  });

  test('header uses semantic <header> element', async ({ page }) => {
    await completeOnboarding(page);
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('content area uses semantic <main> element', async ({ page }) => {
    await completeOnboarding(page);
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Tab Navigation', () => {
  test('clicking Patterns tab shows Pattern Analysis', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Patterns').click();
    await expect(page.getByText('Pattern Analysis')).toBeVisible({ timeout: 3000 });
  });

  test('clicking Plan tab shows Crash Avoidance Plan', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Plan').click();
    await expect(page.getByText('Crash Avoidance Plan')).toBeVisible({ timeout: 3000 });
  });

  test('clicking Learn tab shows Learn content', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Learn').click();
    await expect(page.getByText('What is PEM?')).toBeVisible({ timeout: 3000 });
  });

  test('clicking Track tab shows today card', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Patterns').click();
    await page.getByLabel('Track').click();
    await expect(page.getByText(/^Today \u2014/)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Day Editor - Delete Entry', () => {
  test('delete button not shown for new (unsaved) entries', async ({ page }) => {
    await completeOnboarding(page);
    // Click "+ Log" to open editor for today
    await page.getByRole('button', { name: 'Log today\'s entry' }).click();
    await page.waitForTimeout(500);
    // Delete button should NOT be visible since there's no saved entry
    await expect(page.getByText('Delete This Entry')).not.toBeVisible({ timeout: 1000 });
  });

  test('delete button shown for existing entries', async ({ page }) => {
    await completeOnboarding(page);
    // Create an entry first
    await page.getByRole('button', { name: 'Log today\'s entry' }).click();
    await page.waitForTimeout(500);
    await page.getByText('Save').click();
    await page.waitForTimeout(500);
    // Now open the saved entry
    await page.getByRole('button', { name: "Edit today's entry" }).click();
    await page.waitForTimeout(500);
    // Delete button should be visible
    await expect(page.getByText('Delete This Entry')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Lazy Loading', () => {
  test('all tabs load without error', async ({ page }) => {
    await completeOnboarding(page);

    // Track
    await expect(page.getByText(/^Today \u2014/)).toBeVisible({ timeout: 3000 });

    // Patterns
    await page.getByLabel('Patterns').click();
    await expect(page.getByText('Pattern Analysis')).toBeVisible({ timeout: 3000 });

    // Plan
    await page.getByLabel('Plan').click();
    await expect(page.getByText('Crash Avoidance Plan')).toBeVisible({ timeout: 3000 });

    // Learn
    await page.getByLabel('Learn').click();
    await expect(page.getByText('What is PEM?')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Plan View - Accessibility', () => {
  test('plan section buttons have aria-expanded', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Plan').click();
    await page.waitForTimeout(500);
    const causeBtn = page.locator('button[aria-expanded]').first();
    await expect(causeBtn).toBeVisible();
    const expanded = await causeBtn.getAttribute('aria-expanded');
    expect(expanded).toBe('false');
  });

  test('clicking section toggles aria-expanded', async ({ page }) => {
    await completeOnboarding(page);
    await page.getByLabel('Plan').click();
    await page.waitForTimeout(500);
    const causeBtn = page.locator('button[aria-expanded]').first();
    await causeBtn.click();
    const expanded = await causeBtn.getAttribute('aria-expanded');
    expect(expanded).toBe('true');
  });
});
