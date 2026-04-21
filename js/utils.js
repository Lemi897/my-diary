// utils.js - Shared utility functions

export function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-KE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

export function formatDateShort(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

export function currentTime() {
  return new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

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

export function currentMonthRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

export async function fetchExchangeRates() {
  const cached = localStorage.getItem('exchange_rates');
  const cachedDate = localStorage.getItem('exchange_rates_date');
  const today = todayDate();
  if (cached && cachedDate === today) return JSON.parse(cached);
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/KES');
    const data = await res.json();
    if (data && data.rates) {
      localStorage.setItem('exchange_rates', JSON.stringify(data.rates));
      localStorage.setItem('exchange_rates_date', today);
      return data.rates;
    }
  } catch (err) {
    console.warn('Exchange rate fetch failed.', err);
  }
  return cached ? JSON.parse(cached) : null;
}

export async function convertToKSH(amount, currency) {
  if (currency === 'KSH' || currency === 'KES') return parseFloat(amount);
  const rates = await fetchExchangeRates();
  if (!rates || !rates[currency]) return parseFloat(amount);
  return parseFloat((amount / rates[currency]).toFixed(2));
}

export function formatKSH(amount) {
  return 'KSH ' + parseFloat(amount).toLocaleString('en-KE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

export function isOnline() {
  return navigator.onLine;
}

export function onConnectivityChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

export function queueOfflineAction(table, action, data) {
  const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
  queue.push({ table, action, data, timestamp: new Date().toISOString() });
  localStorage.setItem('offline_queue', JSON.stringify(queue));
}

export function getOfflineQueue() {
  return JSON.parse(localStorage.getItem('offline_queue') || '[]');
}

export function clearOfflineQueue() {
  localStorage.removeItem('offline_queue');
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str, maxLength = 50) {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}
