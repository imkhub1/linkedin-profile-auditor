import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyLinkedInPage, isSameProfile, normalizeProfileUrl } from "../src/scraping/linkedin-utils.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));

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
});
