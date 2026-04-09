const { test, devices } = require('@playwright/test');

test.use({ ...devices['iPhone 13'], storageState: '/tmp/library-app-storage-local-home.json' });

test('sheet shot', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/app/', { waitUntil: 'networkidle' });
  await page.locator('.doc-row').first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/library-app-sheet-local-v33.png' });
});
