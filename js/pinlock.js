// ============================================================
// js/pinlock.js
// Device-level PIN lock — separate from your Supabase login.
// Threat model: someone picks up a device where you're already
// logged in. This does NOT protect your account (your login
// password does that) — it protects against physical access to
// an already-unlocked session.
//
// The PIN itself is never stored in plain text, even locally —
// only a SHA-256 hash, via the browser's built-in Web Crypto API
// (no new dependency). Storage is per-device (localStorage), by
// design: this is a device lock, not an account setting, so it
// doesn't sync across devices and isn't recoverable if forgotten
// except by removing it (see removePin below).
// ============================================================

const PIN_HASH_KEY = 'pin_lock_hash';
const LOCK_GRACE_MS = 60000; // re-lock only if hidden for more than 60s,
                              // so a quick app-switch doesn't force re-entry

async function hashPin(pin) {
  const enc = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function isPinSet() {
  return !!localStorage.getItem(PIN_HASH_KEY);
}

export async function setPin(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('PIN must be exactly 4 digits.');
  localStorage.setItem(PIN_HASH_KEY, await hashPin(pin));
}

export function removePin() {
  localStorage.removeItem(PIN_HASH_KEY);
}

export async function verifyPin(pin) {
  const stored = localStorage.getItem(PIN_HASH_KEY);
  if (!stored) return true; // no PIN set — nothing to check against
  return (await hashPin(pin)) === stored;
}

// ------------------------------------------------------------
// initPinLock() — call once per page, early (right after the
// auth check, before data loads). Shows the lock immediately on
// load if a PIN is set, and re-locks after the tab/app has been
// hidden for more than LOCK_GRACE_MS.
// ------------------------------------------------------------
export function initPinLock() {
  if (!isPinSet()) return;

  showLock();

  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else {
      if (hiddenAt && (Date.now() - hiddenAt) > LOCK_GRACE_MS) showLock();
      hiddenAt = null;
    }
  });
}

function showLock() {
  const overlay = document.getElementById('pinLockOverlay');
  if (!overlay) return;
  overlay.classList.add('visible');
  const input = document.getElementById('pinLockInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
  const err = document.getElementById('pinLockError');
  if (err) err.style.display = 'none';
}

function hideLock() {
  const overlay = document.getElementById('pinLockOverlay');
  if (overlay) overlay.classList.remove('visible');
}

// ------------------------------------------------------------
// wirePinLockUI() — call once per page, after the DOM is ready.
// Wires the lock screen's input to actually check the PIN.
// Safe to call even if no PIN is set (the overlay just never
// shows, per initPinLock above), and safe to call on pages that
// don't include the overlay markup at all.
// ------------------------------------------------------------
export function wirePinLockUI() {
  const input = document.getElementById('pinLockInput');
  if (!input) return;
  const error = document.getElementById('pinLockError');

  input.addEventListener('input', async () => {
    if (input.value.length < 4) return;
    const ok = await verifyPin(input.value);
    if (ok) {
      hideLock();
    } else {
      if (error) error.style.display = 'block';
      input.value = '';
    }
  });
}