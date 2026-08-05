import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT_DIR = '/tmp/opencode/baseline';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const viewports = [
  { name: 'mobile-360', width: 360, height: 780 },
  { name: 'mobile-iphone-se', width: 375, height: 667 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const pages = [
    { name: 'cv-hero', path: '/cv', wait: 2000 },
    { name: 'cv-capas', path: '/cv', scroll: 1500, wait: 1500 },
    { name: 'cv-footer', path: '/cv', scroll: 99999, wait: 1500 },
    { name: 'contact', path: '/contact', wait: 1500 },
    { name: 'yuyi', path: '/yuyi', wait: 1500 },
  ];

  for (const p of pages) {
    await page.goto(`http://localhost:4321${p.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(p.wait);
    if (p.scroll) {
      await page.evaluate((y) => window.scrollTo(0, y), p.scroll);
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${OUT_DIR}/${vp.name}_${p.name}.png`, fullPage: false });
  }
  await page.close();
}

await browser.close();
console.log('Baseline screenshots saved to', OUT_DIR);
