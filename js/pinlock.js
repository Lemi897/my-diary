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
//
// The dot-based lock UI is injected dynamically into the existing
// #pinLockOverlay container rather than requiring matching markup
// on all 8 pages — one file to maintain, and no risk of a rollout
// landing on some pages and not others.
// ============================================================

const PIN_HASH_KEY = 'pin_lock_hash';

// Re-lock after 3 minutes of real inactivity — not just backgrounding
// the tab. The old version only checked tab visibility, which meant
// leaving the app open but untouched on screen never locked at all.
// This now covers both: switching away for 3+ minutes, OR just
// sitting idle with the tab still open and visible.
const LOCK_GRACE_MS = 3 * 60 * 1000;

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
// Dot UI injection — runs once, the first time the lock is ever
// shown on a given page load. Keeps the real <input> for actual
// keystroke/numeric-keypad handling (mobile needs a real input to
// trigger the numeric keyboard), but visually hides it and renders
// 4 dots that reflect its value length instead.
// ------------------------------------------------------------
function ensureDotUI() {
  const overlay = document.getElementById('pinLockOverlay');
  if (!overlay || overlay.dataset.dotsReady) return;

  const input = document.getElementById('pinLockInput');
  if (!input) return;

  input.classList.add('pin-lock-input-hidden');

  const dotsRow = document.createElement('div');
  dotsRow.className = 'pin-dots-row';
  dotsRow.id = 'pinDotsRow';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'pin-dot';
    dotsRow.appendChild(dot);
  }
  input.insertAdjacentElement('afterend', dotsRow);

  overlay.dataset.dotsReady = 'true';
}

function updateDots(length) {
  const dots = document.querySelectorAll('#pinDotsRow .pin-dot');
  dots.forEach((dot, i) => {
    const shouldFill = i < length;
    const wasFilled = dot.classList.contains('filled');
    dot.classList.toggle('filled', shouldFill);
    if (shouldFill && !wasFilled) {
      // Trigger the pop animation fresh each time a dot newly fills
      dot.classList.remove('pin-dot-pop');
      void dot.offsetWidth; // force reflow so the animation restarts
      dot.classList.add('pin-dot-pop');
    }
  });
}

function shakeDots() {
  const row = document.getElementById('pinDotsRow');
  if (!row) return;
  row.classList.remove('pin-dots-shake');
  void row.offsetWidth;
  row.classList.add('pin-dots-shake');
}

function flashSuccess() {
  const row = document.getElementById('pinDotsRow');
  if (row) row.classList.add('pin-dots-success');
}

// ------------------------------------------------------------
// initPinLock() — call once per page, early (right after the
// auth check, before data loads). Shows the lock immediately on
// load if a PIN is set, and re-locks after LOCK_GRACE_MS of real
// inactivity — whether that's from switching away or just sitting
// idle with the tab still open.
// ------------------------------------------------------------
export function initPinLock() {
  if (!isPinSet()) return;

  showLock();

  let lastActivity = Date.now();
  const markActivity = () => { lastActivity = Date.now(); };
  ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt =>
    document.addEventListener(evt, markActivity, { passive: true })
  );

  let hiddenAt = null;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else {
      if (hiddenAt && (Date.now() - hiddenAt) > LOCK_GRACE_MS) showLock();
      hiddenAt = null;
    }
  });

  // Catches the case visibility never changes at all — tab stays
  // open and visible, but nobody's touched it in 3 minutes.
  setInterval(() => {
    const overlay = document.getElementById('pinLockOverlay');
    const alreadyLocked = overlay && overlay.classList.contains('visible');
    if (!document.hidden && !alreadyLocked && (Date.now() - lastActivity) > LOCK_GRACE_MS) {
      showLock();
    }
  }, 15000);
}

function showLock() {
  const overlay = document.getElementById('pinLockOverlay');
  if (!overlay) return;
  ensureDotUI();
  overlay.classList.add('visible');
  const row = document.getElementById('pinDotsRow');
  if (row) row.classList.remove('pin-dots-success', 'pin-dots-shake');
  const input = document.getElementById('pinLockInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 50); }
  updateDots(0);
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
    updateDots(input.value.length);
    if (input.value.length < 4) return;

    const ok = await verifyPin(input.value);
    if (ok) {
      flashSuccess();
      setTimeout(hideLock, 280);
    } else {
      if (error) error.style.display = 'block';
      shakeDots();
      setTimeout(() => { input.value = ''; updateDots(0); }, 300);
    }
  });
}