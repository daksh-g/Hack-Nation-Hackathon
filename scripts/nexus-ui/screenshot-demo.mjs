import puppeteer from 'puppeteer';
import path from 'path';

const OUT = '/private/tmp/claude-501/-Users-winstonthov-Documents-Hackathons-Hack-Nation-MIT-Hack-Nation-Hackathon/c37526ad-8853-4a9a-ad2b-75c9fc175593/scratchpad';
const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // 1. Default state — full graph
  console.log('1. Demo default...');
  await page.goto('http://localhost:5173/demo', { waitUntil: 'networkidle0', timeout: 15000 });
  await delay(3000);
  await page.screenshot({ path: path.join(OUT, 'demo-default.png') });

  // 2. Show Contradiction
  console.log('2. Contradiction...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Show Contradiction')) { await btn.click(); break; }
  }
  await delay(1500);
  await page.screenshot({ path: path.join(OUT, 'demo-contradiction.png') });

  // 3. Show Silo
  console.log('3. Silo...');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Show Silo')) { await btn.click(); break; }
  }
  await delay(1500);
  await page.screenshot({ path: path.join(OUT, 'demo-silo.png') });

  // 4. What Changed Today?
  console.log('4. Briefing...');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('What Changed')) { await btn.click(); break; }
  }
  await delay(4000);
  await page.screenshot({ path: path.join(OUT, 'demo-briefing.png') });

  // 5. New Joiner
  console.log('5. Onboarding...');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('New Joiner')) { await btn.click(); break; }
  }
  await delay(1000);
  await page.screenshot({ path: path.join(OUT, 'demo-onboarding.png') });

  // 6. Click Next in onboarding
  console.log('6. Onboarding step 2...');
  const nextBtns = await page.$$('button');
  for (const btn of nextBtns) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Next')) { await btn.click(); break; }
  }
  await delay(500);
  await page.screenshot({ path: path.join(OUT, 'demo-onboarding2.png') });

  // 7. Reset + click a node
  console.log('7. Node detail...');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent);
    if (text.includes('Reset')) { await btn.click(); break; }
  }
  await delay(500);
  // Click near center where HQ nodes are
  const canvas = await page.$('canvas');
  if (canvas) {
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
      await delay(500);
    }
  }
  await page.screenshot({ path: path.join(OUT, 'demo-nodedetail.png') });

  await browser.close();
  console.log('All demo screenshots captured!');
}

main().catch(err => { console.error(err); process.exit(1); });
