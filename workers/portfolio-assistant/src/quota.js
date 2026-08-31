import {
  CLIENT_IP_MODE_CLOUDFLARE,
  CLIENT_IP_MODE_DEV,
  DEFAULT_BURST_SECONDS,
  DEFAULT_GLOBAL_DAILY_LIMIT,
  DEFAULT_IP_DAILY_LIMIT,
  DEV_SYNTHETIC_CLIENT_IP,
  MAX_BURST_SECONDS,
  MAX_GLOBAL_DAILY_LIMIT,
  MAX_IP_DAILY_LIMIT,
} from "./constants.js";

/**
 * Privacy-preserving quota keys via SHA-256.
 * Raw IP is never stored. Hashed day-scoped keys can still correlate repeats within a UTC day.
 *
 * Soft ceiling: check-then-act is not an atomic distributed rate limiter.
 *
 * Cloudflare KV `expirationTtl` minimum is 60 seconds. Sub-minute burst windows
 * are enforced by storing a timestamp and comparing elapsed ms.
 */

/** Cloudflare KV minimum expirationTtl (seconds). */
export const KV_MIN_EXPIRATION_TTL_SECONDS = 60;

/**
 * @param {string} value
 */
async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolve abuse-control client identity.
 * Production (`cloudflare`, default): CF-Connecting-IP only — never X-Forwarded-For.
 * Dev (`dev`): fixed synthetic identity — never client-supplied headers.
 *
 * @param {Request} request
 * @param {{ ASSISTANT_CLIENT_IP_MODE?: string }} env
 * @returns {{ ok: true, ip: string } | { ok: false, error: "server_configuration_error", httpStatus: 503 }}
 */
export function resolveTrustedClientIp(request, env = {}) {
  const mode = String(env.ASSISTANT_CLIENT_IP_MODE || CLIENT_IP_MODE_CLOUDFLARE)
    .trim()
    .toLowerCase();

  if (mode === CLIENT_IP_MODE_DEV) {
    return { ok: true, ip: DEV_SYNTHETIC_CLIENT_IP };
  }

  if (mode !== CLIENT_IP_MODE_CLOUDFLARE) {
    return { ok: false, error: "server_configuration_error", httpStatus: 503 };
  }

  const cf = request.headers.get("cf-connecting-ip");
  if (cf && cf.trim()) {
    return { ok: true, ip: cf.trim() };
  }

  return { ok: false, error: "server_configuration_error", httpStatus: 503 };
}

export function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Strict positive integer parser for abuse-control config.
 * Missing/empty → compiled default. Zero/negative/NaN/out-of-bounds → invalid.
 *
 * @param {unknown} value
 * @param {number} fallback
 * @param {{ min: number, max: number }} bounds
 * @returns {{ ok: true, value: number } | { ok: false }}
 */
export function parseAbuseControlInt(value, fallback, bounds) {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: fallback };
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return { ok: false };
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    return { ok: false };
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < bounds.min || n > bounds.max) {
    return { ok: false };
  }
  return { ok: true, value: n };
}

/**
 * @param {unknown} env
 * @returns {{ ok: true, globalLimit: number, ipLimit: number, burstSeconds: number } | { ok: false }}
 */
export function resolveAbuseControlConfig(env = {}) {
  const globalLimit = parseAbuseControlInt(
    /** @type {any} */ (env).ASSISTANT_GLOBAL_DAILY_LIMIT,
    DEFAULT_GLOBAL_DAILY_LIMIT,
    { min: 1, max: MAX_GLOBAL_DAILY_LIMIT },
  );
  const ipLimit = parseAbuseControlInt(
    /** @type {any} */ (env).ASSISTANT_IP_DAILY_LIMIT,
    DEFAULT_IP_DAILY_LIMIT,
    { min: 1, max: MAX_IP_DAILY_LIMIT },
  );
  const burstSeconds = parseAbuseControlInt(
    /** @type {any} */ (env).ASSISTANT_BURST_SECONDS,
    DEFAULT_BURST_SECONDS,
    { min: 1, max: MAX_BURST_SECONDS },
  );

  if (!globalLimit.ok || !ipLimit.ok || !burstSeconds.ok) {
    return { ok: false };
  }

  return {
    ok: true,
    globalLimit: globalLimit.value,
    ipLimit: ipLimit.value,
    burstSeconds: burstSeconds.value,
  };
}

