import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome-stable',
});

const viewports = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-360', width: 360, height: 780 },
  { name: 'mobile-iphone-se', width: 375, height: 667 },
  { name: 'mobile-414', width: 414, height: 896 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];

const pages = ['/cv', '/contact', '/yuyi'];

for (const vp of viewports) {
  for (const p of pages) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`http://localhost:4321${p}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return { docWidth, winWidth, overflows: docWidth > winWidth + 1 };
    });
    const overflowX = await page.evaluate(() => window.scrollX);
    console.log(`${vp.name} ${p}: docWidth=${overflow.docWidth} winWidth=${overflow.winWidth} overflows=${overflow.overflows} scrollX=${overflowX}`);
    await page.close();
  }
}

await browser.close();
console.log('Done');
