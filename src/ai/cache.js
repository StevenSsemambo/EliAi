/**
 * Tiny cache invalidation helper — extracted from chatbot.js
 * so pages can import just this without loading the full 156KB chatbot module.
 */

const CACHE_KEY = 'elimu_profile_cache_bust'

export function invalidateProfileCache() {
  try { localStorage.setItem(CACHE_KEY, Date.now().toString()) } catch(e) {}
}

export function getProfileCacheBust() {
  try { return localStorage.getItem(CACHE_KEY) } catch(e) { return null }
}
