// Extracts the authenticated user's LinkedIn profile to private local artifacts.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { assessSection, declaredCount, parseOpenToWorkConfiguration } from "./extraction-utils.mjs";
import { classifyLinkedInPage, isSameProfile, normalizeProfileUrl } from "./linkedin-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statePath = path.join(__dirname, "..", "..", ".auth", "state.json");
const outputDir = path.join(__dirname, "..", "..", "data", "profile");
const outputPath = path.join(outputDir, "profile.txt");
const metadataPath = path.join(outputDir, "profile.json");
const visualDir = path.join(outputDir, "visual");
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
    empty: "LinkedIn no devolvió suficiente contenido para una sección requerida.",
    progress: "Sección",
    saved: "Perfil guardado de forma privada en",
    failed: "No se pudo completar la extracción.",
    incomplete: "Extracción incompleta",
    visual: "Evidencia visual",
    openToWork: "Open to Work",
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
    empty: "LinkedIn did not return enough content for a required section.",
    progress: "Section",
    saved: "Profile stored privately at",
    failed: "Profile extraction could not be completed.",
    incomplete: "Incomplete extraction",
    visual: "Visual evidence",
    openToWork: "Open to Work",
  },
}[language];

const sections = [
  { id: "main", suffix: "", label: language === "en" ? "Main profile" : "Perfil principal", required: true },
  { id: "experience", suffix: "/details/experience/", label: language === "en" ? "Experience" : "Experiencia", required: true },
  { id: "education", suffix: "/details/education/", label: language === "en" ? "Education" : "Educación", required: true },
  { id: "skills", suffix: "/details/skills/", label: "Skills", required: false, retry: true },
  { id: "certifications", suffix: "/details/certifications/", label: language === "en" ? "Certifications" : "Certificaciones", required: false, retry: true },
  { id: "recommendations", suffix: "/details/recommendations/", label: language === "en" ? "Recommendations" : "Recomendaciones", required: true },
];

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
fs.mkdirSync(visualDir, { recursive: true, mode: 0o700 });
fs.chmodSync(outputDir, 0o700);
fs.chmodSync(visualDir, 0o700);

const temporaryPaths = [];
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: statePath, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log(copy.discovering);
  const ownProfileUrl = await discoverOwnProfile(page);
  if (!ownProfileUrl) throw new Error("PROFILE_DISCOVERY_FAILED");
  if (explicitProfileUrl && !isSameProfile(explicitProfileUrl, ownProfileUrl)) throw new Error("THIRD_PARTY_PROFILE");
  console.log(`${copy.detected}: ${ownProfileUrl}`);

  const results = [];
  let mainText = "";
  for (let index = 0; index < sections.length; index++) {
    const section = sections[index];
    console.log(`${copy.progress} ${index + 1}/${sections.length}: ${section.label}`);
    const result = await extractSection(page, section, ownProfileUrl, mainText);
    if (section.required && result.status === "unavailable") throw new Error("EMPTY_SECTION");
    results.push(result);
    if (section.id === "main") mainText = result.text;
    if (result.status !== "complete") console.warn(`${copy.incomplete}: ${section.label} (${result.warnings.join(", ")})`);
  }

  await page.goto(ownProfileUrl, { waitUntil: "domcontentloaded" });
  await assertAuthenticatedPage(page);
  const visualAssets = await captureVisualEvidence(page);
  console.log(`${copy.visual}: ${Object.values(visualAssets).filter((asset) => asset.status === "captured").length}/3`);

  const openToWork = await extractOpenToWork(page);
  console.log(`${copy.openToWork}: ${openToWork.status}`);

  const extraction = {
    schemaVersion: 1,
    extractedAt: new Date().toISOString(),
    profileUrl: ownProfileUrl,
    sections: Object.fromEntries(results.map(({ id, status, declaredCount: count, extractedCount, warnings, attempts }) => [
      id,
      { status, declaredCount: count, extractedCount, warnings, attempts },
    ])),
    visualAssets,
    openToWork,
  };
  const profileText = buildProfileText(ownProfileUrl, results, openToWork);
  stageText(outputPath, profileText);
  stageText(metadataPath, `${JSON.stringify(extraction, null, 2)}\n`);
  publishTemporaryFiles();
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
  for (const file of temporaryPaths) fs.rmSync(file.temporaryPath, { force: true });
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

