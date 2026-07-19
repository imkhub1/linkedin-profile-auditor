// Procesa un logo con fondo blanco + trazo oscuro para que se vea bien
// sobre un banner oscuro:
// - Convierte el blanco de fondo en transparente.
// - Cambia el trazo oscuro a un color crema/claro (mismo acento del banner).
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "..", "..", "data", "banner", "company-logo.png");
const outputPath = path.join(__dirname, "..", "..", "data", "banner", "company-logo-processed.png");

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`file://${inputPath}`);

const dataUrl = await page.evaluate(async () => {
  const img = document.querySelector("img");
  if (!img) throw new Error("No se encontró <img> en la página");
  /** @type {Promise<void>} */
  const waitForLoad = new Promise((resolve) => {
    if (img.complete) resolve();
    else img.onload = () => resolve();
  });
  await waitForLoad;

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // Blanco/casi blanco -> transparente
    if (luminance > 240) {
      d[i + 3] = 0;
    } else {
      // Trazo negro -> color crema (#c9a876) para que combine con el acento del banner
      d[i] = 245;
      d[i + 1] = 240;
      d[i + 2] = 233;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
});

const fs = await import("node:fs");
const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
fs.writeFileSync(outputPath, Buffer.from(base64, "base64"));

console.log(`Logo procesado guardado en ${outputPath}`);

await browser.close();
