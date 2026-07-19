import { chromium } from 'playwright';

const OUT_DIR = '/tmp/opencode';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome-stable',
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto('http://localhost:4321');
  await page.waitForTimeout(1000);

  await page.locator('button[aria-label="Open menu"]').click();
  await page.waitForTimeout(1450);
  await page.screenshot({ path: `${OUT_DIR}/link-open.png` });

  await page.locator('a[href="/cv"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/link-closing.png` });

  await page.waitForTimeout(1800);
  console.log('Final URL:', page.url());
  await page.screenshot({ path: `${OUT_DIR}/link-destination.png` });

  await browser.close();
})();
