// Abre un navegador visible para que inicies sesión manualmente en LinkedIn.
// Detecta la sesión autenticada y la guarda en .auth/state.json.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "..", "..", ".auth");
const statePath = path.join(authDir, "state.json");

fs.mkdirSync(authDir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto("https://www.linkedin.com/login");

console.log("\n>> Inicia sesión manualmente en la ventana del navegador.");
console.log(">> La sesión se guardará automáticamente al completar el login.\n");

for (;;) {
  const cookies = await context.cookies();
  if (cookies.some((cookie) => cookie.name === "li_at" && cookie.value)) break;
  await page.waitForTimeout(1000);
}

await context.storageState({ path: statePath });
console.log(`\nSesión guardada en ${statePath}`);

await browser.close();
