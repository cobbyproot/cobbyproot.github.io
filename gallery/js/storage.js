/**
 * localStorage state management.
 * Persists user preferences for NSFW mode and price visibility.
 */

const KEYS = {
    NSFW_MODE: 'gallery_nsfw_mode',
    PRICE_HIDDEN: 'gallery_price_hidden',
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
