export function parseBackendDate(value) {
  if (typeof value !== 'string') return new Date(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}
