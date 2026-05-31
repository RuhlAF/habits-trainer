(function () {
  "use strict";

  const STORAGE_KEY = "habits-trainer-state-v1";
  const REMINDER_CHECK_MS = 30000;

  const quoteVoices = [
    "Aristotle",
    "Marcus Aurelius",
    "Epictetus",
    "Seneca",
    "Confucius",
    "Lao Tzu",
    "Benjamin Franklin",
    "Ralph Waldo Emerson",
    "Henry David Thoreau",
    "Frederick Douglass",
    "William James",
    "Horace",
    "Cicero",
    "Plutarch",
    "Socrates",
    "Plato",
    "Leonardo da Vinci",
    "Michelangelo",
    "Florence Nightingale",
    "Booker T. Washington",
    "Abraham Lincoln",
    "Harriet Tubman",
    "Mary Wollstonecraft",
    "Eleanor Roosevelt"
  ];
  const quoteFrames = [
    "Begin today with",
    "Build momentum through",
    "Keep faith with",
    "Let progress come from",
    "Strengthen tomorrow with",
    "Return calmly to"
  ];
  const quoteThemes = [
    "one honest step",
    "a promise you can keep",
    "steady practice",
    "the smallest useful action",
    "a clear choice repeated",
    "patience with the process",
    "work done before it is easy",
    "attention to what matters",
    "courage in a quiet form",
    "the next right action",
    "discipline made gentle",
    "a start that is small enough",
    "progress you can repeat",
    "care for your future self",
    "the work already in front of you",
    "a minute of real effort",
    "the habit you are becoming",
    "a useful rhythm",
    "a choice made on purpose",
    "a return after interruption",
    "the strength to begin again",
    "a little more consistency",
    "your best available effort",
    "the practice that compounds",
    "small proof of commitment",
    "calm persistence",
    "attention before ambition",
    "a steady hand on the day",
    "action before applause",
    "the courage to continue",
    "a routine that serves you",
    "the next kept promise",
    "effort without drama",
    "the patience to repeat",
    "a simple win",
    "movement in the right direction",
    "the discipline of showing up",
    "the first useful minute",
    "practice over perfection",
    "a clear beginning",
    "the strength of repetition",
    "one choice aligned with your goal",
    "a habit made visible",
    "the work of becoming",
    "a small act of respect",
    "the day you can influence",
    "a steady pace",
    "the lesson in the repeat",
    "one action before comfort",
    "a clean restart",
    "the confidence of follow-through",
    "the good you can do now",
    "a promise renewed",
    "a quiet standard",
    "the next deliberate step",
    "a little useful pressure",
    "the power of returning",
    "the proof inside the action",
    "the habit before the mood",
    "a path made by walking",
    "the practice that shapes you"
  ];
  const quotes = buildQuoteDeck();

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const defaultState = {
    habits: [],
    settings: {
      notificationsEnabled: false,
      notified: {}
    }
  };

  let state = loadState();
  let deferredInstallPrompt = null;
  let reminderTimer = null;

  const elements = {
    todayLabel: document.getElementById("todayLabel"),
    todayRate: document.getElementById("todayRate"),
    todayDone: document.getElementById("todayDone"),
    activeHabits: document.getElementById("activeHabits"),
    dueCount: document.getElementById("dueCount"),
    todayHabits: document.getElementById("todayHabits"),
    todayEmpty: document.getElementById("todayEmpty"),
    allCount: document.getElementById("allCount"),
    allHabits: document.getElementById("allHabits"),
    allEmpty: document.getElementById("allEmpty"),
    dailyQuoteText: document.getElementById("dailyQuoteText"),
    dailyQuoteAuthor: document.getElementById("dailyQuoteAuthor"),
    habitForm: document.getElementById("habitForm"),
    customDays: document.getElementById("customDays"),
    notificationPanel: document.getElementById("notificationPanel"),
    notificationStatus: document.getElementById("notificationStatus"),
    enableNotificationsButton: document.getElementById("enableNotificationsButton"),
    installButton: document.getElementById("installButton"),
    template: document.getElementById("habitCardTemplate")
  };

  init();

  function init() {
    seedFirstRun();
    bindEvents();
    registerServiceWorker();
    startReminderLoop();
    render();
  }

  function seedFirstRun() {
    if (state.habits.length > 0) {
      return;
    }

    const today = dateKey(new Date());
    state.habits = [
      createHabit({
        name: "Drink water",
        reminderTime: "09:00",
        frequency: { type: "daily", days: [] },
        color: "#2f7d6d",
        createdAt: today
      }),
      createHabit({
        name: "Evening reflection",
        reminderTime: "20:30",
        frequency: { type: "weekdays", days: [] },
        color: "#6f5aa8",
        createdAt: today
      })
    ];
    saveState();
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    document.querySelectorAll("input[name='frequency']").forEach((radio) => {
      radio.addEventListener("change", () => {
        elements.customDays.hidden = getSelectedFrequency() !== "custom";
      });
    });

    elements.habitForm.addEventListener("submit", handleAddHabit);
    elements.enableNotificationsButton.addEventListener("click", enableNotifications);
    elements.installButton.addEventListener("click", installApp);

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      elements.installButton.hidden = false;
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        maybeSendReminders();
      }
    });
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("sw.js?v=20");
      await registration.update();
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  }

  function startReminderLoop() {
    if (reminderTimer) {
      window.clearInterval(reminderTimer);
    }

    reminderTimer = window.setInterval(maybeSendReminders, REMINDER_CHECK_MS);
    maybeSendReminders();
  }

  function handleAddHabit(event) {
    event.preventDefault();

    const formData = new FormData(elements.habitForm);
    const name = String(formData.get("habitName") || "").trim();
    const reminderTime = String(formData.get("habitTime") || "08:00");
    const type = String(formData.get("frequency") || "daily");
    const color = String(formData.get("color") || "#2f7d6d");
    const days = formData.getAll("day").map((value) => Number(value));

    if (!name) {
      return;
    }

    if (type === "custom" && days.length === 0) {
      elements.customDays.hidden = false;
      return;
    }

    state.habits.unshift(createHabit({
      name,
      reminderTime,
      frequency: { type, days },
      color,
      createdAt: dateKey(new Date())
    }));

    saveState();
    elements.habitForm.reset();
    document.getElementById("habitTime").value = "08:00";
    elements.customDays.hidden = true;
    setView("all");
    render();
  }

  function createHabit(input) {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      name: input.name,
      reminderTime: input.reminderTime,
      frequency: input.frequency,
      color: input.color,
      createdAt: input.createdAt,
      completions: {}
    };
  }

  function setView(viewName) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === viewName);
    });
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("is-active", view.id === `${viewName}View`);
    });
  }

  function render() {
    renderDate();
    renderDailyQuote();
    renderSummary();
    renderToday();
    renderAll();
    renderNotificationStatus();
  }

  function renderDate() {
    elements.todayLabel.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(new Date());
  }

  function renderDailyQuote() {
    const quote = quoteForDate(dateKey(new Date()));
    elements.dailyQuoteText.textContent = `"${quote.text}"`;
    elements.dailyQuoteAuthor.textContent = `- ${quote.author}`;
  }

  function renderSummary() {
    const today = dateKey(new Date());
    const dueToday = state.habits.filter((habit) => isDueOn(habit, today));
    const keptToday = dueToday.filter((habit) => Boolean(habit.completions[today]));
    const todayRate = dueToday.length ? Math.round((keptToday.length / dueToday.length) * 100) : 0;

    elements.todayRate.textContent = `${todayRate}%`;
    elements.todayDone.textContent = `${keptToday.length} of ${dueToday.length} kept`;
    elements.activeHabits.textContent = String(state.habits.length);
  }

  function renderToday() {
    const today = dateKey(new Date());
    const dueToday = state.habits.filter((habit) => isDueOn(habit, today));
    const remainingToday = dueToday.filter((habit) => !habit.completions[today]);

    elements.dueCount.textContent = `${remainingToday.length} left`;
    elements.todayHabits.innerHTML = "";
    elements.todayEmpty.hidden = dueToday.length > 0;

    dueToday.forEach((habit) => {
      const card = buildHabitCard(habit, today);
      elements.todayHabits.appendChild(card);
    });
  }

  function renderAll() {
    const today = dateKey(new Date());

    elements.allCount.textContent = `${state.habits.length} active`;
    elements.allHabits.innerHTML = "";
    elements.allEmpty.hidden = state.habits.length > 0;

    state.habits.forEach((habit) => {
      const card = buildHabitCard(habit, today);
      elements.allHabits.appendChild(card);
    });
  }

  function buildHabitCard(habit, today) {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".habit-card");
    const title = fragment.querySelector("h3");
    const meta = fragment.querySelector(".habit-meta");
    const keepButton = fragment.querySelector(".keep-button");
    const removeButton = fragment.querySelector(".text-button");
    const gauge = fragment.querySelector(".score-gauge");
    const gaugeNeedle = gauge.querySelector(".gauge-needle-group");
    const gaugeStreak = gauge.querySelector(".gauge-streak");
    const formationStage = fragment.querySelector(".formation-stage");
    const bestStreak = fragment.querySelector(".best-streak");
    const historyGrid = fragment.querySelector(".history-grid");
    const score = getHabitScore(habit);
    const isDueToday = isDueOn(habit, today);
    const isKept = Boolean(habit.completions[today]);

    card.style.setProperty("--accent", habit.color);
    gaugeNeedle.setAttribute("transform", `rotate(${score.score * 1.8} 60 62)`);
    gaugeStreak.textContent = String(score.currentStreak);
    title.textContent = habit.name;
    meta.textContent = `${frequencyLabel(habit.frequency)} at ${formatTime(habit.reminderTime)}`;
    formationStage.textContent = formationLabel(score.score);
    bestStreak.textContent = pluralDays(score.bestStreak);
    renderHabitHistory(historyGrid, habit);
    keepButton.textContent = isDueToday ? (isKept ? "Kept Today" : "Mark Kept") : "Not Due Today";
    keepButton.disabled = !isDueToday;
    keepButton.classList.toggle("is-kept", isKept);
    keepButton.addEventListener("click", () => toggleCompletion(habit.id, today));
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => removeHabit(habit.id));

    return fragment;
  }

  function renderHabitHistory(grid, habit) {
    grid.innerHTML = "";

    lastNDates(28).forEach((key) => {
      const dot = document.createElement("span");
      dot.className = "history-dot";
      dot.title = `${formatDate(key)}: ${isScheduledOn(habit, key) ? (habit.completions[key] ? "kept" : "not kept") : "rest"}`;
      dot.classList.toggle("is-due", isScheduledOn(habit, key));
      dot.classList.toggle("is-kept", Boolean(habit.completions[key]));
      grid.appendChild(dot);
    });
  }

  function renderNotificationStatus() {
    if (!("Notification" in window)) {
      elements.notificationStatus.textContent = "Notifications are not available in this browser.";
      elements.enableNotificationsButton.disabled = true;
      return;
    }

    if (Notification.permission === "granted") {
      state.settings.notificationsEnabled = true;
      elements.notificationStatus.textContent = "Notifications are enabled for scheduled nudges.";
      elements.enableNotificationsButton.textContent = "Enabled";
      elements.enableNotificationsButton.disabled = true;
    } else if (Notification.permission === "denied") {
      state.settings.notificationsEnabled = false;
      elements.notificationStatus.textContent = "Notifications are blocked in browser settings.";
      elements.enableNotificationsButton.textContent = "Blocked";
      elements.enableNotificationsButton.disabled = true;
    } else {
      elements.notificationStatus.textContent = "Enable notifications for timely habit nudges.";
      elements.enableNotificationsButton.textContent = "Enable";
      elements.enableNotificationsButton.disabled = false;
    }

    saveState();
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    state.settings.notificationsEnabled = permission === "granted";
    saveState();
    renderNotificationStatus();
    maybeSendReminders();
  }

  async function maybeSendReminders() {
    if (!state.settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const now = new Date();
    const today = dateKey(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let changed = false;

    for (const habit of state.habits) {
      const notifyKey = `${habit.id}:${today}`;
      const reminderMinutes = timeToMinutes(habit.reminderTime);
      const shouldNotify = isDueOn(habit, today)
        && !habit.completions[today]
        && nowMinutes >= reminderMinutes
        && !state.settings.notified[notifyKey];

      if (!shouldNotify) {
        continue;
      }

      await showHabitNotification(habit, today);
      state.settings.notified[notifyKey] = new Date().toISOString();
      changed = true;
    }

    pruneNotifications(today);
    if (changed) {
      saveState();
    }
  }

  async function showHabitNotification(habit, today) {
    const quote = quoteForDate(today);
    const title = `Time for ${habit.name}`;
    const options = {
      body: `Habit: ${habit.name}\n"${quote.text}" - ${quote.author}`,
      badge: "icons/badge-96.png",
      icon: "icons/icon-192.png",
      tag: `habit-${habit.id}-${today}`,
      data: { url: "./index.html" },
      renotify: false
    };

    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      console.warn("Notification failed", error);
    }
  }

  function pruneNotifications(today) {
    const entries = Object.entries(state.settings.notified).filter(([key]) => key.endsWith(`:${today}`));
    state.settings.notified = Object.fromEntries(entries);
  }

  async function installApp() {
    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    elements.installButton.hidden = true;
  }

  function toggleCompletion(habitId, key) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) {
      return;
    }

    if (habit.completions[key]) {
      delete habit.completions[key];
    } else {
      habit.completions[key] = new Date().toISOString();
    }

    saveState();
    render();
  }

  function removeHabit(habitId) {
    state.habits = state.habits.filter((habit) => habit.id !== habitId);
    saveState();
    render();
  }

  function getHabitScore(habit) {
    const dueDates = lastNDates(28).filter((key) => isScheduledOn(habit, key));
    const keptCount = dueDates.filter((key) => Boolean(habit.completions[key])).length;
    const score = dueDates.length ? Math.round((keptCount / dueDates.length) * 100) : 0;

    return {
      score,
      currentStreak: getCurrentStreak(habit),
      bestStreak: getBestStreak(habit)
    };
  }

  function getCurrentStreak(habit) {
    let streak = 0;
    const today = dateKey(new Date());
    const dates = getDateRange(habit.createdAt, today).reverse();

    for (const key of dates) {
      if (key < habit.createdAt || !isDueOn(habit, key)) {
        continue;
      }

      if (habit.completions[key]) {
        streak += 1;
      } else if (key === today) {
        continue;
      } else {
        break;
      }
    }

    return streak;
  }

  function getBestStreak(habit) {
    let current = 0;
    let best = 0;
    const today = dateKey(new Date());

    getDateRange(habit.createdAt, today).forEach((key) => {
      if (!isDueOn(habit, key)) {
        return;
      }

      if (habit.completions[key]) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    });

    return best;
  }

  function isDueOn(habit, key) {
    if (key < habit.createdAt) {
      return false;
    }

    return isScheduledOn(habit, key);
  }

  function isScheduledOn(habit, key) {
    const date = parseDateKey(key);
    const day = date.getDay();
    const frequency = habit.frequency || { type: "daily", days: [] };

    if (frequency.type === "daily") {
      return true;
    }

    if (frequency.type === "weekdays") {
      return day >= 1 && day <= 5;
    }

    if (frequency.type === "custom") {
      return frequency.days.includes(day);
    }

    return true;
  }

  function frequencyLabel(frequency) {
    if (frequency.type === "weekdays") {
      return "Weekdays";
    }

    if (frequency.type === "custom") {
      return frequency.days
        .slice()
        .sort((a, b) => a - b)
        .map((day) => dayNames[day])
        .join(", ");
    }

    return "Daily";
  }

  function quoteForDate(key) {
    const dayIndex = Math.floor(parseDateKey(key).getTime() / 86400000);
    return quotes[dayIndex % quotes.length];
  }

  function buildQuoteDeck() {
    const deck = [];

    quoteThemes.forEach((theme, themeIndex) => {
      quoteFrames.forEach((frame, frameIndex) => {
        deck.push({
          text: `${frame} ${theme}.`,
          author: `Inspired by ${quoteVoices[(themeIndex + frameIndex) % quoteVoices.length]}`
        });
      });
    });

    return deck;
  }

  function scoreLabel(score) {
    if (score >= 90) {
      return "Automatic";
    }
    if (score >= 70) {
      return "Strong";
    }
    if (score >= 40) {
      return "Building";
    }
    return "Start";
  }

  function formationLabel(score) {
    if (score > 80) {
      return "Established";
    }
    if (score >= 25) {
      return "Forming";
    }
    return "New";
  }

  function lastNDates(count) {
    const dates = [];
    const today = new Date();

    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - index);
      dates.push(dateKey(date));
    }

    return dates;
  }

  function getDateRange(startKey, endKey) {
    const dates = [];
    const cursor = parseDateKey(startKey);
    const end = parseDateKey(endKey);

    while (cursor <= end) {
      dates.push(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatDate(key) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric"
    }).format(parseDateKey(key));
  }

  function formatTime(value) {
    const [hours, minutes] = value.split(":").map(Number);
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(2020, 0, 1, hours, minutes));
  }

  function timeToMinutes(value) {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function pluralDays(value) {
    return `${value} ${value === 1 ? "day" : "days"}`;
  }

  function getSelectedFrequency() {
    const selected = document.querySelector("input[name='frequency']:checked");
    return selected ? selected.value : "daily";
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return structuredClone(defaultState);
      }

      const parsed = JSON.parse(saved);
      return {
        ...structuredClone(defaultState),
        ...parsed,
        settings: {
          ...defaultState.settings,
          ...(parsed.settings || {})
        }
      };
    } catch (error) {
      console.warn("State load failed", error);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
})();
