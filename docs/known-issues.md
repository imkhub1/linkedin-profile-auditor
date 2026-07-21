# Known Issues

## LinkedIn interface changes

LinkedIn can change page structure, session checks, locale labels, and lazy
loading without notice. The extractor stops rather than saving a result when
it detects a login/checkpoint page or insufficient main content. Rerun
`npm run login` if the session expires, then run `npm run scrape` again.

Text extraction cannot assess profile photos, banners, rich-media quality,
private settings, analytics, or visual layout. The audit must label those
items as not assessable unless the user supplies separate evidence.

## Playwright skill availability

LinkedIn uses a closed Skills taxonomy whose available entries can vary by
account, locale, or over time. When Playwright is relevant to a profile, an
audit should recommend it and ask the user to confirm whether LinkedIn offers
it as an addable skill.

If the user confirms that it is unavailable, suggest `Test Automation Tools`
as the closest alternative. Keep `Playwright` visible in the headline, About
section, experience descriptions, Featured projects, and certifications where
applicable.

If the user confirms that Playwright is available, update this document and
future audit guidance to recommend it as a formal skill.

Current user report: Playwright was not addable. Current top skills reference:
QA Automation, Accessibility Testing, Artificial Intelligence (AI), TypeScript,
and Test Automation Tools.
