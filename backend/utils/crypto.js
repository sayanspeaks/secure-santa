import crypto from 'crypto';

/**
 * Generate a cryptographically secure random secret ID
 * This is the ID visible ONLY to the participant
 * Returns a 32-character hex string (16 random bytes)
 */
export function generateSecretId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a public ID for the participant
 * This is the ID visible to their Santa
 * Completely different from secret_id to prevent reverse-engineering
 * Returns a 32-character hex string (16 random bytes)
 */
export function generatePublicId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a secure organizer token for admin access
 */
export function generateOrganizerToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a magic link token for participant authentication
 */
export function generateMagicLinkToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create an event ID
 */
export function generateEventId() {
  return crypto.randomUUID();
}

