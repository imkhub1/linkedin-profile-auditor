import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";

const language = process.env.AUDITOR_LANG === "en" ? "en" : "es";
const copy = {
  es: {
    title: "LinkedIn Profile Auditor",
    intro: "Este asistente prepara una auditoría de tu propio perfil. Nada se envía a una IA desde este programa.",
    scope: "Usa LinkedIn solo de forma ocasional y bajo tu criterio. La sesión local permite acceso a tu cuenta.",
    menu: "Elige una opción",
    setup: "Preparar este equipo",
    login: "Iniciar sesión en LinkedIn",
    scrape: "Extraer mi perfil",
    doctor: "Ver diagnóstico",
    quit: "Salir",
    browser: "Chromium no está instalado. ¿Descargarlo ahora? (s/N): ",
    dependencies: "Faltan dependencias. ¿Instalarlas ahora? (s/N): ",
    next: "Cuando termine la extracción, abre este proyecto con un agente compatible y pide una auditoría. El agente solicitará tu consentimiento antes de leer el perfil.",
    cancelled: "Cancelado.",
  },
  en: {
    title: "LinkedIn Profile Auditor",
    intro: "This assistant prepares an audit of your own profile. This program never sends data to an AI.",
    scope: "Use LinkedIn automation occasionally and at your own discretion. The local session can access your account.",
    menu: "Choose an option",
    setup: "Set up this computer",
    login: "Sign in to LinkedIn",
    scrape: "Extract my profile",
    doctor: "Show checkup",
    quit: "Quit",
    browser: "Chromium is not installed. Download it now? (y/N): ",
    dependencies: "Dependencies are missing. Install them now? (y/N): ",
    next: "After extraction, open this project with a compatible agent and ask for an audit. The agent will request consent before reading the profile.",
    cancelled: "Cancelled.",
  },
}[language];

const readline = createInterface({ input, output });
console.log(`\n${copy.title}\n`);
console.log(copy.intro);
console.log(copy.scope);

try {
  for (;;) {
    console.log(`\n${copy.menu}`);
    console.log(`1. ${copy.setup}`);
    console.log(`2. ${copy.login}`);
    console.log(`3. ${copy.scrape}`);
    console.log(`4. ${copy.doctor}`);
    console.log(`5. ${copy.quit}`);
    const choice = await readline.question("> ");
    if (choice === "1") await setup();
    else if (choice === "2") await run("src/scraping/login.mjs");
    else if (choice === "3") {
      await run("src/scraping/scrape-profile.mjs");
      console.log(`\n${copy.next}`);
    } else if (choice === "4") await run("src/doctor.mjs");
    else if (choice === "5") break;
  }
} finally {
  readline.close();
}

async function setup() {
  const report = await run("src/doctor.mjs", ["--json"], true);
  if (!report) return;
  const status = JSON.parse(report);
  if (!status.dependencies.ok) {
    const answer = await readline.question(copy.dependencies);
    if (!approved(answer)) return console.log(copy.cancelled);
    await runNpm(["install"]);
  }
  const refreshed = await run("src/doctor.mjs", ["--json"], true);
  if (!refreshed || JSON.parse(refreshed).chromium.ok) return;
  const answer = await readline.question(copy.browser);
  if (!approved(answer)) return console.log(copy.cancelled);
  await runNpm(["exec", "playwright", "install", "chromium"]);
}

function approved(answer) {
  return /^(s|si|sí|y|yes)$/i.test(answer.trim());
}

function run(script, args = [], capture = false) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, AUDITOR_LANG: language },
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    let result = "";
    child.stdout?.on("data", (chunk) => { result += chunk; });
    child.on("close", (code) => resolve(code === 0 ? result : null));
  });
}

function runNpm(args) {
  return new Promise((resolve) => {
    const child = spawn("npm", args, { env: process.env, stdio: "inherit" });
    child.on("close", resolve);
  });
}
