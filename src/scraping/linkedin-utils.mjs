const PROFILE_PATH = /^\/in\/([^/]+)\/?$/i;

export function normalizeProfileUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const match = url.pathname.match(PROFILE_PATH);
    if (url.protocol !== "https:" || !["linkedin.com", "www.linkedin.com"].includes(host) || !match) {
      return null;
    }
    return `https://www.linkedin.com/in/${match[1]}`;
  } catch {
    return null;
  }
}

export function isSameProfile(first, second) {
  const normalizedFirst = normalizeProfileUrl(first);
  const normalizedSecond = normalizeProfileUrl(second);
  return Boolean(normalizedFirst && normalizedSecond && normalizedFirst.toLowerCase() === normalizedSecond.toLowerCase());
}

export function classifyLinkedInPage(url, text = "") {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "unexpected";
  }

  if (!["linkedin.com", "www.linkedin.com"].includes(parsed.hostname.toLowerCase())) return "unexpected";
  if (/\/(login|checkpoint|authwall)(\/|$)/i.test(parsed.pathname)) return "authentication";

  const normalizedText = text.toLowerCase();
  if (
    (normalizedText.includes("sign in") && normalizedText.includes("join now")) ||
    normalizedText.includes("security verification") ||
    normalizedText.includes("verificación de seguridad")
  ) {
    return "authentication";
  }
  return "ok";
}
