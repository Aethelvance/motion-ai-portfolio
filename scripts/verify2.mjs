import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT_DIR = '/tmp/opencode/after';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// Footer email view at 360 - try multiple scroll approaches
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Scroll to bottom via window
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(800);
  const y = await page.evaluate(() => window.scrollY);
  console.log('Final scroll Y at 360:', y);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_footer-email-v2.png`, fullPage: false });

  // Scroll up a bit to see the email
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight - 1200, behavior: 'instant' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_footer-email-v3.png`, fullPage: false });

  await page.close();
}

await browser.close();
console.log('Done');
