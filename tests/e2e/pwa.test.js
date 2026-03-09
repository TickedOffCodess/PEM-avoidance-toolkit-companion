import { test, expect } from './global-setup.js';

test.describe('PWA Manifest', () => {
  test('manifest link exists in HTML', async ({ page }) => {
    await page.goto('/');
    const manifest = await page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href');
  });

  test('manifest is fetchable and valid JSON', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const res = await page.request.get(new URL(href, page.url()).href);
    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json).toBeTruthy();
  });

  test('manifest has required PWA fields', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const res = await page.request.get(new URL(href, page.url()).href);
    const manifest = await res.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(manifest.icons).toBeTruthy();
  });

  test('manifest display is standalone', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const res = await page.request.get(new URL(href, page.url()).href);
    const manifest = await res.json();

    expect(manifest.display).toBe('standalone');
  });

  test('manifest has icons with required properties', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const res = await page.request.get(new URL(href, page.url()).href);
    const manifest = await res.json();

    expect(manifest.icons.length).toBeGreaterThan(0);
    const icon = manifest.icons[0];
    expect(icon.src).toBeTruthy();
    expect(icon.sizes).toBeTruthy();
    expect(icon.type).toBeTruthy();
  });
});

test.describe('PWA Meta Tags', () => {
  test('has theme-color meta tag', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="theme-color"]');
    const content = await meta.getAttribute('content');
    expect(content).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test('has apple-mobile-web-app-capable meta tag', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(content).toBe('yes');
  });

  test('has apple-touch-icon link', async ({ page }) => {
    await page.goto('/');
    const icon = page.locator('link[rel="apple-touch-icon"]');
    await expect(icon).toHaveAttribute('href');
  });

  test('has viewport meta tag with mobile configuration', async ({ page }) => {
    await page.goto('/');
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toContain('width=device-width');
  });
});

test.describe('Service Worker', () => {
  test('registers and activates successfully', async ({ page }) => {
    await page.goto('/');

    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active || reg.installing || reg.waiting;
      if (!sw) return null;
      if (sw.state === 'activated') return 'activated';
      // Wait for the SW to finish activating
      return new Promise((resolve) => {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve('activated');
        });
      });
    });

    expect(swState).toBe('activated');
  });

  test('creates the expected cache', async ({ page }) => {
    await page.goto('/');

    // Wait for SW to activate
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active || reg.installing || reg.waiting;
      if (sw && sw.state !== 'activated') {
        await new Promise((resolve) => {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
        });
      }
    });

    // Reload so the active SW intercepts fetch requests and populates cache
    await page.reload({ waitUntil: 'networkidle' });

    const cacheNames = await page.evaluate(() => caches.keys());
    expect(cacheNames).toContain('pem-toolkit-v1');
  });

  test('caches page resources', async ({ page }) => {
    await page.goto('/');

    // Wait for SW to activate
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active || reg.installing || reg.waiting;
      if (sw && sw.state !== 'activated') {
        await new Promise((resolve) => {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') resolve();
          });
        });
      }
    });

    // Reload so fetch handler caches resources
    await page.reload({ waitUntil: 'networkidle' });

    const hasCachedEntries = await page.evaluate(async () => {
      const cache = await caches.open('pem-toolkit-v1');
      const keys = await cache.keys();
      return keys.length > 0;
    });

    expect(hasCachedEntries).toBe(true);
  });
});

test.describe('Offline Functionality', () => {
  test('app renders after going offline', async ({ page, context }) => {
    // First visit to populate the cache
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Wait for SW to finish caching resources
    await page.waitForTimeout(2000);

    // Go offline
    await context.setOffline(true);

    // Reload the page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify the app still renders (not a browser error page)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('PEM Avoidance Toolkit');

    // Restore online
    await context.setOffline(false);
  });

  test('app content is visible offline, not an error page', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.waitForTimeout(2000);

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Should not show typical browser error messages
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('ERR_INTERNET_DISCONNECTED');
    expect(bodyText).not.toContain('No internet');

    await context.setOffline(false);
  });
});

test.describe('IndexedDB Persistence', () => {
  test('data survives page reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Complete onboarding if it appears
    const getStarted = page.getByText('Get Started');
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
    }

    // Verify that after onboarding, the app remembers the state after reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // If onboarding was completed, we should NOT see "Get Started" again
    const getStartedAfterReload = page.getByText('Get Started');
    const isVisible = await getStartedAfterReload.isVisible({ timeout: 1000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });
});
