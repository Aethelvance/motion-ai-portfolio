import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT_DIR = '/tmp/opencode/after';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// YuyiPage mobile: open the sidebar drawer
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_yuyi-sidebar-closed.png`, fullPage: false });

  await page.locator('button[aria-label="Abrir sidebar"]').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_yuyi-sidebar-open.png`, fullPage: false });

  await page.locator('button[aria-label="Cerrar sidebar"]').nth(1).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_yuyi-sidebar-after-close.png`, fullPage: false });

  await page.close();
}

// AIAssistant chat open on mobile
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.locator('button[aria-label="Abrir Yuyi AI"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_ai-open.png`, fullPage: false });
  await page.close();
}

// Hero ctas to verify menu trigger rendering
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500); // let entry animation finish
  await page.screenshot({ path: `${OUT_DIR}/mobile-360_cv-hero-settled.png`, fullPage: false });
  await page.close();
}

await browser.close();
console.log('Interaction screenshots saved');
