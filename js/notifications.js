// ============================================================
// notifications.js - Daily Reminder Notifications
// Handles: permission request, scheduling morning + evening
// reminders for habits, journal, and tasks.
// Uses setTimeout-based scheduling (works while app is open)
// and stores schedule in localStorage for persistence.
// ============================================================

// ----------------------------------------------------------
// NOTIFICATION MESSAGES
// Morning = habits + tasks focus
// Evening = journal + habits wrap-up
// ----------------------------------------------------------
const MORNING_MESSAGES = [
  { title: '🌅 Good Morning, Maestro!', body: 'Start strong — check your habits and tasks for today. You\'ve got this! 💪', url: '/habits.html' },
  { title: '☀️ Rise & Shine!', body: 'Your habits are waiting. A great day starts with great habits.', url: '/habits.html' },
  { title: '🙏 Morning Check-in', body: 'Before the day gets busy — review your tasks and set your intentions.', url: '/index.html' },
  { title: '💪 New Day, New Start!', body: 'Check your habits, review your tasks. Make today count, Maestro!', url: '/habits.html' },
  { title: '🌄 God\'s Mercies Are New Today', body: 'His mercies never come to an end. Start your day with purpose!', url: '/index.html' },
];

const EVENING_MESSAGES = [
  { title: '🌙 Evening Reflection', body: 'How was your day? Take a moment to journal your thoughts and mark your habits done.', url: '/journal.html' },
  { title: '📖 Time to Journal', body: 'Your thoughts deserve to be written down. How are you feeling tonight, Maestro?', url: '/journal.html' },
  { title: '✅ Wrap Up Your Day', body: 'Check off your habits and write a quick journal entry before bed.', url: '/habits.html' },
  { title: '🌟 Evening Check-in', body: 'Reflect on your wins today. Don\'t forget to log your habits!', url: '/journal.html' },
  { title: '🙏 Gratitude Time', body: 'What are you grateful for today? Journal it and close out your habits.', url: '/journal.html' },
];

// ----------------------------------------------------------
// REQUEST NOTIFICATION PERMISSION
// ----------------------------------------------------------
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// ----------------------------------------------------------
// GET RANDOM MESSAGE
// ----------------------------------------------------------
function getRandomMessage(messages) {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return messages[dayOfYear % messages.length];
}

// ----------------------------------------------------------
// SHOW NOTIFICATION
// ----------------------------------------------------------
function showNotification(msg) {
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: msg.title,
      body: msg.body,
      url: msg.url
    });
  } else {
    // Fallback: direct notification
    new Notification(msg.title, {
      body: msg.body,
      icon: '/icon-192.png',
      tag: 'mydiary-reminder'
    });
  }
}

// ----------------------------------------------------------
// SCHEDULE DAILY NOTIFICATIONS
// Calculates ms until next 7am and 8pm, sets timeouts
// Re-schedules itself every 24h
// ----------------------------------------------------------
export function scheduleDailyNotifications() {
  if (Notification.permission !== 'granted') return;

  const now = new Date();

  // Calculate next 7:00 AM
  const morning = new Date(now);
  morning.setHours(7, 0, 0, 0);
  if (morning <= now) morning.setDate(morning.getDate() + 1);

  // Calculate next 8:00 PM
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  if (evening <= now) evening.setDate(evening.getDate() + 1);

  const msToMorning = morning - now;
  const msToEvening = evening - now;

  console.log(`MyDiary: Morning notification in ${Math.round(msToMorning/1000/60)} mins`);
  console.log(`MyDiary: Evening notification in ${Math.round(msToEvening/1000/60)} mins`);

  // Schedule morning
  setTimeout(() => {
    showNotification(getRandomMessage(MORNING_MESSAGES));
    // Re-schedule for next day
    setTimeout(() => scheduleDailyNotifications(), 1000);
  }, msToMorning);

  // Schedule evening
  setTimeout(() => {
    showNotification(getRandomMessage(EVENING_MESSAGES));
  }, msToEvening);

  // Save schedule state
  localStorage.setItem('notifications_scheduled', new Date().toDateString());
}

// ----------------------------------------------------------
// INIT NOTIFICATIONS
// Called from index.html on login
// ----------------------------------------------------------
export async function initNotifications() {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Only reschedule if not already scheduled today
  const lastScheduled = localStorage.getItem('notifications_scheduled');
  const today = new Date().toDateString();

  if (lastScheduled !== today) {
    scheduleDailyNotifications();
  }

  return true;
}

// ----------------------------------------------------------
// NOTIFICATION SETTINGS UI HELPERS
// ----------------------------------------------------------
export function getNotificationStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
}
