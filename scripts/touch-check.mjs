import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
await page.goto('http://localhost:4321/cv', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const targets = await page.evaluate(() => {
  const get = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { selector, w: Math.round(r.width), h: Math.round(r.height) };
  };
  return {
    menuTrigger: get('button[aria-label="Open menu"]'),
    aiBubble: get('button[aria-label="Abrir Yuyi AI"]'),
    heroCTAs: Array.from(document.querySelectorAll('a[href*="cv.pdf"], a[href*="contact"]')).map(el => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  };
});
console.log(JSON.stringify(targets, null, 2));

await page.close();
await browser.close();
