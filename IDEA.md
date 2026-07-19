Linkedin Audit is an automated profile-review assistant that scores LinkedIn profiles and generates prioritized, recruiter-focused improvement recommendations.

- Analyze headline, about section, experience, skills, and featured content for clarity and keyword relevance.
- Score profile strength across visibility, credibility, and role alignment with transparent criteria.
- Generate actionable rewrite suggestions tailored to target roles and industries.
- Benchmark profiles against high-performing peers to highlight competitive gaps.
- Provide a step-by-step optimization checklist users can apply in under one hour.

## Estado del proyecto

Ver `README.md` para la estructura de carpetas, instrucciones de uso y notas técnicas del scraper. Resumen rápido:

- `npm run login` — sesión de LinkedIn guardada en `.auth/state.json`.
- `npm run scrape -- <url-perfil>` — extrae el perfil completo (about, experiencia, skills, certificaciones, recomendaciones) a `data/profile/profile.txt`.
- `npm run banner:render` — genera el banner de perfil (`src/banner/banner.html` -> `data/banner/banner.png`).
- El análisis/scoring se realiza leyendo `data/profile/profile.txt` con el agente (sin LLM externo ni backend).
