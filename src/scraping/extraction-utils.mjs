const SECTION_LABELS = {
  skills: /^(skills|aptitudes)$/i,
  certifications: /^(licenses?\s*&\s*certifications|licencias?\s+y\s+certificaciones?)$/i,
  experience: /^(experience|experiencia)$/i,
  education: /^(education|educación)$/i,
  recommendations: /^(recommendations|recomendaciones)$/i,
};

const NON_RECORD_TEXT = /^(show all|see all|show more|see more|ver todo|ver todas|ver más|mostrar más|skills|aptitudes|licenses?\s*&\s*certifications|licencias?\s+y\s+certificaciones?)$/i;

export function uniqueRecords(records) {
  const seen = new Set();
  return records
    .map((record) => record.replace(/\s+/g, " ").trim())
    .filter((record) => record.length > 1 && !NON_RECORD_TEXT.test(record))
    .filter((record) => {
      const key = record.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function declaredCount(section, text) {
  const label = section === "skills" ? "skills|aptitudes" : "licenses?\\s*&\\s*certifications|licencias?\\s+y\\s+certificaciones?";
  const patterns = [
    new RegExp(`(?:${label})\\s*\\(?\\s*(\\d+)\\s*\\)?`, "i"),
    new RegExp(`(\\d+)\\s+(?:${label})`, "i"),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

export function assessSection({ section, headingText, records, declared, hasCollapsedContent }) {
  const extractedRecords = uniqueRecords(records);
  const headingFound = SECTION_LABELS[section]?.test(headingText.trim()) ?? false;
  const warnings = [];
  let status = "complete";

  if (!headingFound) {
    status = "unavailable";
    warnings.push("expected_heading_not_found");
  } else if (["skills", "certifications"].includes(section) && extractedRecords.length === 0) {
    status = "unavailable";
    warnings.push("no_detail_records_found");
  } else if (hasCollapsedContent) {
    status = "partial";
    warnings.push("collapsed_content_remaining");
  }

  if (declared !== null && extractedRecords.length < declared) {
    if (status !== "unavailable") status = "partial";
    warnings.push("declared_count_mismatch");
  }

  return {
    status,
    declaredCount: declared,
    extractedCount: extractedRecords.length,
    records: extractedRecords,
    warnings,
  };
}

function valuesAfterLabel(lines, labels) {
  const values = [];
  for (let index = 0; index < lines.length; index++) {
    if (!labels.test(lines[index])) continue;
    const value = lines[index + 1]?.trim();
    if (value && !labels.test(value)) values.push(value);
  }
  return uniqueRecords(values);
}

export function parseOpenToWorkConfiguration(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalized = lines.join("\n").toLowerCase();
  const jobTitles = valuesAfterLabel(lines, /^(job titles?|puestos? de trabajo)$/i);
  const locations = valuesAfterLabel(lines, /^(locations?|ubicaciones?)$/i);
  const workplaceTypes = valuesAfterLabel(lines, /^(workplace types?|modalidades? de trabajo)$/i);
  const employmentTypes = valuesAfterLabel(lines, /^(employment types?|tipos? de empleo)$/i);

  let status = "unavailable";
  if (/add job preferences|set up open to work|configura.*open to work|agrega.*preferencias/.test(normalized)) {
    status = "notConfigured";
  } else if (/not open to work|open to work.*off|no disponible para trabajar/.test(normalized)) {
    status = "disabled";
  } else if (jobTitles.length || locations.length || workplaceTypes.length || employmentTypes.length) {
    status = "enabled";
  }

  let visibility = "unknown";
  if (/all linkedin members|todos los miembros de linkedin/.test(normalized)) visibility = "allMembers";
  else if (/recruiters only|solo reclutadores/.test(normalized)) visibility = "recruitersOnly";
  else if (/only you|solo tú/.test(normalized)) visibility = "onlyYou";

  return { status, visibility, jobTitles, locations, workplaceTypes, employmentTypes };
}
