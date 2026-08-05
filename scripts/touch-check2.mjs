import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

// Check mobile touch targets
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const targets = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      toggle: get('button[aria-label="Abrir sidebar"]'),
      paperclip: get('button[aria-label="Adjuntar imagen"]'),
      send: get('button[aria-label="Enviar"]'),
    };
  });
  console.log('Mobile 360:', JSON.stringify(targets, null, 2));
  await page.close();
}

// Check desktop touch targets (should be h-9 w-9 = 36px)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:4321/yuyi', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const targets = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      toggle: get('button[aria-label="Cerrar sidebar"]'),
      paperclip: get('button[aria-label="Adjuntar imagen"]'),
      send: get('button[aria-label="Enviar"]'),
    };
  });
  console.log('Desktop 1280:', JSON.stringify(targets, null, 2));
  await page.close();
}

await browser.close();
