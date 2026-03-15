function normalizeSiteUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getCanonicalSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}

export function getPublicSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}
