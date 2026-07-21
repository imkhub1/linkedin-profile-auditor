// Extracts the authenticated user's LinkedIn profile to a local text file.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { classifyLinkedInPage, isSameProfile, normalizeProfileUrl } from "./linkedin-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(__dirname, "..", "..", ".auth", "state.json");
const outputDir = path.join(__dirname, "..", "..", "data", "profile");
const outputPath = path.join(outputDir, "profile.txt");
const temporaryOutputPath = `${outputPath}.tmp`;
const language = process.env.AUDITOR_LANG === "en" ? "en" : "es";
const copy = {
  es: {
    noSession: "No hay una sesión guardada. Ejecuta primero: npm run login",
    invalidUrl: "La URL indicada no es un perfil válido de LinkedIn.",
    discovering: "Detectando tu perfil desde la sesión guardada...",
    discoveryFailed: "No se pudo identificar tu perfil. La sesión puede haber expirado; ejecuta npm run login.",
    wrongProfile: "Por seguridad, este proyecto solo puede extraer el perfil de la cuenta autenticada.",
    detected: "Perfil propio detectado",
    expired: "La sesión de LinkedIn expiró o requiere verificación. Ejecuta npm run login.",
    unexpected: "LinkedIn abrió una página inesperada y la extracción se detuvo.",
    empty: "LinkedIn no devolvió suficiente contenido para esta sección.",
    progress: "Sección",
    saved: "Perfil guardado de forma privada en",
    failed: "No se pudo completar la extracción.",
    remaining: "Aviso: puede quedar contenido contraído en esta sección.",
  },
  en: {
    noSession: "No saved session was found. Run this first: npm run login",
    invalidUrl: "The provided URL is not a valid LinkedIn profile.",
    discovering: "Detecting your profile from the saved session...",
    discoveryFailed: "Your profile could not be identified. The session may have expired; run npm run login.",
    wrongProfile: "For safety, this project can only extract the authenticated account's profile.",
    detected: "Own profile detected",
    expired: "The LinkedIn session expired or needs verification. Run npm run login.",
    unexpected: "LinkedIn opened an unexpected page, so extraction stopped.",
    empty: "LinkedIn did not return enough content for this section.",
    progress: "Section",
    saved: "Profile stored privately at",
    failed: "Profile extraction could not be completed.",
    remaining: "Warning: some content may still be collapsed in this section.",
  },
}[language];

if (!fs.existsSync(statePath)) {
  console.error(copy.noSession);
  process.exit(1);
}

const explicitArgument = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const explicitProfileUrl = explicitArgument ? normalizeProfileUrl(explicitArgument) : null;
if (explicitArgument && !explicitProfileUrl) {
  console.error(copy.invalidUrl);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const sections = [
  ["", language === "en" ? "Main profile" : "Perfil principal"],
  ["/details/experience/", language === "en" ? "Experience" : "Experiencia"],
  ["/details/education/", language === "en" ? "Education" : "Educación"],
  ["/details/skills/", "Skills"],
  ["/details/certifications/", language === "en" ? "Certifications" : "Certificaciones"],
  ["/details/recommendations/", language === "en" ? "Recommendations" : "Recomendaciones"],
];

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: statePath,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log(copy.discovering);
  const ownProfileUrl = await discoverOwnProfile(page);
  if (!ownProfileUrl) throw new Error("PROFILE_DISCOVERY_FAILED");
  if (explicitProfileUrl && !isSameProfile(explicitProfileUrl, ownProfileUrl)) {
    throw new Error("THIRD_PARTY_PROFILE");
  }
  console.log(`${copy.detected}: ${ownProfileUrl}`);

  const extractedSections = [];
  for (let index = 0; index < sections.length; index++) {
    const [suffix, label] = sections[index];
    console.log(`${copy.progress} ${index + 1}/${sections.length}: ${label}`);
    extractedSections.push(await extractMainText(page, `${ownProfileUrl}${suffix || "/"}`, label, ownProfileUrl));
  }

  const metadata = [
    "===== EXTRACTION METADATA =====",
    `Profile: ${ownProfileUrl}`,
    `Extracted: ${new Date().toISOString()}`,
    `Sections: ${sections.length}/${sections.length}`,
  ].join("\n");
  fs.writeFileSync(temporaryOutputPath, `${metadata}\n${extractedSections.join("\n")}`, { mode: 0o600 });
  fs.chmodSync(temporaryOutputPath, 0o600);
  fs.renameSync(temporaryOutputPath, outputPath);
  console.log(`\n${copy.saved} ${outputPath}`);
} catch (error) {
  const code = error instanceof Error ? error.message : "";
  if (code === "PROFILE_DISCOVERY_FAILED") console.error(copy.discoveryFailed);
  else if (code === "THIRD_PARTY_PROFILE") console.error(copy.wrongProfile);
  else if (code === "AUTHENTICATION_REQUIRED") console.error(copy.expired);
  else if (code === "UNEXPECTED_PAGE") console.error(copy.unexpected);
  else if (code === "EMPTY_SECTION") console.error(copy.empty);
  else {
    console.error(copy.failed);
    if (process.env.DEBUG && error instanceof Error) console.error(error.stack);
  }
  process.exitCode = 1;
} finally {
  if (fs.existsSync(temporaryOutputPath)) fs.rmSync(temporaryOutputPath);
  if (browser?.isConnected()) await browser.close();
}

