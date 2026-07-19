// Abre un navegador visible para que inicies sesión manualmente en LinkedIn.
// Al terminar, guarda la sesión (cookies/localStorage) en .auth/state.json
// para que scrape-profile.mjs no tenga que volver a loguearse.
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
console.log(">> Cuando veas tu feed/perfil cargado, vuelve aquí y presiona ENTER.\n");

/** @type {Promise<void>} */
const waitForEnter = new Promise((resolve) => {
  process.stdin.once("data", () => resolve());
});
await waitForEnter;

await context.storageState({ path: statePath });
console.log(`\nSesión guardada en ${statePath}`);

await browser.close();
