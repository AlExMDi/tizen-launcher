// Genera tizen/icon.png (512×423, el tamaño que pide Samsung para iconos de apps de TV).
import { chromium } from 'playwright';

const html = `<html><body style="margin:0">
<div style="width:512px;height:423px;background:linear-gradient(160deg,#2b2f3a,#0b0c10);
  display:flex;flex-direction:column;justify-content:center;padding-left:96px;box-sizing:border-box;
  font-family:-apple-system,Helvetica,Arial,sans-serif;color:#fff">
  <div style="width:120px;height:22px;border-radius:11px;background:rgba(255,255,255,.4)"></div>
  <div style="width:260px;height:56px;border-radius:28px;background:#fff;margin:26px 0"></div>
  <div style="width:170px;height:22px;border-radius:11px;background:rgba(255,255,255,.4)"></div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 423 } });
await page.setContent(html);
await page.screenshot({ path: 'tizen/icon.png' });
await browser.close();
console.log('✓ tizen/icon.png');
