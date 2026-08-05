import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT_DIR = '/tmp/opencode/after';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// Very narrow viewport (320 - iPhone 5/SE original)
{
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT_DIR}/mobile-320_cv-hero.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - 1200, behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/mobile-320_footer-email.png`, fullPage: false });
  await page.close();
}

// Wider phone (414 - iPhone XR)
{
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${OUT_DIR}/mobile-414_cv-hero.png`, fullPage: false });
  await page.close();
}

await browser.close();
console.log('Final verify saved');
