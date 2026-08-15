// Daily Habit Tracker
// Simple localStorage-backed app for tracking daily habits and streaks.

const STORAGE_KEY = 'daily-habit-tracker-v1';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const state = loadState();
let editingHabitId = null;

const habitForm = document.getElementById('habitForm');
const habitNameInput = document.getElementById('habitName');
const habitCategoryInput = document.getElementById('habitCategory');
const habitTargetInput = document.getElementById('habitTarget');
const submitButton = document.getElementById('submitButton');
const cancelEditButton = document.getElementById('cancelEdit');
const formTitle = document.getElementById('formTitle');
const habitList = document.getElementById('habitList');
const habitCount = document.getElementById('habitCount');
const completionRate = document.getElementById('completionRate');
const completionProgress = document.getElementById('completionProgress');
const currentStreak = document.getElementById('currentStreak');
const longestStreak = document.getElementById('longestStreak');
const themeToggle = document.getElementById('themeToggle');

initializeApp();

function initializeApp() {
  applyTheme(state.theme);
  render();
  bindEvents();
}

function bindEvents() {
  habitForm.addEventListener('submit', handleHabitSubmit);

  themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(state.theme);
    saveState();
  });

  cancelEditButton.addEventListener('click', resetForm);

  habitList.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.action-btn.delete');
    const editButton = event.target.closest('.action-btn.edit');
    const dayToggle = event.target.closest('.day-toggle');

    if (deleteButton) {
      const habitId = deleteButton.dataset.id;
      deleteHabit(habitId);
      return;
    }

    if (editButton) {
      const habitId = editButton.dataset.id;
      populateEditForm(habitId);
      return;
    }

    if (dayToggle) {
      toggleHabitDate(dayToggle.dataset.id, dayToggle.dataset.date);
    }
  });
}

function handleHabitSubmit(event) {
  event.preventDefault();

  const name = habitNameInput.value.trim();
  const category = habitCategoryInput.value.trim() || 'General';
  const target = clampNumber(Number(habitTargetInput.value), 1, 10);

  if (!name) {
    habitNameInput.focus();
    return;
  }

  if (editingHabitId) {
    const habit = state.habits.find((item) => item.id === editingHabitId);
    if (!habit) {
      resetForm();
      return;
    }

    habit.name = name;
    habit.category = category;
    habit.target = target;
  } else {
    const newHabit = {
      id: createId(),
      name,
      category,
      target,
      completedDates: []
    };

    state.habits.unshift(newHabit);
  }

  saveState();
  render();
  resetForm();
}

function deleteHabit(habitId) {
  state.habits = state.habits.filter((habit) => habit.id !== habitId);
  saveState();

  if (editingHabitId === habitId) {
    resetForm();
  }

  render();
}

function populateEditForm(habitId) {
  const habit = state.habits.find((item) => item.id === habitId);

  if (!habit) {
    return;
  }

  editingHabitId = habitId;
  habitNameInput.value = habit.name;
  habitCategoryInput.value = habit.category;
  habitTargetInput.value = habit.target;
  formTitle.textContent = 'Edit habit';
  submitButton.textContent = 'Save changes';
  cancelEditButton.classList.remove('hidden');
  habitNameInput.focus();
}

function resetForm() {
  editingHabitId = null;
  habitForm.reset();
  habitTargetInput.value = 1;
  formTitle.textContent = 'Add a habit';
  submitButton.textContent = 'Add habit';
  cancelEditButton.classList.add('hidden');
}

function toggleHabitDate(habitId, dateKey) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) {
    return;
  }

  const existingIndex = habit.completedDates.indexOf(dateKey);

  if (existingIndex >= 0) {
    habit.completedDates.splice(existingIndex, 1);
  } else {
    habit.completedDates.push(dateKey);
  }

  saveState();
  render();
}

function render() {
  renderHabitList();
  renderStats();
}

function renderHabitList() {
  const weekDates = getCurrentWeekDates();

  if (state.habits.length === 0) {
    habitList.innerHTML = `
      <div class="empty-state">
        <p>No habits yet. Create your first routine to get started.</p>
      </div>
    `;
    habitCount.textContent = '0 habits';
    return;
  }

  const cards = state.habits
    .map((habit) => {
      const currentStreakValue = computeHabitStreak(habit);
      const longestValue = computeLongestHabitStreak(habit);
      const completedThisWeek = weekDates.filter((date) => habit.completedDates.includes(toDateKey(date))).length;

      const dayButtons = weekDates
        .map((date) => {
          const key = toDateKey(date);
          const isDone = habit.completedDates.includes(key);
          const isToday = key === toDateKey(new Date());
          const label = DAY_NAMES[date.getDay()];

          return `
            <button
              class="day-toggle ${isDone ? 'is-done' : ''} ${isToday ? 'is-today' : ''}"
              type="button"
              data-id="${habit.id}"
              data-date="${key}"
              aria-label="Toggle ${habit.name} on ${label} ${date.getDate()}"
              aria-pressed="${isDone}"
            >
              <span>${label}</span>
              <strong>${date.getDate()}</strong>
            </button>
          `;
        })
        .join('');

      return `
        <article class="habit-card">
          <div class="habit-head">
            <div class="habit-name-wrap">
              <span class="habit-tag">${escapeHtml(habit.category)}</span>
              <h3>${escapeHtml(habit.name)}</h3>
            </div>

            <div class="habit-actions">
              <button class="action-btn edit" type="button" data-id="${habit.id}">Edit</button>
              <button class="action-btn delete" type="button" data-id="${habit.id}">Delete</button>
            </div>
          </div>

          <div class="habit-meta">
            <span>Goal: ${habit.target}${habit.target === 1 ? 'x / day' : 'x / day'}</span>
            <span>Week: ${completedThisWeek}/${weekDates.length}</span>
            <span>Streak: ${currentStreakValue}d</span>
            <span>Best: ${longestValue}d</span>
          </div>

          <div class="week-grid">${dayButtons}</div>
        </article>
      `;
    })
    .join('');

  habitList.innerHTML = cards;
  habitCount.textContent = `${state.habits.length} ${state.habits.length === 1 ? 'habit' : 'habits'}`;
}

