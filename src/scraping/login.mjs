// Abre un navegador visible para que inicies sesión manualmente en LinkedIn.
// Detecta la sesión autenticada y la guarda en .auth/state.json.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "..", "..", ".auth");
const statePath = path.join(authDir, "state.json");
const temporaryStatePath = `${statePath}.tmp`;
const language = process.env.AUDITOR_LANG === "en" ? "en" : "es";
const messages = {
  es: {
    browser: "\n>> Inicia sesión manualmente en la ventana del navegador.",
    privacy: ">> Tus credenciales no se leen ni se guardan. Puedes cerrar la ventana para cancelar.",
    waiting: ">> Esperaremos hasta 10 minutos para que completes el login.\n",
    closed: "Login cancelado: se cerró la ventana del navegador.",
    timeout: "El login superó los 10 minutos. Vuelve a ejecutar npm run login cuando estés listo.",
    saved: "Sesión guardada de forma privada en",
    failed: "No se pudo guardar la sesión de LinkedIn.",
  },
  en: {
    browser: "\n>> Sign in manually in the browser window.",
    privacy: ">> Your credentials are never read or stored. Close the window to cancel.",
    waiting: ">> We will wait up to 10 minutes for you to finish signing in.\n",
    closed: "Login cancelled: the browser window was closed.",
    timeout: "Login exceeded 10 minutes. Run npm run login again when you are ready.",
    saved: "Session stored privately at",
    failed: "The LinkedIn session could not be saved.",
  },
}[language];

fs.mkdirSync(authDir, { recursive: true, mode: 0o700 });
fs.chmodSync(authDir, 0o700);

let browser;
let browserDisconnected = false;
try {
  browser = await chromium.launch({ headless: false });
  browser.on("disconnected", () => { browserDisconnected = true; });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });

  console.log(messages.browser);
  console.log(messages.privacy);
  console.log(messages.waiting);

  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    if (page.isClosed()) throw new Error("BROWSER_CLOSED");
    const cookies = await context.cookies();
    if (cookies.some((cookie) => cookie.name === "li_at" && cookie.value)) {
      await context.storageState({ path: temporaryStatePath });
      fs.chmodSync(temporaryStatePath, 0o600);
      fs.renameSync(temporaryStatePath, statePath);
      console.log(`\n${messages.saved} ${statePath}`);
      break;
    }
    await page.waitForTimeout(1000);
  }

  if (!fs.existsSync(statePath)) throw new Error("LOGIN_TIMEOUT");
} catch (error) {
  const code = error instanceof Error ? error.message : "";
  if (code === "BROWSER_CLOSED" || browserDisconnected) console.error(messages.closed);
  else if (code === "LOGIN_TIMEOUT") console.error(messages.timeout);
  else {
    console.error(messages.failed);
    if (process.env.DEBUG && error instanceof Error) console.error(error.stack);
  }
  process.exitCode = 1;
} finally {
  if (fs.existsSync(temporaryStatePath)) fs.rmSync(temporaryStatePath);
  if (browser?.isConnected()) await browser.close();
}
