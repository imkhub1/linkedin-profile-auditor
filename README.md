# LinkedIn Audit

Herramientas de automatización con [Playwright](https://playwright.dev) para
extraer **tu propio** perfil de LinkedIn y auditarlo: headline, about,
experiencia, skills, certificaciones y recomendaciones. Incluye además un
generador de banner de perfil (HTML/CSS -> PNG) personalizable.

No hay backend ni servicio en la nube: todo corre localmente, con tu propia
sesión de LinkedIn, y los datos extraídos se quedan en tu máquina.

## ⚠️ Antes de usarlo

- Este proyecto usa **tu propia cuenta y sesión** de LinkedIn (login manual
  en un navegador real, sin credenciales hardcodeadas). No hace scraping de
  perfiles de terceros ni bulk scraping.
- Los [Términos de Servicio de LinkedIn](https://www.linkedin.com/legal/user-agreement)
  restringen el uso de herramientas automatizadas en la plataforma. Usar este
  proyecto es bajo tu propio criterio y riesgo — úsalo de forma razonable
  (para auditar tu propio perfil ocasionalmente, no para automatizar acciones
  masivas o repetitivas).
- Ninguna credencial se guarda en el código: la sesión vive en `.auth/`,
  ese directorio está en `.gitignore` y **nunca debe subirse a un repositorio**
  (contiene cookies de tu sesión activa).
- LinkedIn cambia su interfaz con frecuencia; los selectores/lógica de scroll
  pueden requerir ajustes con el tiempo. Si algo deja de funcionar, revisa
  primero `data/profile/profile.txt` para ver qué se extrajo antes de asumir
  que es un bug de credenciales.

## Qué hace

1. **Login** (`npm run login`): abre un navegador para que inicies sesión
   manualmente. Guarda la sesión localmente para no repetir el login cada vez.
2. **Scrape** (`npm run scrape`): navega tu propio perfil (intro, about,
   featured, actividad, experiencia, educación, skills, certificaciones,
   recomendaciones) y guarda todo el texto visible en un archivo de texto.
3. **Auditoría**: usa [`docs/audit-checklist.md`](docs/audit-checklist.md)
   para evaluar el perfil extraído manualmente o con ayuda de un asistente
   de IA (hay un prompt sugerido al final de ese archivo).
4. **Banner** (`npm run banner:render`): genera una imagen de portada de
   LinkedIn (1584×396px) a partir de una plantilla HTML/CSS editable.

## Requisitos

- Node.js 18+
- Una cuenta de LinkedIn (la tuya)

## Instalación

```bash
npm install
npx playwright install chromium
```

## Estructura del proyecto

```
linkedin/
├── README.md
├── LICENSE
├── docs/
│   └── audit-checklist.md     # Guía/checklist para auditar un perfil
├── jsconfig.json              # Habilita chequeo de tipos (TypeScript checkJs) sobre los .mjs
├── package.json
│
├── src/                        # Código fuente (versionado)
│   ├── scraping/
│   │   ├── login.mjs           # Login manual; guarda sesión en .auth/state.json
│   │   └── scrape-profile.mjs  # Extrae el perfil completo a data/profile/profile.txt
│   └── banner/
│       ├── banner.html         # Plantilla del banner (edítala con tus datos)
│       ├── render-banner.mjs   # Renderiza banner.html -> data/banner/banner.png
│       └── process-logo.mjs    # Quita fondo blanco / recolorea un logo para el banner
│
├── data/                       # Generado localmente (gitignored, no se versiona)
│   ├── profile/profile.txt     # Tu perfil extraído
│   └── banner/                 # Logo(s) e imagen final del banner
│
└── .auth/                      # Tu sesión de LinkedIn (gitignored, sensible)
```

**Regla simple:** `src/` es código reutilizable por cualquiera. `data/` y
`.auth/` son tuyos, locales, y nunca se suben al repositorio.

## Uso

### 1. Login (una vez, o cuando expire la sesión)

```bash
npm run login
```

Se abre un navegador. Inicia sesión manualmente, vuelve a la terminal y
presiona ENTER. La sesión queda guardada en `.auth/state.json`.

### 2. Extraer tu perfil

```bash
npm run scrape -- https://www.linkedin.com/in/tu-usuario/
```

Guarda el texto completo en `data/profile/profile.txt`.

> **Nota técnica:** LinkedIn hace scroll dentro de un contenedor interno
> (`<main>` con `overflow` propio), no en `window`/`body`. El scraper detecta
> el contenedor correcto y hace scroll directamente sobre él — un scroll de
> ventana normal no carga el contenido lazy de LinkedIn.

### 3. Auditar el perfil

Abre `data/profile/profile.txt` junto a
[`docs/audit-checklist.md`](docs/audit-checklist.md) y evalúa cada sección,
o pégale ambos archivos a un asistente de IA usando el prompt sugerido al
final del checklist.

### 4. Generar tu banner de perfil (opcional)

1. Edita `src/banner/banner.html`: cambia nombre, rol, tagline y skills por
   los tuyos. Los colores están centralizados en `:root` al inicio del
   `<style>` para recolorear fácilmente.
2. (Opcional) si quieres agregar el logo de tu empresa, colócalo en
   `data/banner/company-logo.png` y procésalo si tiene fondo blanco:
   ```bash
   npm run banner:logo
   ```
   Luego descomenta la línea `<img class="company-logo" ...>` en `banner.html`.
3. Genera la imagen final:
   ```bash
   npm run banner:render
   ```
   El resultado queda en `data/banner/banner.png` (1584×396px, tamaño oficial
   de LinkedIn). Súbelo desde tu perfil -> ícono de editar sobre la portada.

La tipografía (Inter) se sirve localmente vía `@fontsource/inter`, sin
depender de internet en el momento de renderizar.

**Importante sobre el layout:** la foto de perfil circular de LinkedIn se
superpone sobre la esquina **inferior izquierda** del banner al mostrarlo en
tu perfil real. La plantilla ya deja esa zona libre — si mueves elementos,
verifica el resultado subiéndolo a LinkedIn antes de darlo por definitivo.

## Validar el código

El proyecto usa `.mjs` plano (sin paso de build), pero se valida con el
compilador de TypeScript en modo `checkJs` (funciona como un linter/LSP de
tipos sin necesidad de convertir nada a `.ts`):

```bash
npm run typecheck
```

Sin salida = sin errores.

## Licencia

MIT — ver [LICENSE](LICENSE).
