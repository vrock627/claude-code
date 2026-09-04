import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const npcTargets = new Set();
let kissOk = false;
let assignSeen = false;
for (let run = 0; run < 3; run++) {
  const p = await b.newPage();
  p.on('pageerror', (e) => {
    console.error('PAGE ERROR', e.message);
    process.exit(1);
  });
  await p.goto('http://localhost:4173/?debug', { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'New Game' }).click();
  await p.waitForSelector('.hud');
  await p.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('slowburn_save_v1'));
    raw.state.k = {
      ...raw.state.k,
      met: true,
      hasNumber: true,
      stage: 4,
      datesCompleted: 3,
      enthusiasm: 3,
      flags: { nice: true, confident: true, sexy: true, funny: true },
    };
    localStorage.setItem('slowburn_save_v1', JSON.stringify(raw));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /Continue — Day/ }).click();
  await p.waitForSelector('.hud');
  await p.locator('.debug-row').first().getByRole('button', { name: 'spice 3' }).click();
  await p.waitForTimeout(80);
  for (let i = 0; i < 70; i++) {
    const btns = p.locator('.choice');
    if ((await btns.count()) === 0) break;
    const texts = await btns.allInnerTexts();
    let idx = texts.findIndex((t) => /truth or dare/i.test(t));
    if (idx < 0) idx = texts.findIndex((t) => /^Dare\. Let the deck|Draw again/.test(t));
    if (idx < 0)
      idx = texts.findIndex((t) => /Look at her first|Pick her\.|Watch it happen|Write them/.test(t));
    if (idx < 0) idx = 0;
    if (texts[idx] && /Write them/.test(texts[idx])) assignSeen = true;
    await btns.nth(idx).click();
    await p.waitForTimeout(15);
    if ((await p.locator('.scene').count()) === 0) break;
    const narr = await p.locator('.narration').innerText().catch(() => '');
    const m = narr.match(/the bottle stops on ([^.,]{3,40})/);
    if (m) npcTargets.add(m[1].trim());
    const kl = await p.locator('.kline').innerText().catch(() => '');
    if (/Dare fulfilled|no idea how to count/.test(kl)) kissOk = true;
  }
  await p.close();
}
console.log('NPC TARGETS:', [...npcTargets].join(' | ') || '(none)');
console.log('DEALER-CHOICE CARD OFFERED:', assignSeen);
console.log('KISS DARE SUCCEEDED AS GIRLFRIEND:', kissOk);
await b.close();