async function extractSection(page, section, profileUrl, mainText) {
  const maxAttempts = section.retry ? 3 : 1;
  let result;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(`${profileUrl}${section.suffix || "/"}`, { waitUntil: "domcontentloaded" });
    await assertAuthenticatedPage(page);
    if (!page.url().startsWith(profileUrl)) throw new Error("UNEXPECTED_PAGE");
    result = await readSection(page, section, mainText);
    result.attempts = attempt;
    if (result.status === "complete" || !section.retry) return result;
    await page.waitForTimeout(attempt * 750);
  }
  return result;
}

async function readSection(page, section, mainText) {
  await page.locator("main").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
  let snapshot = await loadSectionContent(page);
  const expectedHeading = section.id === "main"
    ? snapshot.headings[0] || section.label
    : findHeading(snapshot.headings, snapshot.text, section.id);
  const declared = ["skills", "certifications"].includes(section.id)
    ? declaredCount(section.id, mainText || snapshot.text)
    : null;

  if (section.id === "main") {
    return {
      id: section.id,
      text: snapshot.text,
      status: snapshot.text.length >= 80 ? "complete" : "unavailable",
      declaredCount: null,
      extractedCount: 0,
      warnings: snapshot.hasCollapsedContent ? ["collapsed_content_remaining"] : [],
      attempts: 1,
    };
  }

  const assessed = assessSection({
    section: section.id,
    headingText: expectedHeading,
    records: snapshot.records,
    declared,
    hasCollapsedContent: snapshot.hasCollapsedContent,
  });
  return { id: section.id, text: snapshot.text, ...assessed, attempts: 1 };
}

async function loadSectionContent(page) {
  let snapshot = await getSectionSnapshot(page);
  let stableCount = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const expanded = await expandSectionControls(page);
    await scrollToLoad(page, 4);
    const nextSnapshot = await getSectionSnapshot(page);
    const stable = nextSnapshot.records.join("\n") === snapshot.records.join("\n");
    stableCount = stable ? stableCount + 1 : 0;
    snapshot = nextSnapshot;
    if (stableCount >= 2 && !expanded && !snapshot.hasExpandableControls) break;
  }
  return snapshot;
}

async function getSectionSnapshot(page) {
  return page.locator("main").first().evaluate((main) => {
    const text = /** @type {HTMLElement} */ (main).innerText.trim();
    const headings = Array.from(main.querySelectorAll("h1, h2, h3"), (heading) => heading.textContent?.trim() || "");
    const records = Array.from(main.querySelectorAll("li"), (item) => item.textContent?.trim() || "");
    const expandable = Array.from(main.querySelectorAll("button, a"), (element) => element.textContent?.trim() || "")
      .some((label) => /ver más|mostrar más|ver todo|ver todas|show more|see more|show all|see all|…more|…más/i.test(label));
    return {
      text,
      headings,
      records,
      hasCollapsedContent: /…\s*(more|más)/i.test(text),
      hasExpandableControls: expandable,
    };
  }).catch(() => ({ text: "", headings: [], records: [], hasCollapsedContent: false, hasExpandableControls: false }));
}

