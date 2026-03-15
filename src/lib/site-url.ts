const PRIMARY_SITE_URL = "https://repomind.in";

function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getCanonicalSiteUrl(): string {
  return PRIMARY_SITE_URL;
}

export function getPublicSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL || PRIMARY_SITE_URL);
}
