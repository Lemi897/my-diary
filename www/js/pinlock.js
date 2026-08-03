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

import { supabase } from './supabase.js';

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

  // The input keeps genuine, normal dimensions and stays visually
  // hidden via a clipping wrapper instead of being sized down to
  // ~0px. Some mobile browsers won't reliably raise the on-screen
  // keyboard for a programmatically-focused element that's too
  // small or zero-sized to plausibly be a real, visible field —
  // this keeps the element "real" from the browser's perspective
  // while still being invisible on screen.
  const wrapper = document.createElement('div');
  wrapper.className = 'pin-input-clip';
  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);
  input.classList.add('pin-lock-input-hidden');

  const dotsRow = document.createElement('div');
  dotsRow.className = 'pin-dots-row';
  dotsRow.id = 'pinDotsRow';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'pin-dot';
    dotsRow.appendChild(dot);
  }
  wrapper.insertAdjacentElement('afterend', dotsRow);

  // Tapping the dots (the only thing visibly present) should
  // refocus the real input, in case focus was ever lost.
  dotsRow.addEventListener('click', () => input.focus());

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
// captureIntruderPhoto() — fires after 3 consecutive wrong PINs.
// Grabs one still frame from the front camera and logs it against
// the account's own user_id, using the shared Supabase client's
// already-persisted session (the PIN lock only ever runs on top
// of an already-authenticated session, so this works without
// needing anything passed in from the page).
//
// Every failure path here — camera denied, unavailable, upload
// error, anything — must fail completely silently. This can never
// surface an error to whoever's actually at the lock screen; the
// only visible behavior stays "incorrect PIN," exactly as before.
// ------------------------------------------------------------
async function captureIntruderPhoto() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play();

    // Give the camera a brief moment to actually produce a real frame
    await new Promise(resolve => setTimeout(resolve, 400));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    stream.getTracks().forEach(track => track.stop());

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;

    const path = `${user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('intruder-photos').upload(path, blob, { contentType: 'image/jpeg' });
    if (uploadError) return;

    await supabase.from('pin_lock_attempts').insert({ user_id: user.id, image_path: path });
  } catch (err) {
    // Silently do nothing — camera permission denied, no camera
    // present, offline, anything at all.
  }
}

// ------------------------------------------------------------
// initPinLock() — call once per page, early (right after the
// auth check, before data loads). Shows the lock immediately on
// load if a PIN is set, and re-locks after LOCK_GRACE_MS of real
// inactivity — whether that's from switching away or just sitting
// idle with the tab still open.
// ------------------------------------------------------------
const LAST_ACTIVITY_KEY = 'pin_lock_last_activity';
let lastWriteTime = 0;

function getLastActivity() {
  return parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
}

// Throttled — mousemove alone can fire dozens of times a second,
// and writing to localStorage on every single one would be wasteful
// and could visibly jank on lower-end phones. Once every 2 seconds
// is more than precise enough against a 3-minute threshold.
function markActivity(force) {
  const now = Date.now();
  if (force || now - lastWriteTime > 2000) {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    lastWriteTime = now;
  }
}

export function initPinLock() {
  if (!isPinSet()) return;

  // This is a multi-page app — every navigation is a full page
  // reload, and a fresh page load has no in-memory record of what
  // just happened on the previous page. Without checking real
  // elapsed time here, this would show the lock on every single
  // click between pages, not just after genuine inactivity.
  const elapsedSinceActivity = Date.now() - getLastActivity();
  if (elapsedSinceActivity > LOCK_GRACE_MS) {
    showLock();
  }
  markActivity(); // this page load itself counts as activity, checked above BEFORE this line updates it

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
    if (!document.hidden && !alreadyLocked && (Date.now() - getLastActivity()) > LOCK_GRACE_MS) {
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
  let consecutiveFails = 0;

  input.addEventListener('input', async () => {
    updateDots(input.value.length);
    if (input.value.length < 4) return;

    const ok = await verifyPin(input.value);
    if (ok) {
      consecutiveFails = 0;
      markActivity(true);
      flashSuccess();
      setTimeout(hideLock, 280);
    } else {
      consecutiveFails++;
      if (error) error.style.display = 'block';
      shakeDots();
      setTimeout(() => { input.value = ''; updateDots(0); }, 300);

      if (consecutiveFails >= 3) {
        consecutiveFails = 0; // so a further 3 fails triggers again, not just once ever
        captureIntruderPhoto(); // fire-and-forget — never block or delay the UI on this
      }
    }
  });
}