async function discoverOwnProfile(page) {
  await page.goto("https://www.linkedin.com/me/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await assertAuthenticatedPage(page);

  const redirectedProfile = normalizeProfileUrl(page.url());
  if (redirectedProfile) return redirectedProfile;

  const menuOpened = await page.locator("button").evaluateAll((buttons) => {
    const menuButton = buttons.find((button) => /^(Me|Yo)$/i.test(button.innerText.trim()));
    if (!menuButton) return false;
    menuButton.click();
    return true;
  });
  if (!menuOpened) return null;
  await page.waitForTimeout(500);

  const candidates = await page.locator('a[href*="/in/"]').evaluateAll((links) =>
    links.map((link) => /** @type {HTMLAnchorElement} */ (link).href)
  );
  const profiles = [...new Set(candidates.map(normalizeProfileUrl).filter(Boolean))];
  return profiles.length === 1 ? profiles[0] : null;
}

async function assertAuthenticatedPage(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const classification = classifyLinkedInPage(page.url(), bodyText.slice(0, 3000));
  if (classification === "authentication") throw new Error("AUTHENTICATION_REQUIRED");
  if (classification !== "ok") throw new Error("UNEXPECTED_PAGE");
}

async function scrollToLoad(page, maxScrolls = 30) {
  let lastHeight = 0;
  let stableCount = 0;
  for (let index = 0; index < maxScrolls; index++) {
    const newHeight = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("main, body, div"))
        .filter((element) => element.scrollHeight > element.clientHeight + 50 && element.clientHeight > 100)
        .sort((first, second) => second.scrollHeight - first.scrollHeight);
      const target = candidates[0] || document.scrollingElement || document.body;
      target.scrollTop = Math.min(target.scrollTop + Math.max(target.clientHeight * 0.8, 600), target.scrollHeight);
      window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
      return target.scrollHeight;
    });
    await page.waitForTimeout(500);
    stableCount = newHeight === lastHeight ? stableCount + 1 : 0;
    if (stableCount >= 3) break;
    lastHeight = newHeight;
  }
}

async function expandShowMore(page) {
  const buttons = page.getByRole("button", { name: /ver más|mostrar más|show more|see more|…more|…más/i });
  const count = await buttons.count().catch(() => 0);
  for (let index = count - 1; index >= 0; index--) {
    await buttons.nth(index).click({ timeout: 1000 }).catch(() => {});
  }
}

async function extractMainText(page, url, label, profileUrl) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await assertAuthenticatedPage(page);
  if (!page.url().startsWith(profileUrl)) throw new Error("UNEXPECTED_PAGE");
  await page.locator("main").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  await scrollToLoad(page);
  await expandShowMore(page);

  const text = (await page.locator("main").first().innerText().catch(() => "")).trim();
  if (text.length < 80) throw new Error("EMPTY_SECTION");
  if (/…\s*(more|más)/i.test(text)) console.warn(`${copy.remaining} (${label})`);
  return `\n===== ${label.toUpperCase()} =====\n\n${text}`;
}
