/**
 * PII (Personally Identifiable Information) filtering utilities
 * Redacts patient names, medical record numbers, and other sensitive data
 */

const MRN_PATTERN = /\b[A-Z]{2,3}\d{6,8}\b/g; // Medical Record Number pattern
const NAME_PATTERN = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g; // Simple name pattern
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g; // Social Security Number
const PHONE_PATTERN = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g; // Phone number
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g; // Email

export function filterPII(text: string): string {
  if (!text) return text;

  let filtered = text;

  // Redact medical record numbers
  filtered = filtered.replace(MRN_PATTERN, '[MRN]');

  // Redact SSN
  filtered = filtered.replace(SSN_PATTERN, '[SSN]');

  // Redact phone numbers
  filtered = filtered.replace(PHONE_PATTERN, '[PHONE]');

  // Redact emails
  filtered = filtered.replace(EMAIL_PATTERN, '[EMAIL]');

  // Redact potential names (be conservative)
  // Only redact if it looks like "FirstName LastName" pattern
  filtered = filtered.replace(NAME_PATTERN, '[NAME]');

  return filtered;
}

export function filterPIIFromObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const filtered = { ...obj };

  for (const key in filtered) {
    if (typeof filtered[key] === 'string') {
      filtered[key] = filterPII(filtered[key]);
    } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterPIIFromObject(filtered[key]);
    }
  }

  return filtered;
}

export function anonymizePatientId(patientId: string): string {
  // Create a consistent hash-based anonymization
  // In production, use a proper hashing function
  const hash = patientId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  return `PATIENT_${Math.abs(hash).toString(16).toUpperCase().substring(0, 8)}`;
}
