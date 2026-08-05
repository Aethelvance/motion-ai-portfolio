import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/tmp/opencode/after';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// Desktop yuyi: verify no hamburger menu + sidebar shows Menu section
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/desktop-1280_yuyi-with-menu.png` });

  const hamburgerExists = await page.locator('button[aria-label="Open menu"]').count();
  const menuSection = await page.locator('text=Menu').count();
  const cvLink = await page.locator('nav[aria-label="Site navigation"] a[href="/cv"]').count();
  const yuyiLink = await page.locator('nav[aria-label="Site navigation"] a[href="/yuyi"]').count();
  const contactLink = await page.locator('nav[aria-label="Site navigation"] a[href="/contact"]').count();
  console.log('Desktop 1280 /yuyi:');
  console.log('  hamburger present:', hamburgerExists > 0 ? 'YES (BUG)' : 'NO (correct)');
  console.log('  Menu label:', menuSection > 0 ? 'YES' : 'NO');
  console.log('  CV link:', cvLink, '| Yuyi link:', yuyiLink, '| Contact link:', contactLink);
  await page.close();
}

// Mobile yuyi: open sidebar drawer
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/mobile-360_yuyi-no-hamburger.png` });

  const hamburgerExists = await page.locator('button[aria-label="Open menu"]').count();
  console.log('Mobile 360 /yuyi (sidebar closed):');
  console.log('  hamburger present:', hamburgerExists > 0 ? 'YES (BUG)' : 'NO (correct)');

  await page.locator('button[aria-label="Abrir sidebar"]').first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/mobile-360_yuyi-drawer-with-menu.png` });
  await page.close();
}

// /cv should still have hamburger
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const hamburgerExists = await page.locator('button[aria-label="Open menu"]').count();
  console.log('Desktop 1280 /cv:');
  console.log('  hamburger present:', hamburgerExists > 0 ? 'YES (correct)' : 'NO (BUG)');
  await page.close();
}

await browser.close();
