// Browser smoke test for Slow Burn: drives the built play/ bundle end-to-end.
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';

function fail(msg) {
  console.error('SMOKE FAIL:', msg);
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (e) => fail('page error: ' + e.message));

await page.goto(BASE, { waitUntil: 'networkidle' });

// Title screen → New Game
await page.getByRole('button', { name: 'New Game' }).click();
await page.waitForSelector('.hud');
const money0 = parseInt((await page.locator('.hud-money').innerText()).replace('$', ''), 10);

// Work a shift — money should rise, block should advance
await page.getByRole('button', { name: /Work a shift/ }).click();
await page.waitForTimeout(100);
const money1 = parseInt((await page.locator('.hud-money').innerText()).replace('$', ''), 10);
if (money1 <= money0) fail(`work did not pay: ${money0} -> ${money1}`);

// Train charm
await page.getByRole('button', { name: /Bookstore/ }).click();
await page.waitForTimeout(100);

// Hunt the café encounter: mornings/afternoons at Driftwood until she shows.
let met = false;
for (let day = 0; day < 14 && !met; day++) {
  // sleep to morning
  await page.getByRole('button', { name: /^Sleep/ }).click();
  await page.waitForTimeout(80);
  for (let tries = 0; tries < 2 && !met; tries++) {
    const cafe = page.getByRole('button', { name: /Driftwood Café/ });
    if ((await cafe.count()) === 0) break;
    await cafe.first().click();
    await page.waitForTimeout(120);
    if ((await page.locator('.scene').count()) > 0) met = true;
  }
}
if (!met) fail('never encountered Krystalle at the café in 14 days');

// Scene UI sanity: portrait, narration, choices render
if ((await page.locator('.portrait').count()) === 0) fail('portrait missing in scene');
if ((await page.locator('.narration').count()) === 0) fail('narration missing');

// Play the scene to completion by always taking the first option.
for (let i = 0; i < 60; i++) {
  const btns = page.locator('.choice');
  if ((await btns.count()) === 0) break;
  await btns.first().click();
  await page.waitForTimeout(60);
  if ((await page.locator('.scene').count()) === 0) break;
}
if ((await page.locator('.scene').count()) > 0) fail('scene did not terminate');

// Save/reload: Continue button should resume the same run
const dayText = await page.locator('.hud-day').innerText();
await page.reload({ waitUntil: 'networkidle' });
const cont = page.getByRole('button', { name: /Continue — Day/ });
if ((await cont.count()) === 0) fail('no Continue button after reload — save missing');
await cont.click();
await page.waitForSelector('.hud');
const dayText2 = await page.locator('.hud-day').innerText();
if (dayText2.split('(')[0].trim() !== dayText.split('(')[0].trim())
  fail(`save mismatch: "${dayText}" vs "${dayText2}"`);

console.log('SMOKE PASS —', dayText2.trim(), '| money now', await page.locator('.hud-money').innerText());
await browser.close();
