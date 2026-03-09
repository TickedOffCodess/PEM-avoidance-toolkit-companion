import { test as base } from '@playwright/test';

// Block external requests (e.g. Google Fonts) that may be unreachable in CI
// and would cause page.goto to hang waiting for the load event.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/*.googleapis.com/**', route => route.abort());
    await page.route('**/*.gstatic.com/**', route => route.abort());
    await use(page);
  },
});

export { expect } from '@playwright/test';
