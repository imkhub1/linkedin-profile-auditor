import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyLinkedInPage, isSameProfile, normalizeProfileUrl } from "../src/scraping/linkedin-utils.mjs";
import { assessSection, parseOpenToWorkConfiguration, uniqueRecords } from "../src/scraping/extraction-utils.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(fs.readFileSync(path.join(testDir, "fixtures", "extraction-fixtures.json"), "utf8"));

test("normalizes canonical LinkedIn profile URLs", () => {
  assert.equal(
    normalizeProfileUrl("https://www.linkedin.com/in/Example-User/?trk=public_profile"),
    "https://www.linkedin.com/in/Example-User"
  );
  assert.equal(normalizeProfileUrl("https://linkedin.com/in/example-user/"), "https://www.linkedin.com/in/example-user");
});

test("rejects URLs that are not canonical LinkedIn profiles", () => {
  assert.equal(normalizeProfileUrl("https://www.linkedin.com/in/example-user/details/experience/"), null);
  assert.equal(normalizeProfileUrl("http://www.linkedin.com/in/example-user/"), null);
  assert.equal(normalizeProfileUrl("https://example.com/in/example-user/"), null);
  assert.equal(normalizeProfileUrl("not a url"), null);
});

test("compares profile URLs case-insensitively", () => {
  assert.equal(
    isSameProfile("https://www.linkedin.com/in/Example-User/", "https://www.linkedin.com/in/example-user"),
    true
  );
  assert.equal(
    isSameProfile("https://www.linkedin.com/in/example-user", "https://www.linkedin.com/in/another-user"),
    false
  );
});

test("detects LinkedIn authentication and unexpected pages", () => {
  assert.equal(classifyLinkedInPage("https://www.linkedin.com/login", ""), "authentication");
  assert.equal(
    classifyLinkedInPage("https://www.linkedin.com/feed/", "Sign in\nJoin now"),
    "authentication"
  );
  assert.equal(classifyLinkedInPage("https://example.com/", "Profile"), "unexpected");
  assert.equal(classifyLinkedInPage("https://www.linkedin.com/in/example-user/", "Profile"), "ok");
});

test("ships a project-local LinkedIn audit skill", () => {
  const skillPath = path.join(testDir, "..", ".agents", "skills", "linkedin-profile-auditor", "SKILL.md");
  const skill = fs.readFileSync(skillPath, "utf8");
  assert.match(skill, /^---\nname: linkedin-profile-auditor\n/m);
  assert.match(skill, /Ask for explicit consent before reading `data\/profile\/profile\.txt`/);
  assert.match(skill, /data\/audit\/report\.md/);
  assert.match(skill, /## Guided Intake/);
  assert.match(skill, /QA Automation Engineer \/ SDET/);
  assert.match(skill, /replace them with generic industry descriptions/);
});

test("marks shell-only skills and certifications sections unavailable", () => {
  const result = assessSection({
    section: "skills",
    headingText: "Skills",
    records: ["Skills", "Show all"],
    declared: 53,
    hasCollapsedContent: false,
  });
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.warnings, ["no_detail_records_found", "declared_count_mismatch"]);
});

test("deduplicates records and marks collapsed details partial", () => {
  assert.deepEqual(uniqueRecords(["Playwright", "  Playwright ", "TypeScript"]), ["Playwright", "TypeScript"]);
  const result = assessSection({
    section: "certifications",
    headingText: "Licencias y certificaciones",
    records: ["Playwright: Design Patterns", "Playwright: Design Patterns"],
    declared: 1,
    hasCollapsedContent: true,
  });
  assert.equal(result.status, "partial");
  assert.deepEqual(result.records, ["Playwright: Design Patterns"]);
});

test("parses Open to Work status without guessing visibility", () => {
  const configuration = parseOpenToWorkConfiguration([
    "Open to work",
    "Job titles",
    "QA Automation Engineer",
    "Locations",
    "Costa Rica",
    "Workplace types",
    "Remote",
    "Employment types",
    "Full-time",
    "Recruiters only",
  ].join("\n"));
  assert.equal(configuration.status, "enabled");
  assert.equal(configuration.visibility, "recruitersOnly");
  assert.deepEqual(configuration.jobTitles, ["QA Automation Engineer"]);
});

test("distinguishes unconfigured Open to Work from unavailable data", () => {
  assert.equal(parseOpenToWorkConfiguration("Set up Open to Work\nAdd job preferences").status, "notConfigured");
  assert.equal(parseOpenToWorkConfiguration("Jobs\nPreferences").status, "unavailable");
});

test("uses declared counts to distinguish complete and partial detail inventories", () => {
  const complete = assessSection({ section: "skills", ...fixtures.skillsComplete });
  const partial = assessSection({ section: "certifications", ...fixtures.certificationsPartial });
  assert.equal(complete.status, "complete");
  assert.equal(complete.extractedCount, 2);
  assert.equal(partial.status, "partial");
  assert.deepEqual(partial.warnings, ["declared_count_mismatch"]);
});

test("parses Spanish Open to Work preferences and confirmed disabled state", () => {
  const spanish = parseOpenToWorkConfiguration(fixtures.openToWorkSpanish);
  assert.equal(spanish.status, "enabled");
  assert.equal(spanish.visibility, "recruitersOnly");
  assert.deepEqual(spanish.workplaceTypes, ["Remoto"]);
  assert.equal(parseOpenToWorkConfiguration(fixtures.openToWorkDisabled).status, "disabled");
});
