import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const language = process.env.AUDITOR_LANG === "en" ? "en" : "es";
const json = process.argv.includes("--json");

const messages = {
  es: {
    title: "Diagnóstico de LinkedIn Profile Auditor",
    node: "Node.js",
    dependencies: "Dependencias",
    browser: "Chromium de Playwright",
    session: "Sesión de LinkedIn",
    profile: "Perfil extraído",
    ready: "Listo",
    missing: "Falta",
    details: "Detalles",
  },
  en: {
    title: "LinkedIn Profile Auditor checkup",
    node: "Node.js",
    dependencies: "Dependencies",
    browser: "Playwright Chromium",
    session: "LinkedIn session",
    profile: "Extracted profile",
    ready: "Ready",
    missing: "Missing",
    details: "Details",
  },
}[language];

const nodeMajor = Number(process.versions.node.split(".")[0]);
const paths = {
  auth: path.join(rootDir, ".auth", "state.json"),
  profile: path.join(rootDir, "data", "profile", "profile.txt"),
};
const playwright = await import("playwright").catch(() => null);
const browserPath = playwright?.chromium.executablePath();
const report = {
  node: { ok: nodeMajor >= 22, value: process.versions.node },
  dependencies: { ok: Boolean(playwright), value: playwright ? "playwright" : null },
  chromium: { ok: Boolean(browserPath && fs.existsSync(browserPath)), value: browserPath ?? null },
  session: { ok: fs.existsSync(paths.auth), value: paths.auth },
  profile: { ok: fs.existsSync(paths.profile), value: paths.profile },
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\n${messages.title}\n`);
  const labels = {
    node: messages.node,
    dependencies: messages.dependencies,
    chromium: messages.browser,
    session: messages.session,
    profile: messages.profile,
  };
  for (const [key, item] of Object.entries(report)) {
    const label = labels[key];
    const status = item.ok ? messages.ready : messages.missing;
    console.log(`${item.ok ? "OK" : "--"} ${label}: ${status}`);
    if (item.value) console.log(`   ${messages.details}: ${item.value}`);
  }
}

process.exitCode = report.node.ok ? 0 : 1;
