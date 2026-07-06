// ============================================================
// habits.js — Habits page logic
// Handles: loading habits, toggling done, target tracking,
//           add/edit/delete modals, category filtering, streak calc
// Imports from: utils.js, scripture.js, supabase.js
// ============================================================

import { supabase } from './supabase.js';
import {
  todayDate,
  formatDate,
  isOnline,
  onConnectivityChange,
  replayOfflineQueue,
  showToast,
  sanitize,
  loaderProgress,
  hideLoader,
  updateOnlineBadge,
  capitalize
} from './utils.js';
import { getVerseFromLibrary } from './scripture.js';


// ============================================================
// SECTION: STATE
// Module-level variables shared across all functions
// ============================================================

let userId     = null;
let allHabits  = [];
let todayLogs  = {};
let activeCategory  = 'all';
let editingHabitId  = null;
const today = todayDate();


// ============================================================
// SECTION: AUTH CHECK
// Runs immediately — redirects to login if no session
// ============================================================

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
    return;
  }
  document.getElementById('authGate').style.display = '';
})();


// ============================================================
// SECTION: ONLINE / OFFLINE BADGE SETUP
// Syncs offline queue when connection returns
// ============================================================

updateOnlineBadge(isOnline());
onConnectivityChange(async (online) => {
  updateOnlineBadge(online);
  if (online) {
    const result = await replayOfflineQueue();
    if (result && result.replayed > 0) {
      showToast(`✅ ${result.replayed} offline action(s) synced.`, 'success');
    }
  }
});


// ============================================================
// SECTION: DATE LABEL
// Shows today's full date at the top of the habits page
// ============================================================

document.getElementById('todayLabel').textContent = formatDate(today);


// ============================================================
// SECTION: SCRIPTURE VERSE
// Loads a habits-themed verse into the page banner
// ============================================================

function loadHabitScripture() {
  const verse = getVerseFromLibrary('habits');
  document.getElementById('habitScripture').textContent    = `"${verse.text}"`;
  document.getElementById('habitScriptureRef').textContent = verse.ref;
}


// ============================================================
// SECTION: CATEGORY BADGE CLASS HELPER
// Maps category name → CSS class for color-coded badges
// ============================================================

function getCatClass(category) {
  const map = {
    'Health & Body':          'cat-health',
    'Mind & Learning':        'cat-mind',
    'Personal & Private':     'cat-private',
    'Finance':                'cat-finance',
    'Social & Relationships': 'cat-social',
    'Work & Productivity':    'cat-work',
    'Spiritual':              'cat-spiritual',
    'Creative':               'cat-creative',
    'Other':                  'cat-other'
  };
  return map[category] || 'cat-other';
}


// ============================================================
// SECTION: LOAD HABITS & LOGS
// Fetches all habits + today's logs from Supabase in parallel
// ============================================================

async function loadHabits() {
  const [habitsRes, logsRes] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('habit_logs').select('*').eq('user_id', userId).eq('log_date', today)
  ]);

  if (habitsRes.error) { showToast('Failed to load habits.', 'error'); return; }

  allHabits = habitsRes.data || [];

  // Map logs by habit_id for quick lookup
  todayLogs = {};
  (logsRes.data || []).forEach(log => {
    todayLogs[log.habit_id] = log;
  });

  renderHabits();
  updateSummary();
}


// ============================================================
// SECTION: STREAK CALCULATOR
// Counts consecutive days done up to today for a given habit
// ============================================================

