import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const action = process.argv[2];
const language = process.env.AUDITOR_LANG === "en" ? "en" : "es";
const targets = action === "logout"
  ? [path.join(rootDir, ".auth", "state.json")]
  : action === "clean"
    ? [path.join(rootDir, "data", "profile"), path.join(rootDir, "data", "audit")]
    : [];

if (!targets.length) {
  console.error("Usage: node src/cleanup.mjs <logout|clean>");
  process.exit(1);
}

const prompt = language === "en"
  ? "This deletes local private data. Type DELETE to continue: "
  : "Esto borra datos privados locales. Escribe DELETE para continuar: ";
const done = language === "en" ? "Local data removed." : "Datos locales eliminados.";
const cancelled = language === "en" ? "Cancelled." : "Cancelado.";
const readline = createInterface({ input, output });
const answer = await readline.question(prompt);
readline.close();

if (answer !== "DELETE") {
  console.log(cancelled);
  process.exit(0);
}

for (const target of targets) fs.rmSync(target, { recursive: true, force: true });
console.log(done);
