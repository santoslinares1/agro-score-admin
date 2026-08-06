// ADMIN-2: el backend ya sanitiza before/after antes de guardarlos
// (AuditLogService.sanitize en agro-score-api), pero esto es defensa en
// profundidad explícitamente pedida — nunca confiar en una sola capa para
// datos sensibles. Mismo set de keys que el backend, en minúsculas.
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'tokenhash',
  'accesstoken',
  'resettoken',
  'jwt',
  'jwtsecret',
  'secret',
  'apikey',
]);

const REDACTED_PLACEHOLDER = '••••••';

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.has(key.toLowerCase())
        ? REDACTED_PLACEHOLDER
        : redactSensitive(val);
    }

    return result;
  }

  return value;
}

export function formatJson(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  return JSON.stringify(redactSensitive(value), null, 2);
}