/**
 * @param {KVNamespace | undefined | null} kv
 * @param {string} key
 */
async function readCount(kv, key) {
  if (!kv) return 0;
  const raw = await kv.get(key);
  const n = Number.parseInt(String(raw || "0"), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {KVNamespace | undefined | null} kv
 * @param {string} key
 * @param {number} next
 * @param {number} expirationTtl
 */
async function writeCount(kv, key, next, expirationTtl) {
  if (!kv) return;
  await kv.put(key, String(next), {
    expirationTtl: Math.max(KV_MIN_EXPIRATION_TTL_SECONDS, expirationTtl),
  });
}

/**
 * Enforce burst + per-IP-hash day + global day quotas before OpenAI.
 * Missing KV, invalid config, or missing trusted IP → fail closed.
 *
 * @param {{
 *   request: Request,
 *   env: Record<string, any>,
 *   nowMs?: number,
 * }} args
 * @returns {Promise<{ ok: true } | { ok: false, error: "quota_exceeded" | "server_configuration_error", httpStatus: number }>}
 */
export async function consumeAskQuota({ request, env, nowMs = Date.now() }) {
  const kv = env.QUOTA_KV;
  if (!kv) {
    return {
      ok: false,
      error: "server_configuration_error",
      httpStatus: 503,
    };
  }

  const config = resolveAbuseControlConfig(env);
  if (!config.ok) {
    return {
      ok: false,
      error: "server_configuration_error",
      httpStatus: 503,
    };
  }

  const trusted = resolveTrustedClientIp(request, env);
  if (!trusted.ok) {
    return {
      ok: false,
      error: trusted.error,
      httpStatus: trusted.httpStatus,
    };
  }

  try {
    const day = utcDayKey(new Date(nowMs));
    const pepper = String(env.ASSISTANT_QUOTA_PEPPER || "portfolio-assistant-quota-v1");
    const ipHash = (await sha256Hex(`${pepper}|${day}|${trusted.ip}`)).slice(0, 32);

    const { globalLimit, ipLimit, burstSeconds } = config;
    const globalKey = `quota:global:${day}`;
    const ipKey = `quota:ip:${ipHash}:${day}`;
    const burstKey = `quota:burst:${ipHash}`;

    const burstRaw = await kv.get(burstKey);
    if (burstRaw) {
      const lastMs = Number.parseInt(String(burstRaw), 10);
      if (Number.isFinite(lastMs) && nowMs - lastMs < burstSeconds * 1000) {
        return { ok: false, error: "quota_exceeded", httpStatus: 429 };
      }
    }

    const [globalCount, ipCount] = await Promise.all([
      readCount(kv, globalKey),
      readCount(kv, ipKey),
    ]);

    if (globalCount >= globalLimit) {
      return { ok: false, error: "quota_exceeded", httpStatus: 429 };
    }
    if (ipCount >= ipLimit) {
      return { ok: false, error: "quota_exceeded", httpStatus: 429 };
    }

    await Promise.all([
      writeCount(kv, globalKey, globalCount + 1, 60 * 60 * 48),
      writeCount(kv, ipKey, ipCount + 1, 60 * 60 * 48),
      kv.put(burstKey, String(nowMs), {
        expirationTtl: Math.max(KV_MIN_EXPIRATION_TTL_SECONDS, burstSeconds),
      }),
    ]);

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "server_configuration_error",
      httpStatus: 503,
    };
  }
}
