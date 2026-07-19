// Renderiza banner.html a una imagen PNG del tamaño exacto de banner
// de LinkedIn (1584x396 px). Guarda el resultado en data/banner/banner.png.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "banner.html");
const outPath = path.join(__dirname, "..", "..", "data", "banner", "banner.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1584, height: 396 } });
await page.goto(`file://${htmlPath}`);
await page.waitForTimeout(500); // esperar fuentes web
await page.screenshot({ path: outPath });
await browser.close();

console.log(`Banner generado en ${outPath}`);
