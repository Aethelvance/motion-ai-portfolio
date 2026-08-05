import { chromium } from 'playwright';
import { readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';

const pairs = [
  ['desktop-1280_cv-hero', '/cv', 0],
  ['desktop-1280_cv-capas', '/cv', 1500],
  ['desktop-1280_cv-footer', '/cv', 99999],
  ['desktop-1280_contact', '/contact', 0],
  ['desktop-1280_yuyi', '/yuyi', 0],
  ['tablet-768_cv-hero', '/cv', 0],
  ['tablet-768_contact', '/contact', 0],
  ['mobile-360_contact', '/contact', 0],
  ['mobile-360_yuyi', '/yuyi', 0],
  ['mobile-360_cv-hero', '/cv', 0],
];

const viewports = {
  'desktop-1280': { width: 1280, height: 800 },
  'tablet-768': { width: 768, height: 1024 },
  'mobile-360': { width: 360, height: 780 },
};

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const hash = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

for (const [name, path, scrollY] of pairs) {
  const vpKey = name.split('_')[0];
  const vp = viewports[vpKey];
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`http://localhost:4321${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  if (scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `/tmp/opencode/after/${name}.png` });
  await page.close();
}

await browser.close();

console.log('\nFile size + hash comparison:');
for (const [name] of pairs) {
  const b = `/tmp/opencode/baseline/${name}.png`;
  const a = `/tmp/opencode/after/${name}.png`;
  try {
    const sb = statSync(b).size;
    const sa = statSync(a).size;
    const hb = hash(b);
    const ha = hash(a);
    const sameHash = hb === ha;
    const sizeDelta = sa - sb;
    console.log(`${name.padEnd(28)} | baseline=${sb}b after=${sa}b (${sizeDelta >= 0 ? '+' : ''}${sizeDelta}b) | hash_match=${sameHash}`);
  } catch (e) {
    console.log(`${name}: error - ${e.message}`);
  }
}
