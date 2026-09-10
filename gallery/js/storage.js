/**
 * localStorage state management.
 * Persists user preferences for NSFW mode, price visibility, and admin PIN.
 */

const KEYS = {
    NSFW_MODE: 'gallery_nsfw_mode',
    PRICE_HIDDEN: 'gallery_price_hidden',
    ADMIN_PIN_HASH: 'gallery_admin_pin_hash',
    AGE_VERIFIED: 'gallery_age_verified',
};

export function getNsfwMode() {
    return localStorage.getItem(KEYS.NSFW_MODE) || 'hide';
}

export function setNsfwMode(mode) {
    localStorage.setItem(KEYS.NSFW_MODE, mode);
}

export function isPriceHidden() {
    return localStorage.getItem(KEYS.PRICE_HIDDEN) === 'true';
}

export function setPriceHidden(hidden) {
    localStorage.setItem(KEYS.PRICE_HIDDEN, String(hidden));
}

export function isAgeVerified() {
    return localStorage.getItem(KEYS.AGE_VERIFIED) === 'true';
}

export function setAgeVerified(verified) {
    localStorage.setItem(KEYS.AGE_VERIFIED, String(verified));
}

export async function getStoredPinHash() {
    return localStorage.getItem(KEYS.ADMIN_PIN_HASH) || null;
}

export async function storePinHash(pin) {
    const hash = await hashPin(pin);
    localStorage.setItem(KEYS.ADMIN_PIN_HASH, hash);
}

export async function verifyPin(pin) {
    const stored = await getStoredPinHash();
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
}

export function hasPinSet() {
    return !!localStorage.getItem(KEYS.ADMIN_PIN_HASH);
}

async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + '_gallery_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
