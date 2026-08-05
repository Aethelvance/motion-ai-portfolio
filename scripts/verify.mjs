import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT_DIR = '/tmp/opencode/after';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// Footer email view at 360
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  // Scroll to the very bottom of the page to see the footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 2000));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_footer-email.png`, fullPage: false });
  await page.close();
}

// Same for iPhone SE
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight - 1800));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/mobile-iphone-se_footer-email.png`, fullPage: false });
  await page.close();
}

// Verify the menu open on mobile
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.locator('button[aria-label="Open menu"]').click();
  await page.waitForTimeout(1450);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_menu-open.png`, fullPage: false });
  await page.close();
}

// Open AI chat on desktop
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('button[aria-label="Abrir Yuyi AI"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/desktop-1280_ai-open.png`, fullPage: false });
  await page.close();
}

await browser.close();
console.log('Verification screenshots saved');
