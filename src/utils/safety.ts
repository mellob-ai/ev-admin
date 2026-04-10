// Shared safety helpers for input hygiene and display masking.

export function sanitizeText(value) {
  const text = String(value ?? '');
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();
}

export function sanitizeMultilineText(value) {
  return sanitizeText(value)
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function isStrongPassword(password) {
  const value = String(password ?? '');
  return value.length >= 12
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

export function isValidRecipient(value) {
  const input = sanitizeText(value);
  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
  const userIdLike = /^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(input);
  return emailLike || userIdLike;
}

export function maskIp(value) {
  const input = String(value ?? '').trim();
  if (!input.includes('.')) return input;
  const parts = input.split('.');
  if (parts.length !== 4) return input;
  return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
}