function findHeading(headings, text, section) {
  const patterns = {
    experience: /^(experience|experiencia)$/i,
    education: /^(education|educación)$/i,
    skills: /^(skills|aptitudes)$/i,
    certifications: /^(licenses?\s*&\s*certifications|licencias?\s+y\s+certificaciones?)$/i,
    recommendations: /^(recommendations|recomendaciones)$/i,
  };
  if (headings.find((heading) => patterns[section].test(heading))) return sectionLabel(section);
  return text.split(/\r?\n/).some((line) => patterns[section].test(line.trim())) ? sectionLabel(section) : "";
}

function sectionLabel(section) {
  return {
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Licenses & Certifications",
    recommendations: "Recommendations",
  }[section];
}

async function scrollToLoad(page, maxScrolls) {
  for (let index = 0; index < maxScrolls; index++) {
    await page.locator("main").first().evaluate((main) => {
      const candidates = [main, ...main.querySelectorAll("div")]
        .filter((element) => element.scrollHeight > element.clientHeight + 50 && element.clientHeight > 100)
        .sort((first, second) => second.scrollHeight - first.scrollHeight);
      const target = candidates[0] || main;
      target.scrollTop = Math.min(target.scrollTop + Math.max(target.clientHeight * 0.8, 600), target.scrollHeight);
      window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
    }).catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function expandSectionControls(page) {
  const controls = page.locator("main").first().locator("button, a").filter({
    hasText: /ver más|mostrar más|ver todo|ver todas|show more|see more|show all|see all|…more|…más/i,
  });
  const count = await controls.count().catch(() => 0);
  let clicked = false;
  for (let index = count - 1; index >= 0; index--) {
    const control = controls.nth(index);
    if (!(await control.isVisible().catch(() => false))) continue;
    if (await control.click({ timeout: 1000 }).then(() => true).catch(() => false)) clicked = true;
  }
  return clicked;
}

async function captureVisualEvidence(page) {
  const header = page.locator("main section").first();
  const headerAsset = await captureLocatorScreenshot(header, "profile-header.png", 650);
  const photoAsset = await markAndCapture(page, header, "profile-photo.png", "profile-photo");
  const bannerAsset = await markAndCapture(page, header, "profile-banner.png", "profile-banner");
  return { profileHeader: headerAsset, profilePhoto: photoAsset, banner: bannerAsset };
}

async function markAndCapture(page, header, filename, marker) {
  const found = await header.evaluate((element, { markerName, selector }) => {
    const candidates = Array.from(element.querySelectorAll(selector));
    const target = candidates.find((candidate) => {
      if (markerName === "profile-photo") {
        return candidate instanceof HTMLImageElement && candidate.naturalWidth >= 80 && candidate.naturalHeight >= 80;
      }
      return getComputedStyle(candidate).backgroundImage !== "none";
    });
    if (!target) return false;
    target.setAttribute("data-profile-auditor-asset", markerName);
    return true;
  }, { markerName: marker, selector: marker === "profile-photo" ? "img" : "*" }).catch(() => false);
  if (!found) return { status: "notPresent" };
  const asset = await captureLocatorScreenshot(page.locator(`[data-profile-auditor-asset="${marker}"]`), filename, 450);
  await page.locator(`[data-profile-auditor-asset="${marker}"]`).evaluateAll((elements) => {
    for (const element of elements) element.removeAttribute("data-profile-auditor-asset");
  }).catch(() => {});
  return asset;
}

async function captureLocatorScreenshot(locator, filename, maxHeight) {
  if (await locator.count().catch(() => 0) !== 1 || !(await locator.isVisible().catch(() => false))) {
    return { status: "notPresent" };
  }
  const box = await locator.boundingBox().catch(() => null);
  if (!box || box.height > maxHeight || box.width < 80) return { status: "unavailable", reason: "unsafe_or_unbounded_locator" };
  const finalPath = path.join(visualDir, filename);
  const temporaryPath = path.join(visualDir, `.${filename}.${process.pid}.tmp.png`);
  try {
    await locator.screenshot({ path: temporaryPath, animations: "disabled", timeout: 5000 });
    fs.chmodSync(temporaryPath, 0o600);
    temporaryPaths.push({ temporaryPath, finalPath });
    return { status: "captured", path: path.relative(outputDir, finalPath) };
  } catch {
    fs.rmSync(temporaryPath, { force: true });
    return { status: "unavailable", reason: "screenshot_failed" };
  }
}

async function extractOpenToWork(page) {
  const result = { status: "unavailable", visibility: "unknown", jobTitles: [], locations: [], workplaceTypes: [], employmentTypes: [] };
  const directControl = page.getByRole("button", { name: /open to work|disponible para trabajar/i }).first();
  const directLink = page.locator("main a").filter({ hasText: /open to work|disponible para trabajar/i }).first();
  const control = await directControl.isVisible().catch(() => false) ? directControl : directLink;

  if (await control.isVisible().catch(() => false)) {
    await control.click({ timeout: 2000 }).catch(() => {});
  }

  await page.waitForTimeout(750);
  await assertAuthenticatedPage(page);
  const source = page.locator('[role="dialog"]').last();
  const text = await source.innerText().catch(async () => page.locator("main").first().innerText().catch(() => ""));
  const parsed = parseOpenToWorkConfiguration(text);
  if (parsed.status !== "unavailable") return parsed;

  await page.goto("https://www.linkedin.com/jobs/", { waitUntil: "domcontentloaded" });
  await assertAuthenticatedPage(page);
  const preferences = page.getByRole("link", { name: /preferences|preferencias/i }).first();
  if (!(await preferences.isVisible().catch(() => false))) return result;
  await preferences.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(750);
  const openToWork = page.getByText(/open to work|disponible para trabajar/i).first();
  if (!(await openToWork.isVisible().catch(() => false))) return result;
  await openToWork.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(750);
  await assertAuthenticatedPage(page);
  const preferencesText = await page.locator('[role="dialog"]').last().innerText()
    .catch(async () => page.locator("main").first().innerText().catch(() => ""));
  return parseOpenToWorkConfiguration(preferencesText);
}

async function assertAuthenticatedPage(page) {
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const classification = classifyLinkedInPage(page.url(), bodyText.slice(0, 3000));
  if (classification === "authentication") throw new Error("AUTHENTICATION_REQUIRED");
  if (classification !== "ok") throw new Error("UNEXPECTED_PAGE");
}

function buildProfileText(profileUrl, results, openToWork) {
  const metadata = [
    "===== EXTRACTION METADATA =====",
    `Profile: ${profileUrl}`,
    `Extracted: ${new Date().toISOString()}`,
    ...results.map((result) => `${result.id}: ${result.status} (${result.extractedCount}/${result.declaredCount ?? "unknown"})`),
  ].join("\n");
  const openToWorkSummary = [
    "===== OPEN TO WORK =====",
    `Status: ${openToWork.status}`,
    `Visibility: ${openToWork.visibility}`,
    `Preferences captured: ${openToWork.jobTitles.length + openToWork.locations.length + openToWork.workplaceTypes.length + openToWork.employmentTypes.length}`,
  ].join("\n");
  return `${metadata}\n${results.map((result) => `\n===== ${result.id.toUpperCase()} =====\n\n${result.text}`).join("\n")}\n\n${openToWorkSummary}\n`;
}

function stageText(finalPath, content) {
  const temporaryPath = path.join(path.dirname(finalPath), `.${path.basename(finalPath)}.${process.pid}.tmp`);
  fs.writeFileSync(temporaryPath, content, { mode: 0o600 });
  fs.chmodSync(temporaryPath, 0o600);
  temporaryPaths.push({ temporaryPath, finalPath });
}

function publishTemporaryFiles() {
  for (const file of temporaryPaths) {
    fs.renameSync(file.temporaryPath, file.finalPath);
    fs.chmodSync(file.finalPath, 0o600);
  }
  temporaryPaths.length = 0;
}
