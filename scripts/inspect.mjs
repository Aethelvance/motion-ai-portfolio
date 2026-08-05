import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label="Abrir sidebar"]');
  if (!btn) return null;
  const cs = getComputedStyle(btn);
  const classes = btn.className;
  // Find the CSS module class
  const moduleClasses = Array.from(btn.classList).filter(c => c.includes('__'));
  return {
    classes,
    moduleClasses,
    height: cs.height,
    width: cs.width,
    mediaMatches: window.matchMedia('(max-width: 767px)').matches,
  };
});
console.log(JSON.stringify(info, null, 2));

await page.close();
await browser.close();
