/**
 * Static assertions for Portfolio Assistant production Wrangler config.
 * Used by tests and `npm run verify:assistant-worker-production-config`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCTION_ALLOWED_ORIGIN } from "../src/constants.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} tomlText
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function assertProductionAssistantOrigins(tomlText) {
  const errors = [];
  const match = tomlText.match(/ASSISTANT_ALLOWED_ORIGINS\s*=\s*"([^"]*)"/);
  if (!match) {
    errors.push("missing ASSISTANT_ALLOWED_ORIGINS");
    return { ok: false, errors };
  }
  const origins = match[1]
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (origins.length !== 1 || origins[0] !== PRODUCTION_ALLOWED_ORIGIN) {
    errors.push(
      `ASSISTANT_ALLOWED_ORIGINS must be exactly ${PRODUCTION_ALLOWED_ORIGIN}`,
    );
  }
  if (origins.some((o) => /localhost|127\.0\.0\.1/i.test(o))) {
    errors.push("localhost origins are forbidden in production config");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

/**
 * @param {string} [tomlPath]
 */
export function verifyProductionAssistantConfigFile(
  tomlPath = join(root, "wrangler.production.toml.example"),
) {
  const text = readFileSync(tomlPath, "utf8");
  const originCheck = assertProductionAssistantOrigins(text);
  const errors = originCheck.ok ? [] : [...originCheck.errors];

  if (!/ASSISTANT_CLIENT_IP_MODE\s*=\s*"cloudflare"/.test(text)) {
    errors.push('ASSISTANT_CLIENT_IP_MODE must be "cloudflare" in production example');
  }
  if (/ASSISTANT_CLIENT_IP_MODE\s*=\s*"dev"/.test(text)) {
    errors.push("production example must not use ASSISTANT_CLIENT_IP_MODE=dev");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
