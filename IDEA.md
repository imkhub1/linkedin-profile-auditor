LinkedIn Audit is a local, agent-guided profile-review assistant that extracts
the authenticated user's profile and generates recruiter-focused improvement
recommendations after explicit consent.

- Analyze headline, about section, experience, skills, and featured content for clarity and keyword relevance.
- Score observable profile strength across visibility, credibility, and role
  alignment with transparent, editorial criteria.
- Generate actionable rewrite suggestions tailored to target roles and industries.
- Future idea: benchmark profiles against high-performing peers only with
  reliable, permissioned comparison data.
- Provide a step-by-step optimization checklist users can apply in under one hour.

## Estado del proyecto

Ver `README.md` para la estructura de carpetas, instrucciones de uso y notas técnicas del scraper. Resumen rápido:

- `npm start` — asistente guiado para preparación, login y extracción.
- `npm run login` — sesión de LinkedIn guardada en `.auth/state.json`.
- `npm run scrape` — extrae el perfil autenticado (about, experiencia, skills, certificaciones, recomendaciones) a `data/profile/profile.txt`.
- `npm run banner:render` — genera el banner de perfil (`src/banner/banner.html` -> `data/banner/banner.png`).
- El análisis se realiza con la skill local `.agents/skills/linkedin-profile-auditor` y genera `data/audit/report.md` tras consentimiento explícito.
