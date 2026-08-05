import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.locator('button[aria-label="Abrir sidebar"]').first().click();
await page.waitForTimeout(500);

const overflow = await page.evaluate(() => {
  const docWidth = document.documentElement.scrollWidth;
  const winWidth = window.innerWidth;
  return { docWidth, winWidth, overflows: docWidth > winWidth + 1 };
});
console.log('Drawer open:', overflow);

await page.close();
await browser.close();