async function calculateHabitStreak(habitId) {
  const { data, error } = await supabase
    .from('habit_logs')
    .select('log_date, done')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .eq('done', true)
    .order('log_date', { ascending: false })
    .limit(60);

  if (error || !data || data.length === 0) return 0;

  let streak = 0;
  const check = new Date(today);

  for (let i = 0; i < data.length; i++) {
    const logDate  = data[i].log_date;
    const checkStr = check.toISOString().split('T')[0];
    if (logDate === checkStr) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}


// ============================================================
// SECTION: RENDER HABITS LIST
// Filters by active category and builds each habit card
// ============================================================

function renderHabits() {
  const list = document.getElementById('habitsList');

  const filtered = activeCategory === 'all'
    ? allHabits
    : allHabits.filter(h => h.category === activeCategory);

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <p>No habits in this category yet.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(habit => {
    const log          = todayLogs[habit.id];
    const isDone       = log?.done || false;
    const currentValue = log?.value || 0;

    return `
      <div class="habit-card" data-id="${habit.id}">

        <!-- Done toggle button -->
        <button class="habit-toggle ${isDone ? 'done' : ''}"
          data-id="${habit.id}" data-type="${habit.tracking_type}"
          onclick="toggleHabit('${habit.id}', '${habit.tracking_type}')">
          ${isDone ? '<i class="ri-check-line"></i>' : ''}
        </button>

        <!-- Habit info -->
        <div class="habit-info">
          <div class="habit-name ${isDone ? 'text-muted' : ''}"
            style="${isDone ? 'text-decoration:line-through;' : ''}">
            ${habit.name}
          </div>
          <div class="habit-meta">
            <span class="badge ${getCatClass(habit.category)}">${sanitize(habit.category)}</span>
            ${habit.tracking_type === 'target'
              ? `<span>${currentValue} / ${sanitize(String(habit.target_value))} ${sanitize(habit.target_unit || '')}</span>`
              : ''}
            ${habit.streak > 0 ? `<span style="color:#f0c040;font-weight:700;">🔥 ${habit.streak} day${habit.streak === 1 ? '' : 's'}</span>` : ''}
          </div>

          <!-- Target input row (only for target-type habits) -->
          ${habit.tracking_type === 'target' ? `
            <div class="habit-target-row">
              <input type="number" class="habit-target-input"
                id="targetInput_${habit.id}"
                value="${currentValue}"
                min="0" max="${habit.target_value}"
                onchange="updateTargetValue('${habit.id}', this.value, ${habit.target_value})"
              />
              <span class="habit-target-label">
                / ${sanitize(String(habit.target_value))} ${sanitize(habit.target_unit || '')}
              </span>
              <div class="progress-bar-wrapper" style="flex:1;">
                <div class="progress-bar-fill"
                  style="width:${Math.min((currentValue / habit.target_value) * 100, 100)}%">
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Edit and delete actions -->
        <div class="habit-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${habit.id}')">
            <i class="ri-edit-line"></i>
          </button>
          <button class="btn btn-ghost btn-sm" onclick="deleteHabit('${habit.id}')">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>

      </div>
    `;
  }).join('');
}


// ============================================================
// SECTION: SUMMARY STATS
// Recalculates done count, total, and completion rate bar
// ============================================================

function updateSummary() {
  const total = allHabits.length;
  const done  = allHabits.filter(h => todayLogs[h.id]?.done).length;
  const rate  = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('doneCount').textContent       = done;
  document.getElementById('totalCount').textContent      = total;
  document.getElementById('completionRate').textContent  = `${rate}%`;
}


// ============================================================
// SECTION: TOGGLE HABIT (done-type habits)
// Creates or updates a habit_log for today on toggle click
// ============================================================

window.toggleHabit = async function(habitId, trackingType) {
  if (trackingType === 'target') return; // target habits use number input

  const existing = todayLogs[habitId];
  const newDone  = !(existing?.done || false);

  if (existing) {
    const { error } = await supabase
      .from('habit_logs').update({ done: newDone }).eq('id', existing.id);
    if (error) { showToast('Failed to update habit.', 'error'); return; }
    todayLogs[habitId].done = newDone;
  } else {
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ user_id: userId, habit_id: habitId, log_date: today, done: newDone })
      .select().single();
    if (error) { showToast('Failed to log habit.', 'error'); return; }
    todayLogs[habitId] = data;
  }

  renderHabits();
  updateSummary();

  if (newDone) {
    const verse = getVerseFromLibrary('habits');
    showToast(`💪 "${verse.text.substring(0, 55)}..." — ${verse.ref}`, 'success');
  }
};


// ============================================================
// SECTION: UPDATE TARGET VALUE (target-type habits)
// Saves numeric progress and marks done when target is hit
// ============================================================

window.updateTargetValue = async function(habitId, value, targetValue) {
  const numVal  = parseInt(value) || 0;
  const isDone  = numVal >= parseInt(targetValue);
  const existing = todayLogs[habitId];

  if (existing) {
    const { error } = await supabase
      .from('habit_logs').update({ value: numVal, done: isDone }).eq('id', existing.id);
    if (error) { showToast('Failed to update progress.', 'error'); return; }
    todayLogs[habitId].value = numVal;
    todayLogs[habitId].done  = isDone;
  } else {
    const { data, error } = await supabase
      .from('habit_logs')
      .insert({ user_id: userId, habit_id: habitId, log_date: today, value: numVal, done: isDone })
      .select().single();
    if (error) { showToast('Failed to log progress.', 'error'); return; }
    todayLogs[habitId] = data;
  }

  renderHabits();
  updateSummary();
  if (isDone) showToast('Target reached! 🎉', 'success');
};


// ============================================================
// SECTION: ADD HABIT MODAL
// Opens blank modal for creating a new habit
// ============================================================

document.getElementById('addHabitBtn').addEventListener('click', () => {
  editingHabitId = null;
  document.getElementById('modalTitle').textContent          = 'Add Habit';
  document.getElementById('habitName').value                 = '';
  document.getElementById('habitCategory').value             = 'Health & Body';
  document.getElementById('habitTrackingType').value         = 'done';
  document.getElementById('habitTargetValue').value          = '';
  document.getElementById('habitTargetUnit').value           = '';
  document.getElementById('targetFields').classList.add('hidden');
  document.getElementById('habitModal').classList.add('open');
});

// Show/hide target fields based on tracking type
document.getElementById('habitTrackingType').addEventListener('change', (e) => {
  const targetFields = document.getElementById('targetFields');
  e.target.value === 'target'
    ? targetFields.classList.remove('hidden')
    : targetFields.classList.add('hidden');
});

// Close modal on X button
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('habitModal').classList.remove('open');
});

// Close modal on backdrop click
document.getElementById('habitModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('habitModal')) {
    document.getElementById('habitModal').classList.remove('open');
  }
});


// ============================================================
// SECTION: SAVE HABIT (add or edit)
// Inserts or updates a habit record in Supabase
// ============================================================

document.getElementById('saveHabitBtn').addEventListener('click', async () => {
  const name         = document.getElementById('habitName').value.trim();
  const category     = document.getElementById('habitCategory').value;
  const trackingType = document.getElementById('habitTrackingType').value;
  const targetValue  = parseInt(document.getElementById('habitTargetValue').value) || null;
  const targetUnit   = document.getElementById('habitTargetUnit').value.trim() || null;

  if (!name) { showToast('Please enter a habit name.', 'warning'); return; }
  if (trackingType === 'target' && !targetValue) {
    showToast('Please enter a target value.', 'warning'); return;
  }

  const payload = { name, category, tracking_type: trackingType, target_value: targetValue, target_unit: targetUnit };

  if (editingHabitId) {
    const { error } = await supabase.from('habits').update(payload).eq('id', editingHabitId);
    if (error) { showToast('Failed to update habit.', 'error'); return; }
    showToast('Habit updated.', 'success');
  } else {
    const { error } = await supabase.from('habits').insert({ ...payload, user_id: userId });
    if (error) { showToast('Failed to save habit.', 'error'); return; }
    showToast('Habit added! 💪', 'success');
  }

  document.getElementById('habitModal').classList.remove('open');
  loadHabits();
});


// ============================================================
// SECTION: EDIT HABIT MODAL
// Prefills modal with existing habit data for editing
// ============================================================

window.openEditModal = function(habitId) {
  const habit = allHabits.find(h => h.id === habitId);
  if (!habit) return;

  editingHabitId = habitId;
  document.getElementById('modalTitle').textContent      = 'Edit Habit';
  document.getElementById('habitName').value             = habit.name;
  document.getElementById('habitCategory').value         = habit.category;
  document.getElementById('habitTrackingType').value     = habit.tracking_type;
  document.getElementById('habitTargetValue').value      = habit.target_value || '';
  document.getElementById('habitTargetUnit').value       = habit.target_unit || '';

  habit.tracking_type === 'target'
    ? document.getElementById('targetFields').classList.remove('hidden')
    : document.getElementById('targetFields').classList.add('hidden');

  document.getElementById('habitModal').classList.add('open');
};


// ============================================================
// SECTION: DELETE HABIT
// Removes habit and all its logs from Supabase
// ============================================================

window.deleteHabit = async function(habitId) {
  if (!confirm('Delete this habit and all its history?')) return;
  const { error } = await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId);
  if (error) { showToast('Failed to delete habit.', 'error'); return; }
  showToast('Habit deleted.', 'info');
  loadHabits();
};


// ============================================================
// SECTION: CATEGORY FILTER TABS
// Filters the habit list by the selected category tab
// ============================================================

document.getElementById('categoryTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.category-tab');
  if (!tab) return;
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeCategory = tab.dataset.cat;
  renderHabits();
});


// ============================================================
// SECTION: INIT
// Entry point — gets session, loads page data, hides loader
// ============================================================

async function init() {
  const { data: { session: _s } } = await supabase.auth.getSession();
  userId = _s?.user?.id;
  if (!userId) { window.location.replace('login.html'); return; }

  loaderProgress(20, 'Loading habits...');
  loadHabitScripture();
  await loadHabits();
  loaderProgress(100, 'Ready!');
  setTimeout(hideLoader, 300);
}

init();