function renderStats() {
  const summary = computeSummaryStats();
  const completionPercentage = summary.completionPercent;

  completionRate.textContent = `${completionPercentage}%`;
  completionProgress.style.width = `${completionPercentage}%`;
  currentStreak.textContent = `${summary.currentStreak} ${summary.currentStreak === 1 ? 'day' : 'days'}`;
  longestStreak.textContent = `${summary.longestStreak} ${summary.longestStreak === 1 ? 'day' : 'days'}`;
}

function computeSummaryStats() {
  if (state.habits.length === 0) {
    return { completionPercent: 0, currentStreak: 0, longestStreak: 0 };
  }

  const completionMap = buildDailyCompletionMap();
  const current = computeCurrentStreak(completionMap);
  const longest = computeLongestStreak(completionMap);

  const totalHabits = state.habits.length;
  const todayKey = toDateKey(new Date());
  const completedToday = state.habits.filter((habit) => habit.completedDates.includes(todayKey)).length;
  const completionPercent = Math.round((completedToday / totalHabits) * 100);

  return {
    completionPercent: Number.isFinite(completionPercent) ? completionPercent : 0,
    currentStreak: current,
    longestStreak: longest
  };
}

function buildDailyCompletionMap() {
  const map = {};

  state.habits.forEach((habit) => {
    habit.completedDates.forEach((dateKey) => {
      map[dateKey] = true;
    });
  });

  return map;
}

function computeCurrentStreak(completionMap) {
  let count = 0;
  const current = new Date();
  current.setHours(0, 0, 0, 0);

  while (true) {
    const key = toDateKey(current);
    if (completionMap[key]) {
      count += 1;
      current.setDate(current.getDate() - 1);
      continue;
    }

    break;
  }

  return count;
}

function computeLongestStreak(completionMap) {
  const sortedDates = Object.keys(completionMap).sort();
  if (sortedDates.length === 0) {
    return 0;
  }

  let longest = 1;
  let currentRun = 1;

  for (let index = 1; index < sortedDates.length; index += 1) {
    const previousDate = new Date(`${sortedDates[index - 1]}T00:00:00`);
    const currentDate = new Date(`${sortedDates[index]}T00:00:00`);
    const differenceInDays = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return longest;
}

function computeHabitStreak(habit) {
  if (habit.completedDates.length === 0) {
    return 0;
  }

  const uniqueDays = [...new Set(habit.completedDates)].sort();
  let count = 0;
  let pointer = new Date();
  pointer.setHours(0, 0, 0, 0);

  while (true) {
    const key = toDateKey(pointer);
    if (uniqueDays.includes(key)) {
      count += 1;
      pointer.setDate(pointer.getDate() - 1);
      continue;
    }

    break;
  }

  return count;
}

function computeLongestHabitStreak(habit) {
  const uniqueDays = [...new Set(habit.completedDates)].sort();
  if (uniqueDays.length === 0) {
    return 0;
  }

  let longest = 1;
  let currentRun = 1;

  for (let index = 1; index < uniqueDays.length; index += 1) {
    const previousDate = new Date(`${uniqueDays[index - 1]}T00:00:00`);
    const currentDate = new Date(`${uniqueDays[index]}T00:00:00`);
    const differenceInDays = (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);

    if (differenceInDays === 1) {
      currentRun += 1;
      longest = Math.max(longest, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return longest;
}

function getCurrentWeekDates() {
  const today = new Date();
  const start = new Date(today);
  const dayOffset = (today.getDay() + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - dayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function loadState() {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (!storedValue) {
    return {
      theme: 'dark',
      habits: []
    };
  }

  try {
    const parsed = JSON.parse(storedValue);
    return {
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      habits: Array.isArray(parsed.habits) ? parsed.habits : []
    };
  } catch (error) {
    console.warn('Unable to parse saved habit tracker state.', error);
    return {
      theme: 'dark',
      habits: []
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function applyTheme(themeValue) {
  const isLight = themeValue === 'light';
  document.body.classList.toggle('light', isLight);
  themeToggle.innerHTML = isLight ? '<span class="toggle-icon">☀️</span>' : '<span class="toggle-icon">🌙</span>';
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
