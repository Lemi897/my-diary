// ============================================================
// utils.js - Shared utility functions
// Used across all modules. Import what you need per page.
// Never put page-specific logic here, keep it generic.
// ============================================================


// ------------------------------------------------------------
// DATE AND TIME UTILITIES
// Supports: formatting dates, getting today, week, month range
// ------------------------------------------------------------

// Returns today's date as YYYY-MM-DD string
export function todayDate() {
  return new Date().toISOString().split('T')[0];
}

// Formats a date string or Date object to a readable format
// Example: "2026-04-19" => "Sunday, 19 April 2026"
export function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Returns short date like "19 Apr 2026"
export function formatDateShort(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Returns current time as HH:MM string
export function currentTime() {
  return new Date().toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Returns start and end dates of the current week (Mon - Sun)
export function currentWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0]
  };
}

// Returns start and end dates of the current month
export function currentMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}


// ------------------------------------------------------------
// CURRENCY UTILITIES
// Supports: KSH default, live conversion from USD/EUR/GBP etc
// Exchange rates fetched from open.er-api.com (free, no key)
// Cached in localStorage for offline use
// ------------------------------------------------------------

// Fetches and caches exchange rates (runs once per day)
export async function fetchExchangeRates() {
  const cached = localStorage.getItem('exchange_rates');
  const cachedDate = localStorage.getItem('exchange_rates_date');
  const today = todayDate();

  // Use cached rates if fetched today
  if (cached && cachedDate === today) {
    return JSON.parse(cached);
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KES');
    const data = await res.json();
    if (data && data.rates) {
      localStorage.setItem('exchange_rates', JSON.stringify(data.rates));
      localStorage.setItem('exchange_rates_date', today);
      return data.rates;
    }
  } catch (err) {
    console.warn('Exchange rate fetch failed, using cached or default.', err);
  }

  // Fallback: return cached even if old
  return cached ? JSON.parse(cached) : null;
}

// Converts any amount in a given currency to KSH
// Usage: convertToKSH(10, 'USD') => amount in KSH
export async function convertToKSH(amount, currency) {
  if (currency === 'KSH' || currency === 'KES') return parseFloat(amount);
  const rates = await fetchExchangeRates();
  if (!rates || !rates[currency]) {
    console.warn(`No rate found for ${currency}, returning original amount.`);
    return parseFloat(amount);
  }
  // rates are relative to KES base
  return parseFloat((amount / rates[currency]).toFixed(2));
}

// Formats a number as KSH currency string
// Example: 1500 => "KSH 1,500.00"
export function formatKSH(amount) {
  return `KSH ${parseFloat(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}


// ------------------------------------------------------------
// OFFLINE DETECTION
// Supports: detecting online/offline status across all pages
// Used by the offline indicator badge in the navbar
// ------------------------------------------------------------

// Returns true if device is online
export function isOnline() {
  return navigator.onLine;
}

// Calls a callback whenever online/offline status changes
// Usage: onConnectivityChange((