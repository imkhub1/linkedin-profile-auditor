# Guía de auditoría de perfil de LinkedIn

Este checklist es la misma metodología usada para auditar perfiles con este
proyecto. Puedes aplicarla manualmente sobre tu `data/profile/profile.txt`,
o pegarle este archivo completo a un asistente de IA (ChatGPT, Claude,
Copilot, etc.) junto con tu `profile.txt` y pedirle que te dé un reporte
siguiendo esta estructura.

## 1. Headline (título bajo tu nombre)

- [ ] ¿Incluye tu rol/puesto?
- [ ] ¿Incluye 2-4 keywords técnicas o de especialidad reales (no genéricas)?
- [ ] ¿Comunica una propuesta de valor, no solo un cargo?
- [ ] Longitud: LinkedIn permite hasta 220 caracteres — ¿la estás aprovechando?

❌ Débil: "Buscando oportunidades" / "Desempleado"
✅ Fuerte: "[Rol] | [Especialidad concreta] | [Propuesta de valor]"

## 2. About / Extracto

- [ ] ¿Tiene un "hook" (primera línea) que engancha antes del "ver más"?
- [ ] ¿Menciona años de experiencia y logros con métricas concretas?
- [ ] ¿Lista tu stack/skills reales de forma explícita (no solo implícita)?
- [ ] ¿Tiene un call-to-action o forma de contacto al final?
- [ ] Longitud recomendada: 1,500–2,000 caracteres (de 2,600 posibles).

## 3. Experiencia

Para cada rol relevante:
- [ ] ¿Los bullets muestran logros y resultados, no solo responsabilidades?
- [ ] ¿Incluye el stack/herramientas usadas?
- [ ] Roles antiguos (+7 años) y sin relación con tu marca actual: ¿están
      comprimidos a 2-3 bullets en vez de ocupar mucho espacio?

## 4. Skills

- [ ] ¿Tienes al menos 5 (mínimo "All-Star")? Idealmente cerca de 50.
- [ ] ¿Tus 3 "Top Skills" (las que aparecen destacadas bajo el headline)
      reflejan tu diferenciador real, no términos genéricos?
- [ ] ¿Tienes endorsements en tus skills más importantes? (0 endorsements
      es la debilidad más común y de mayor impacto en búsquedas).
- [ ] ¿Falta alguna herramienta/skill mencionada en tu About o Experiencia
      que no esté en la lista formal de Skills? (Nota: LinkedIn solo
      permite skills de su taxonomía cerrada — algunas herramientas muy
      nuevas pueden no estar disponibles para agregar, eso no es un error
      tuyo).

## 5. Recomendaciones (Recommendations)

- [ ] ¿Tienes al menos 2-3? Idealmente 5+.
- [ ] ¿Cubren distintos empleadores/roles de tu carrera, o están
      concentradas en uno solo?
- [ ] ¿Incluyen a managers/leads directos (más peso) o solo pares?

## 6. Featured

- [ ] ¿Tu contenido con mejor tracción/engagement está fijado primero?
- [ ] ¿Hay proyectos propios (no solo certificados de cursos)?
- [ ] ¿Los links funcionan y apuntan a algo mostrable (repo, artículo, demo)?

## 7. Educación y Certificaciones

- [ ] ¿La educación tiene contexto (proyectos, especialización) si aporta
      a tu narrativa actual?
- [ ] ¿Las certificaciones son recientes y relevantes a tu rol objetivo?

## 8. Banner / Foto de portada

- [ ] ¿El banner refuerza tu marca personal, no solo la de tu empleador
      actual? (si cambias de trabajo, el banner debería seguir siendo tuyo)
- [ ] ¿Evita duplicar literalmente el texto del headline? (mejor usar el
      espacio para una propuesta de valor complementaria)
- [ ] ¿El contenido importante evita la esquina inferior izquierda? (ahí
      se superpone tu foto de perfil circular al verlo en LinkedIn)
- [ ] ¿Tiene buen contraste y es legible en miniatura (feed, búsquedas)?

## 9. Foto de perfil

- [ ] Foto profesional, rostro ocupa ~60% del encuadre, buena iluminación.
- [ ] (Los perfiles con foto reciben ~21x más vistas que sin foto).

## 10. Conexiones y actividad

- [ ] ¿Tienes 500+? (no crítico, pero mejora percepción/alcance)
- [ ] ¿Publicas o interactúas con cierta regularidad? (afecta el
      algoritmo de visibilidad de LinkedIn)

---

## Prompt sugerido para un asistente de IA

Si quieres que un asistente de IA te dé un reporte como el de este
proyecto, puedes usar algo así:

```
Aquí está el texto completo de mi perfil de LinkedIn (extraído con
Playwright). Audítalo siguiendo el checklist de docs/audit-checklist.md
de este repo: dame un score de completeness y searchability, lista lo
que ya está bien, los problemas encontrados priorizados por impacto, y
un checklist accionable de mejoras para menos de una hora de trabajo.

[pegar contenido de data/profile/profile.txt]
```
