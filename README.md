# LinkedIn Profile Auditor

Herramienta local y guiada para extraer **tu propio** perfil de LinkedIn y
auditarlo con un agente de IA. No modifica LinkedIn ni necesita una API key.

## Empieza aquí

### Con un agente de IA (recomendado)

1. Abre esta carpeta con un agente compatible con Agent Skills.
2. Dile: `Ayúdame a configurar y auditar mi perfil de LinkedIn`.
3. El agente seguirá [`AGENTS.md`](AGENTS.md), te pedirá permiso antes de
   leer tu perfil y usará la skill local de auditoría.

### Desde la terminal

Necesitas macOS, Node.js 22 o posterior y una cuenta de LinkedIn propia.

```bash
git clone https://github.com/imkhub1/linkedin-profile-auditor.git
cd linkedin-profile-auditor
npm start
```

El asistente revisa el equipo, ofrece instalar dependencias y Chromium, abre
LinkedIn para que inicies sesión manualmente y permite extraer el perfil.

## Flujo

```text
npm start          Asistente guiado
npm run doctor     Diagnóstico del equipo
npm run login      Login manual en una ventana de navegador
npm run scrape     Extrae automáticamente el perfil de la cuenta autenticada
```

Después de `npm run scrape`, el texto queda en `data/profile/profile.txt` y
los estados de completitud en `data/profile/profile.json`. El scraper también
intenta guardar foto y banner acotados en `data/profile/visual/` y consulta Open
to Work de forma exclusiva de lectura. Pide al agente una auditoría; tras tu
consentimiento para el texto y, por separado, para las imágenes, guardará el
informe en `data/audit/report.md`.

No necesitas buscar ni pegar tu URL de LinkedIn. Si indicas una URL de forma
manual, debe coincidir con el perfil de la sesión autenticada; los perfiles de
terceras personas se rechazan.

## Privacidad Y Seguridad

- Inicias sesión directamente en un navegador visible. El proyecto nunca pide
  ni guarda tu contraseña.
- `.auth/state.json` conserva una cookie de sesión sensible para evitar repetir
  el login. No se sube a Git, pero debe tratarse como una credencial.
- La extracción, configuraciones privadas, evidencia visual e informes viven
  en `data/`, también ignorado por Git.
- El CLI no envía el perfil a ningún servicio. Un agente solo puede leerlo
  después de que le des consentimiento explícito. Foto y banner requieren un
  consentimiento adicional en cada auditoría.
- Usa la herramienta de forma ocasional para tu propio perfil. LinkedIn limita
  el uso de automatización en sus [Términos de Servicio](https://www.linkedin.com/legal/user-agreement).

Para borrar los datos locales con confirmación:

```bash
npm run logout     # Elimina la sesión
npm run clean      # Elimina perfil e informes locales
```

## Qué Puede Auditarse

La skill local revisa el texto observable de headline, About, experiencia,
skills, educación, certificaciones, Featured, actividad y recomendaciones.
Evalúa foto y banner solo si se capturaron y autorizas su análisis. Open to
Work se resume de forma privada cuando la configuración se puede verificar.
Si LinkedIn no entrega el detalle completo de Skills o Certificaciones, el
reporte lo advierte y no puntúa ni recomienda cambios para esa sección.

## Banner Opcional

El generador de banner sigue disponible para usuarios que quieran editar la
plantilla HTML/CSS:

```bash
npm run banner:render
```

El resultado es `data/banner/banner.png` a 1584x396 px.

## Desarrollo

```bash
npm run typecheck
npm test
```

## English

Run `AUDITOR_LANG=en npm start` for the English terminal flow. The project is
local-only: it opens LinkedIn for manual sign-in, extracts only the signed-in
profile, and asks for explicit consent before an AI agent reads profile text.

## License

MIT. See [LICENSE](LICENSE).
