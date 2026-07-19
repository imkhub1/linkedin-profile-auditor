// Extrae el texto completo visible de tu perfil de LinkedIn navegando a las
// páginas de detalle de cada sección (más confiables que el scroll infinito
// del perfil principal). Guarda todo en data/profile/profile.txt.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(__dirname, "..", "..", ".auth", "state.json");
const outputDir = path.join(__dirname, "..", "..", "data", "profile");
const outputPath = path.join(outputDir, "profile.txt");

if (!fs.existsSync(statePath)) {
  console.error("No se encontró sesión guardada. Ejecuta primero: npm run login");
  process.exit(1);
}

let profileUrl = process.argv[2];
if (!profileUrl) {
  console.error("Uso: npm run scrape -- <url-de-tu-perfil-linkedin>");
  process.exit(1);
}
profileUrl = profileUrl.replace(/\/$/, "");

fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ storageState: statePath, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

async function scrollToLoad(maxScrolls = 40) {
  // LinkedIn a veces usa <main> (u otro contenedor interno) con su propio
  // scroll en vez del scroll de window/body. Detectamos el contenedor con
  // mayor scrollHeight real y hacemos scroll directamente sobre él.
  let lastHeight = 0;
  let stableCount = 0;
  for (let i = 0; i < maxScrolls; i++) {
    const { newHeight } = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("main, body, div"))
        .filter((el) => el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 100)
        .sort((a, b) => b.scrollHeight - a.scrollHeight);
      const target = candidates[0] || document.scrollingElement || document.body;
      target.scrollTop = target.scrollHeight;
      window.scrollTo(0, document.body.scrollHeight);
      return { newHeight: target.scrollHeight };
    });
    await page.waitForTimeout(700);
    if (newHeight === lastHeight) {
      stableCount++;
      if (stableCount >= 3) break;
    } else {
      stableCount = 0;
    }
    lastHeight = newHeight;
  }
}

async function expandShowMore() {
  const buttons = page.getByRole("button", { name: /ver más|show more|…more/i });
  const count = await buttons.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    try {
      await buttons.nth(i).click({ timeout: 800 });
      await page.waitForTimeout(150);
    } catch {
      // ignorar
    }
  }
}

async function extractMainText(url, label) {
  console.log(`Navegando a ${label}: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await scrollToLoad();
  await expandShowMore();
  const text = await page.evaluate(() => {
    const candidates = /** @type {HTMLElement[]} */ (
      Array.from(document.querySelectorAll("main, body")).filter(
        (el) => el.scrollHeight > 0
      )
    );
    const main = candidates[0] || document.body;
    return main.innerText;
  });
  return `\n\n===== ${label.toUpperCase()} =====\n\n${text}`;
}

let fullText = "";
fullText += await extractMainText(profileUrl + "/", "Perfil principal (intro, about, featured, activity)");
fullText += await extractMainText(profileUrl + "/details/experience/", "Experiencia");
fullText += await extractMainText(profileUrl + "/details/education/", "Educación");
fullText += await extractMainText(profileUrl + "/details/skills/", "Skills");
fullText += await extractMainText(profileUrl + "/details/certifications/", "Certificaciones");
fullText += await extractMainText(profileUrl + "/details/recommendations/", "Recomendaciones");

fs.writeFileSync(outputPath, fullText, "utf-8");
console.log(`\nTexto del perfil guardado en ${outputPath}`);

await browser.close();
