const FALSEY = new Set(["0", "false", "off", "no"]);

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function envFlag(name: string, defaultValue = true): boolean {
  const value = optionalEnv(name);
  if (value == null) return defaultValue;
  return !FALSEY.has(value.toLowerCase());
}

export function isAutoreplyEnabled(): boolean {
  return envFlag("AUTOREPLY_ENABLED", true);
}

export function graphApiVersion(): string {
  return optionalEnv("IG_GRAPH_API_VERSION") ?? "v23.0";
}

export function graphBaseUrl(): string {
  return `https://graph.instagram.com/${graphApiVersion()}`;
}
