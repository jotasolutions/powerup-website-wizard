export function getAppOrigin(): string {
  const explicit =
    process.env.APP_URL ??
    process.env.PUBLIC_URL ??
    process.env.VITE_APP_URL;

  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const port = process.env.PORT ?? process.env.VITE_PORT ?? "8080";
  return `http://localhost:${port}`;
}
