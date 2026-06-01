(function () {
  "use strict";

  const STORAGE_KEY = "habits-trainer-state-v1";
  const STATE_SCHEMA_VERSION = 2;
  const QUOTE_SHUFFLE_SEED = 20260531;
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
    "Return calmly to",
    "Make room today for",
    "Give your attention to",
    "Let the day be shaped by",
    "Choose again through",
    "Trust the compounding of",
    "Anchor your effort in",
    "Meet the moment with",
    "Turn intention into",
    "Let confidence grow from",
    "Protect your progress with",
    "Carry yourself forward through"
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
  const quotes = shuffleQuoteDeck(buildQuoteDeck());

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const defaultState = {
    schemaVersion: STATE_SCHEMA_VERSION,
    habits: [],
    settings: {
      notificationsEnabled: false,
      notified: {}
    }
  };

  let state = loadState();
  let deferredInstallPrompt = null;
  let reminderTimer = null;
  let editingHabitId = null;

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
    addHeading: document.getElementById("addHeading"),
    habitForm: document.getElementById("habitForm"),
    habitName: document.getElementById("habitName"),
    habitTime: document.getElementById("habitTime"),
    habitSubmitButton: document.getElementById("habitSubmitButton"),
    cancelEditButton: document.getElementById("cancelEditButton"),
    exportBackupButton: document.getElementById("exportBackupButton"),
    importBackupButton: document.getElementById("importBackupButton"),
    importBackupFile: document.getElementById("importBackupFile"),
    backupStatus: document.getElementById("backupStatus"),
    historyEditor: document.getElementById("historyEditor"),
    editHistoryGrid: document.getElementById("editHistoryGrid"),
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
      button.addEventListener("click", () => {
        if (button.dataset.view === "add") {
          resetHabitForm();
        }
        setView(button.dataset.view);
      });
    });

    document.querySelectorAll("input[name='frequency']").forEach((radio) => {
      radio.addEventListener("change", () => {
        elements.customDays.hidden = getSelectedFrequency() !== "custom";
      });
    });

    elements.habitForm.addEventListener("submit", handleSaveHabit);
    elements.cancelEditButton.addEventListener("click", () => {
      resetHabitForm();
      setView("all");
    });
    elements.exportBackupButton.addEventListener("click", exportBackup);
    elements.importBackupButton.addEventListener("click", () => {
      elements.importBackupFile.value = "";
      elements.importBackupFile.click();
    });
    elements.importBackupFile.addEventListener("change", importBackup);
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
      const registration = await navigator.serviceWorker.register("sw.js?v=24");
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

  function handleSaveHabit(event) {
    event.preventDefault();

    const input = readHabitForm();
    if (!input) {
      return;
    }

    if (editingHabitId) {
      updateHabit(editingHabitId, input);
    } else {
      state.habits.unshift(createHabit({
        ...input,
        createdAt: dateKey(new Date())
      }));
    }

    saveState();
    resetHabitForm();
    setView("all");
    render();
  }

  function readHabitForm() {
    const formData = new FormData(elements.habitForm);
    const name = String(formData.get("habitName") || "").trim();
    const reminderTime = String(formData.get("habitTime") || "08:00");
    const type = String(formData.get("frequency") || "daily");
    const color = String(formData.get("color") || "#2f7d6d");
    const days = formData.getAll("day").map((value) => Number(value));
    const historyDays = formData.getAll("historyDay").map(String);

    if (!name) {
      return;
    }

    if (type === "custom" && days.length === 0) {
      elements.customDays.hidden = false;
      return null;
    }

    return {
      name,
      reminderTime,
      frequency: { type, days },
      color,
      historyDays
    };
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
    const orderedDueToday = dueToday.slice().sort((a, b) => compareTodayHabits(a, b, today));

    elements.dueCount.textContent = `${remainingToday.length} left`;
    elements.todayHabits.innerHTML = "";
    elements.todayEmpty.hidden = dueToday.length > 0;

    orderedDueToday.forEach((habit) => {
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
    const keptBadge = fragment.querySelector(".kept-badge");
    const title = fragment.querySelector("h3");
    const meta = fragment.querySelector(".habit-meta");
    const keepButton = fragment.querySelector(".keep-button");
    const editButton = fragment.querySelector(".edit-button");
    const removeButton = fragment.querySelector(".remove-button");
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
    card.classList.toggle("is-kept-today", isDueToday && isKept);
    keptBadge.hidden = !(isDueToday && isKept);
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
    editButton.addEventListener("click", () => startEditHabit(habit.id));
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
      elements.notificationStatus.textContent = "Notifications are enabled while the app is open. Closed-app reminders need Web Push.";
      elements.enableNotificationsButton.textContent = "Enabled";
      elements.enableNotificationsButton.disabled = true;
    } else if (Notification.permission === "denied") {
      state.settings.notificationsEnabled = false;
      elements.notificationStatus.textContent = "Notifications are blocked in browser settings.";
      elements.enableNotificationsButton.textContent = "Blocked";
      elements.enableNotificationsButton.disabled = true;
    } else {
      elements.notificationStatus.textContent = "Enable app-open reminders. Closed-app reminders need Web Push.";
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

  function exportBackup() {
    const backup = {
      app: "habits-trainer",
      schemaVersion: STATE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      state: migrateState(state)
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `habits-trainer-backup-${dateKey(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupStatus("Backup exported.");
  }

  async function importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const importedState = migrateState(extractBackupState(parsed));
      const habitCount = importedState.habits.length;
      const message = habitCount === 1
        ? "Replace current data with 1 habit from this backup?"
        : `Replace current data with ${habitCount} habits from this backup?`;

      if (!window.confirm(message)) {
        setBackupStatus("Import canceled.");
        return;
      }

      state = importedState;
      saveState();
      resetHabitForm();
      render();
      setBackupStatus("Backup imported.");
    } catch (error) {
      console.warn("Backup import failed", error);
      setBackupStatus("Import failed. Choose a Habits backup JSON file.");
    } finally {
      elements.importBackupFile.value = "";
    }
  }

  function extractBackupState(parsed) {
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Backup is not an object.");
    }

    if (parsed.app === "habits-trainer" && parsed.state) {
      return parsed.state;
    }

    if (Array.isArray(parsed.habits) || parsed.settings) {
      return parsed;
    }

    throw new Error("Backup does not contain Habits state.");
  }

  function setBackupStatus(message) {
    elements.backupStatus.textContent = message;
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
    if (editingHabitId === habitId) {
      resetHabitForm();
    }
    saveState();
    render();
  }

  function startEditHabit(habitId) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) {
      return;
    }

    const frequency = habit.frequency || { type: "daily", days: [] };
    editingHabitId = habit.id;
    elements.addHeading.textContent = "Edit Habit";
    elements.habitSubmitButton.textContent = "Save Habit";
    elements.cancelEditButton.hidden = false;
    elements.habitName.value = habit.name;
    elements.habitTime.value = habit.reminderTime;
    setRadioValue("frequency", frequency.type);
    setRadioValue("color", habit.color);
    setDayCheckboxes(frequency);
    renderHistoryEditor(habit);
    elements.customDays.hidden = frequency.type !== "custom";
    elements.historyEditor.hidden = false;
    setView("add");
    elements.habitName.focus();
  }

  function updateHabit(habitId, input) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) {
      return;
    }

    habit.name = input.name;
    habit.reminderTime = input.reminderTime;
    habit.frequency = input.frequency;
    habit.color = input.color;
    habit.completions = mergeEditedHistory(habit, input.historyDays);
  }

  function resetHabitForm() {
    editingHabitId = null;
    elements.habitForm.reset();
    elements.habitTime.value = "08:00";
    elements.customDays.hidden = true;
    elements.historyEditor.hidden = true;
    elements.editHistoryGrid.innerHTML = "";
    elements.addHeading.textContent = "New Habit";
    elements.habitSubmitButton.textContent = "Add Habit";
    elements.cancelEditButton.hidden = true;
  }

  function setRadioValue(name, value) {
    const input = Array.from(elements.habitForm.querySelectorAll(`input[name="${name}"]`))
      .find((item) => item.value === value);
    if (input) {
      input.checked = true;
    }
  }

  function setDayCheckboxes(frequency) {
    const selectedDays = frequency.type === "custom" ? frequency.days : [1, 2, 3, 4, 5];

    elements.habitForm.querySelectorAll('input[name="day"]').forEach((input) => {
      input.checked = selectedDays.includes(Number(input.value));
    });
  }

  function renderHistoryEditor(habit) {
    elements.editHistoryGrid.innerHTML = "";

    lastNDates(28).forEach((key) => {
      const date = parseDateKey(key);
      const label = document.createElement("label");
      const input = document.createElement("input");
      const span = document.createElement("span");

      input.type = "checkbox";
      input.name = "historyDay";
      input.value = key;
      input.checked = Boolean(habit.completions[key]);
      input.setAttribute("aria-label", `${formatDate(key)} kept`);
      span.textContent = String(date.getDate());
      span.title = `${formatDate(key)}: ${input.checked ? "kept" : "not kept"}`;
      label.classList.toggle("is-due", isScheduledOn(habit, key));
      label.append(input, span);
      elements.editHistoryGrid.appendChild(label);
    });
  }

  function mergeEditedHistory(habit, historyDays) {
    const editableDates = new Set(lastNDates(28));
    const keptDates = new Set(historyDays);
    const completions = Object.fromEntries(
      Object.entries(habit.completions || {}).filter(([key]) => !editableDates.has(key))
    );

    editableDates.forEach((key) => {
      if (keptDates.has(key)) {
        completions[key] = habit.completions[key] || new Date().toISOString();
      }
    });

    return completions;
  }

  function compareTodayHabits(a, b, today) {
    const aKept = Boolean(a.completions[today]);
    const bKept = Boolean(b.completions[today]);

    if (aKept !== bKept) {
      return Number(aKept) - Number(bKept);
    }

    return 0;
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

  function shuffleQuoteDeck(deck) {
    const random = seededRandom(QUOTE_SHUFFLE_SEED);
    const shuffled = deck.slice();

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;

    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
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
        return cloneDefaultState();
      }

      const parsed = JSON.parse(saved);
      const migrated = migrateState(parsed);
      persistState(migrated);
      return migrated;
    } catch (error) {
      console.warn("State load failed", error);
      return cloneDefaultState();
    }
  }

  function saveState() {
    state = migrateState(state);
    persistState(state);
  }

  function persistState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function migrateState(input) {
    const source = isPlainObject(input) ? input : {};
    const settings = isPlainObject(source.settings) ? source.settings : {};
    const notified = isPlainObject(settings.notified) ? settings.notified : {};

    return {
      ...cloneDefaultState(),
      ...source,
      schemaVersion: STATE_SCHEMA_VERSION,
      habits: Array.isArray(source.habits)
        ? source.habits.map(normalizeHabit).filter(Boolean)
        : [],
      settings: {
        ...defaultState.settings,
        ...settings,
        notificationsEnabled: Boolean(settings.notificationsEnabled),
        notified
      }
    };
  }

  function normalizeHabit(habit) {
    if (!isPlainObject(habit)) {
      return null;
    }

    const name = String(habit.name || "").trim();
    if (!name) {
      return null;
    }

    return {
      ...habit,
      id: String(habit.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random())),
      name,
      reminderTime: isValidTime(habit.reminderTime) ? habit.reminderTime : "08:00",
      frequency: normalizeFrequency(habit.frequency),
      color: isValidColor(habit.color) ? habit.color : "#2f7d6d",
      createdAt: isDateKey(habit.createdAt) ? habit.createdAt : dateKey(new Date()),
      completions: normalizeCompletions(habit.completions)
    };
  }

  function normalizeFrequency(frequency) {
    if (!isPlainObject(frequency)) {
      return { type: "daily", days: [] };
    }

    if (frequency.type === "weekdays") {
      return { type: "weekdays", days: [] };
    }

    if (frequency.type === "custom") {
      return {
        type: "custom",
        days: Array.isArray(frequency.days)
          ? [...new Set(frequency.days.map(Number).filter((day) => day >= 0 && day <= 6))]
          : []
      };
    }

    return { type: "daily", days: [] };
  }

  function normalizeCompletions(completions) {
    if (!isPlainObject(completions)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(completions)
        .filter(([key, value]) => isDateKey(key) && value)
        .map(([key, value]) => [key, String(value)])
    );
  }

  function cloneDefaultState() {
    return structuredClone(defaultState);
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isDateKey(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isValidTime(value) {
    if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
      return false;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }

  function isValidColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  }
})();
