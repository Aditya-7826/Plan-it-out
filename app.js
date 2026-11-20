// Plan it out — all data lives in your browser's localStorage.
const STORAGE_KEY = "planItOut.v2";
const OLD_KEY = "studyPlanner.v1";
const PRIORITIES = ["high", "low"];
const PRIO_RANK = { high: 0, low: 1 };

const $ = (id) => document.getElementById(id);

// ---------- line icons (drawn in the same style as the reference menu) ----------
const ICONS = {
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  compass: '<circle cx="12" cy="12" r="9.5"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5Z"/>',
  "check-circle": '<circle cx="12" cy="12" r="9.5"/><path d="m8 12 3 3 5-6"/>',
  edit: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="M13 21h8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/>',
  forward: '<path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  skip: '<circle cx="12" cy="12" r="9.5"/><path d="m5.5 5.5 13 13"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M4 16V5.5A2.5 2.5 0 0 1 6.5 3H16"/>',
  trash: '<path d="M3 6h18M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6M5.5 6l1 14a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5l1-14"/><path d="M10 10.5v6M14 10.5v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>',
};

function icon(name) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}
function fillIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
    el.removeAttribute("data-icon");
  });
}

// ---------- dates ----------
function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function shiftDate(key, days) {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}
// ---------- clock: always Indian Standard Time ----------
// "Today" is worked out in Asia/Kolkata, whatever timezone the browser is set to.
// If the device clock is wrong, syncClock() corrects it using an internet time source.
const TIME_ZONE = "Asia/Kolkata";
let clockOffset = 0; // ms to add to the device clock
const now = () => new Date(Date.now() + clockOffset);
const istFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const todayKey = () => istFormat.format(now()); // en-CA formats as YYYY-MM-DD

async function fetchWithTimeout(url, opts = {}, ms = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal, cache: "no-store" }); }
  finally { clearTimeout(timer); }
}

async function networkTime() {
  // 1) when hosted (e.g. GitHub Pages), the server's Date header is the cheapest source
  if (location.protocol.startsWith("http")) {
    try {
      const res = await fetchWithTimeout(location.href, { method: "HEAD" });
      const d = Date.parse(res.headers.get("date"));
      if (d) return d;
    } catch {}
  }
  // 2) public time APIs (no data about you is sent)
  try {
    const res = await fetchWithTimeout("https://worldtimeapi.org/api/timezone/Asia/Kolkata");
    const j = await res.json();
    if (j.unixtime) return j.unixtime * 1000;
  } catch {}
  try {
    const res = await fetchWithTimeout("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata");
    const j = await res.json();
    if (j.dateTime) return Date.parse(j.dateTime + "+05:30");
  } catch {}
  return null;
}

async function syncClock() {
  const t = await networkTime();
  if (!t) return;
  const offset = t - Date.now();
  // only correct the clock when the device is noticeably off (more than 2 minutes)
  if (Math.abs(offset) < 2 * 60 * 1000) return;
  const wasToday = currentDate === todayKey();
  clockOffset = offset;
  if (wasToday) currentDate = todayKey();
  render();
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const niceDate = (key, opts = { weekday: "long", day: "numeric", month: "short" }) =>
  fromKey(key).toLocaleDateString(undefined, opts);

// ---------- storage ----------
// shape: { days: { "2026-11-20": { tasks: [{ id, text, minutes, priority, status, hobbyId?, carried? }], notes } },
//          hobbies: [{ id, name, priority }], records: { longestStreak, mostInDay, bestWeek } }
let data = load();
let currentDate = todayKey();

// priorities are now just high/low: anything else (e.g. the old "medium") becomes low
function normalizePriorities(d) {
  const fix = (item) => { if (!PRIORITIES.includes(item.priority)) item.priority = "low"; };
  Object.values(d.days || {}).forEach((day) => (day.tasks || []).forEach(fix));
  (d.hobbies || []).forEach(fix);
  return d;
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.days) return normalizePriorities(saved);
  } catch {}
  // first run: bring over goals from the old Night Sky Study Planner
  const fresh = { days: {}, hobbies: [], records: {} };
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY)) || {};
    for (const [key, day] of Object.entries(old)) {
      fresh.days[key] = {
        notes: day.notes || "",
        tasks: (day.goals || []).map((g) => ({
          id: g.id || uid(),
          text: g.text,
          minutes: g.minutes || 0,
          priority: "low",
          status: g.done ? "done" : "todo",
        })),
      };
    }
  } catch {}
  return fresh;
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function getDay(key) {
  if (!data.days[key]) data.days[key] = { tasks: [], notes: "" };
  return data.days[key];
}
const peekDay = (key) => data.days[key] || { tasks: [], notes: "" };

// ---------- day stats ----------
function doneCount(key) {
  return peekDay(key).tasks.filter((t) => t.status === "done").length;
}
// a "full" day: at least one task planned and every non-skipped task done
function isFullDay(key) {
  const active = peekDay(key).tasks.filter((t) => t.status !== "skipped");
  return active.length > 0 && active.every((t) => t.status === "done");
}
const sortTasks = (list) =>
  [...list].sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
const nextPriority = (p) => PRIORITIES[(PRIORITIES.indexOf(p) + 1) % PRIORITIES.length];

function commit() {
  save();
  render();
}

// ---------- render: to-do list ----------
function renderTasks() {
  const day = peekDay(currentDate);
  const today = todayKey();
  const isPast = currentDate < today;
  const list = $("taskList");
  list.innerHTML = "";

  let prevPrio = null;
  for (const task of sortTasks(day.tasks)) {
    const li = document.createElement("li");
    const missed = isPast && task.status === "todo";
    li.className = [task.status, missed ? "missed" : "", prevPrio && prevPrio !== task.priority ? "group-start" : ""].join(" ");
    prevPrio = task.priority;

    const check = document.createElement("button");
    check.className = "check";
    check.title = task.status === "done" ? "Mark as not done" : "Mark as done";
    check.innerHTML = task.status === "done" ? icon("check") : "";
    check.addEventListener("click", () => {
      task.status = task.status === "done" ? "todo" : "done";
      commit();
    });

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = task.text;

    li.append(check, label);

    if (missed) {
      const m = document.createElement("span");
      m.className = "mins";
      m.textContent = task.carried ? "moved" : "missed";
      li.append(m);
    }
    if (task.minutes) {
      const mins = document.createElement("span");
      mins.className = "mins";
      mins.textContent = `${task.minutes} min`;
      li.append(mins);
    }

    li.append(prioChip(task.priority, () => { task.priority = nextPriority(task.priority); commit(); }));

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      actionBtn("skip", task.status === "skipped" ? "Un-skip" : "Skip for today", () => {
        task.status = task.status === "skipped" ? "todo" : "skipped";
        commit();
      }, task.status === "skipped" ? "on" : ""),
      actionBtn("copy", "Duplicate", () => {
        day.tasks.push({ ...task, id: uid(), status: "todo", carried: false });
        commit();
      }),
      actionBtn("trash", "Delete", () => {
        day.tasks = day.tasks.filter((t) => t.id !== task.id);
        commit();
      }, "danger"),
    );
    li.append(actions);
    list.append(li);
  }

  $("emptyTasks").hidden = day.tasks.length > 0;

  const counted = day.tasks.filter((t) => t.status !== "skipped");
  const done = counted.filter((t) => t.status === "done");
  $("progressFill").style.width = counted.length ? `${(done.length / counted.length) * 100}%` : "0";
  const doneMins = done.reduce((s, t) => s + (t.minutes || 0), 0);
  const totalMins = counted.reduce((s, t) => s + (t.minutes || 0), 0);
  $("progressText").textContent =
    `${done.length} / ${counted.length} done` + (totalMins ? ` · ${doneMins}/${totalMins} min` : "");

  $("dayLabel").textContent = niceDate(currentDate) + (currentDate === today ? " · today" : "");

  // offer to move unfinished tasks from a past day onto today
  const leftover = isPast ? day.tasks.filter((t) => t.status === "todo" && !t.carried) : [];
  $("carryBtn").hidden = leftover.length === 0;
  $("carryText").textContent = `Move ${leftover.length} unfinished task${leftover.length === 1 ? "" : "s"} to today`;
}

function prioChip(priority, onClick) {
  const b = document.createElement("button");
  b.className = `prio ${priority}`;
  b.textContent = priority;
  b.title = "Click to change priority";
  b.addEventListener("click", onClick);
  return b;
}
function actionBtn(name, title, onClick, extra = "") {
  const b = document.createElement("button");
  b.className = `icon-btn ${extra}`;
  b.title = title;
  b.setAttribute("aria-label", title);
  b.innerHTML = icon(name);
  b.addEventListener("click", onClick);
  return b;
}

// ---------- render: side quests (stored as data.hobbies) ----------
function renderHobbies() {
  const list = $("hobbyList");
  list.innerHTML = "";
  const day = peekDay(currentDate);
  let prevPrio = null;

  for (const hobby of sortTasks(data.hobbies)) {
    const li = document.createElement("li");
    if (prevPrio && prevPrio !== hobby.priority) li.className = "group-start";
    prevPrio = hobby.priority;

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = hobby.name;

    const planned = day.tasks.some((t) => t.hobbyId === hobby.id);
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      actionBtn(planned ? "check" : "plus", planned ? "Side quest already in this day's plan" : "Add side quest to this day's plan", () => {
        if (planned) return;
        getDay(currentDate).tasks.push({
          id: uid(), text: hobby.name, minutes: 0, priority: hobby.priority, status: "todo", hobbyId: hobby.id,
        });
        commit();
      }, planned ? "on" : ""),
      actionBtn("trash", "Remove side quest", () => {
        data.hobbies = data.hobbies.filter((h) => h.id !== hobby.id);
        commit();
      }, "danger"),
    );

    li.append(label, prioChip(hobby.priority, () => { hobby.priority = nextPriority(hobby.priority); commit(); }), actions);
    list.append(li);
  }
  $("emptyHobbies").hidden = data.hobbies.length > 0;
}

// ---------- render: day review (what you did and didn't do) ----------
function renderReview() {
  const day = peekDay(currentDate);
  const isPast = currentDate < todayKey();
  const done = sortTasks(day.tasks.filter((t) => t.status === "done"));
  const notDone = sortTasks(day.tasks.filter((t) => t.status !== "done"));

  fillPlain($("doneList"), done, () => "", "Nothing finished yet.");
  fillPlain($("missedList"), notDone, (t) => (t.status === "skipped" ? " (skipped)" : t.carried ? " (moved to today)" : ""),
    isPast ? "Nothing missed. Nice." : "All clear.");
  $("doneCount").textContent = done.length;
  $("missedCount").textContent = notDone.length;
  $("missedTitle").firstChild.textContent = isPast ? "Missed " : "Not done yet ";
}
function fillPlain(ul, items, suffix, emptyText) {
  ul.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "none";
    li.textContent = emptyText;
    ul.append(li);
    return;
  }
  for (const t of items) {
    const li = document.createElement("li");
    li.textContent = t.text + suffix(t);
    ul.append(li);
  }
}

// ---------- render: contribution graph ----------
function level(n) {
  if (n === 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 5) return 3;
  return 4;
}
function renderGraph() {
  const graph = $("graph");
  const months = $("months");
  graph.innerHTML = "";
  months.innerHTML = "";

  const today = todayKey();
  let key = shiftDate(today, -364);
  key = shiftDate(key, -fromKey(key).getDay()); // back up to Sunday
  let total = 0;
  let col = 0;
  let lastMonth = -1;

  while (true) {
    const d = fromKey(key);
    if (d.getDay() === 0) {
      if (key > today) break;
      const span = document.createElement("span");
      if (d.getMonth() !== lastMonth) {
        // label the first full week of each month
        if (col > 0 || d.getDate() <= 7) span.textContent = d.toLocaleDateString(undefined, { month: "short" });
        lastMonth = d.getMonth();
      }
      months.append(span);
      col++;
    }
    const n = doneCount(key);
    if (key <= today) total += n;
    const cell = document.createElement("div");
    cell.className = `cell l${level(n)}` + (key > today ? " future" : "") + (key === currentDate ? " selected" : "");
    cell.title = `${n} task${n === 1 ? "" : "s"} done · ${niceDate(key, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
    const k = key;
    cell.addEventListener("click", () => { currentDate = k; render(); });
    graph.append(cell);
    key = shiftDate(key, 1);
  }

  $("yearTotal").textContent = `${total} task${total === 1 ? "" : "s"} done in the last year`;
  // keep the newest weeks in view
  const wrap = graph.parentElement;
  wrap.scrollLeft = wrap.scrollWidth;
}

// ---------- personal bests ----------
function computeStats() {
  const today = todayKey();
  const keys = Object.keys(data.days).filter((k) => k <= today).sort();

  let totalDone = 0, totalMins = 0, planned = 0;
  let mostInDay = { value: 0, date: null };
  const weeks = {};
  for (const k of keys) {
    const tasks = data.days[k].tasks;
    const done = tasks.filter((t) => t.status === "done");
    totalDone += done.length;
    totalMins += done.reduce((s, t) => s + (t.minutes || 0), 0);
    if (k < today) planned += tasks.filter((t) => t.status !== "skipped").length;
    else planned += done.length; // today only counts what's finished so far
    if (done.length > mostInDay.value) mostInDay = { value: done.length, date: k };
    const d = fromKey(k);
    const monday = shiftDate(k, -((d.getDay() + 6) % 7));
    weeks[monday] = (weeks[monday] || 0) + done.length;
  }
  let bestWeek = { value: 0, date: null };
  for (const [w, n] of Object.entries(weeks)) if (n > bestWeek.value) bestWeek = { value: n, date: w };

  // streaks of full days
  let longest = { value: 0, date: null }, run = 0, prev = null;
  for (const k of keys) {
    if (!isFullDay(k)) { run = 0; prev = k; continue; }
    run = prev && shiftDate(prev, 1) === k && run > 0 ? run + 1 : 1;
    prev = k;
    if (run > longest.value) longest = { value: run, date: k };
  }
  let current = 0;
  let k = isFullDay(today) ? today : shiftDate(today, -1);
  while (isFullDay(k)) { current++; k = shiftDate(k, -1); }

  return {
    current, longest, mostInDay, bestWeek, totalDone, totalMins,
    rate: planned ? Math.round((totalDone / planned) * 100) : 0,
  };
}

let freshRecords = new Set();
function checkRecords(stats) {
  if (!data.records) data.records = {};
  const tracked = {
    longestStreak: [stats.longest.value, "Longest streak"],
    mostInDay: [stats.mostInDay.value, "Most tasks in a day"],
    bestWeek: [stats.bestWeek.value, "Best week"],
  };
  const firstRun = Object.keys(data.records).length === 0;
  let changed = false;
  for (const [id, [value, name]] of Object.entries(tracked)) {
    const old = data.records[id] || 0;
    if (value > old) {
      data.records[id] = value;
      changed = true;
      if (!firstRun && old > 0) {
        freshRecords.add(id);
        toast(`New personal best: ${name} — ${value}!`);
      }
    }
  }
  if (changed) save();
}

function renderBests() {
  const s = computeStats();
  checkRecords(s);
  const short = (key) => (key ? niceDate(key, { day: "numeric", month: "short" }) : "");
  const hrs = s.totalMins >= 60 ? `${(s.totalMins / 60).toFixed(1)}h` : `${s.totalMins}m`;
  const tiles = [
    { id: "currentStreak", value: s.current, name: "Current streak (days)", sub: s.current ? "keep it going" : "finish every task today to start one" },
    { id: "longestStreak", value: s.longest.value, name: "Longest streak (days)", sub: s.longest.date ? `ended ${short(s.longest.date)}` : "" },
    { id: "mostInDay", value: s.mostInDay.value, name: "Most tasks in a day", sub: short(s.mostInDay.date) },
    { id: "bestWeek", value: s.bestWeek.value, name: "Best week (tasks)", sub: s.bestWeek.date ? `week of ${short(s.bestWeek.date)}` : "" },
    { id: "totalDone", value: s.totalDone, name: "Tasks done, all time", sub: "" },
    { id: "totalMins", value: hrs, name: "Time spent on done tasks", sub: "" },
    { id: "rate", value: `${s.rate}%`, name: "Completion rate", sub: "done ÷ planned" },
  ];
  const box = $("bests");
  box.innerHTML = "";
  for (const t of tiles) {
    const div = document.createElement("div");
    div.className = "best" + (freshRecords.has(t.id) ? " fresh" : "");
    div.innerHTML = `<div class="value"></div><div class="name"></div>${t.sub ? '<div class="sub"></div>' : ""}`;
    div.querySelector(".value").textContent = t.value;
    div.querySelector(".name").textContent = t.name;
    if (t.sub) div.querySelector(".sub").textContent = (freshRecords.has(t.id) ? "★ new record · " : "") + t.sub;
    box.append(div);
  }
}

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// ---------- planner header + week strip ----------
function renderHero() {
  const today = todayKey();
  $("bigDate").textContent = niceDate(currentDate, { weekday: "long", day: "numeric", month: "long" });
  const tasks = peekDay(currentDate).tasks.filter((t) => t.status !== "skipped");
  const left = tasks.filter((t) => t.status === "todo").length;
  let msg;
  if (!tasks.length) msg = currentDate < today ? "Nothing was planned for this day." : "Nothing planned yet. What's on today?";
  else if (!left) msg = `All ${tasks.length} task${tasks.length === 1 ? "" : "s"} done. Great work.`;
  else if (currentDate < today) msg = `${tasks.length - left} of ${tasks.length} done · ${left} missed`;
  else msg = `${left} task${left === 1 ? "" : "s"} left · ${tasks.length - left} done`;
  $("heroSummary").textContent = msg;
}

function renderWeek() {
  const week = $("week");
  week.innerHTML = "";
  const today = todayKey();
  const monday = shiftDate(currentDate, -((fromKey(currentDate).getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const key = shiftDate(monday, i);
    const tasks = peekDay(key).tasks.filter((t) => t.status !== "skipped");
    const pct = tasks.length ? (tasks.filter((t) => t.status === "done").length / tasks.length) * 100 : 0;
    const b = document.createElement("button");
    if (key === today) b.classList.add("is-today");
    if (key === currentDate) b.classList.add("is-selected");
    b.title = `${niceDate(key)} · ${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
    // built with DOM calls (no style="" attribute) so a strict Content-Security-Policy allows it
    const wd = document.createElement("span");
    wd.className = "wd";
    wd.textContent = fromKey(key).toLocaleDateString(undefined, { weekday: "short" });
    const dn = document.createElement("span");
    dn.className = "dn";
    dn.textContent = fromKey(key).getDate();
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.width = `${pct}%`; // CSSOM property, allowed under style-src 'self'
    bar.append(fill);
    b.append(wd, dn, bar);
    b.addEventListener("click", () => { currentDate = key; render(); });
    week.append(b);
  }
}

// ---------- main render ----------
function render() {
  renderHero();
  renderWeek();
  $("datePicker").value = currentDate;
  const notes = $("notes");
  if (document.activeElement !== notes) notes.value = peekDay(currentDate).notes || "";
  renderTasks();
  renderHobbies();
  renderReview();
  renderGraph();
  renderBests();
}

// ---------- events ----------
$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("taskInput").value.trim();
  if (!text) return;
  getDay(currentDate).tasks.push({
    id: uid(),
    text,
    minutes: parseInt($("minutesInput").value, 10) || 0,
    priority: $("taskPriority").value,
    status: "todo",
  });
  $("taskInput").value = "";
  $("minutesInput").value = "";
  $("taskInput").focus();
  commit();
});

$("hobbyForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("hobbyInput").value.trim();
  if (!name) return;
  data.hobbies.push({ id: uid(), name, priority: $("hobbyPriority").value });
  $("hobbyInput").value = "";
  $("hobbyInput").focus();
  commit();
});

$("carryBtn").addEventListener("click", () => {
  const today = getDay(todayKey());
  for (const t of peekDay(currentDate).tasks) {
    if (t.status === "todo" && !t.carried) {
      today.tasks.push({ ...t, id: uid(), carried: false });
      t.carried = true;
    }
  }
  toast("Unfinished tasks moved to today");
  currentDate = todayKey();
  commit();
});

$("notes").addEventListener("input", (e) => {
  getDay(currentDate).notes = e.target.value;
  save();
});

$("datePicker").addEventListener("change", (e) => {
  if (e.target.value) { currentDate = e.target.value; render(); }
});
$("prevDay").addEventListener("click", () => { currentDate = shiftDate(currentDate, -1); render(); });
$("nextDay").addEventListener("click", () => { currentDate = shiftDate(currentDate, 1); render(); });
$("todayBtn").addEventListener("click", () => { currentDate = todayKey(); render(); });

// ---------- backup: export / import ----------
const MAX_IMPORT_BYTES = 1024 * 1024; // 1 MB
const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function setBackupStatus(msg, kind) {
  const el = $("backupStatus");
  el.textContent = msg; // always textContent, never innerHTML
  el.className = `backup-status ${kind || ""}`;
}

$("exportBtn").addEventListener("click", () => {
  let json;
  try { json = localStorage.getItem(STORAGE_KEY); } catch {}
  if (!json) json = JSON.stringify(data); // nothing saved yet: export the in-memory data
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plan-it-out-${todayKey()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setBackupStatus("Backup downloaded.", "ok");
});

// Check that a parsed file has the same structure app.js stores under "planItOut.v2".
function validateBackup(obj) {
  if (!isPlainObject(obj)) return "The file isn't a Plan it out backup.";
  const allowed = ["days", "hobbies", "records"];
  const extra = Object.keys(obj).filter((k) => !allowed.includes(k));
  if (extra.length) return `Unexpected data in file: ${extra.slice(0, 3).join(", ")}.`;
  if (!isPlainObject(obj.days)) return "The file has no days section.";
  if (!Array.isArray(obj.hobbies)) return "The file has no side quests section.";
  if (obj.records !== undefined && !isPlainObject(obj.records)) return "The personal bests section is damaged.";
  for (const [key, day] of Object.entries(obj.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return `"${key.slice(0, 20)}" isn't a valid date.`;
    if (!isPlainObject(day) || !Array.isArray(day.tasks)) return `The day ${key} is damaged.`;
    if (day.notes !== undefined && typeof day.notes !== "string") return `The notes for ${key} are damaged.`;
    for (const t of day.tasks) {
      if (!isPlainObject(t) || typeof t.text !== "string" || typeof t.status !== "string") return `A task on ${key} is damaged.`;
    }
  }
  for (const h of obj.hobbies) {
    if (!isPlainObject(h) || typeof h.name !== "string") return "A side quest in the file is damaged.";
  }
  return null;
}

$("importFile").addEventListener("change", async (e) => {
  const input = e.target;
  const file = input.files && input.files[0];
  input.value = ""; // allow choosing the same file again later
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    setBackupStatus("That file is over 1 MB, which is too big to be a Plan it out backup.", "error");
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    setBackupStatus("That file couldn't be read. Choose a .json backup exported from Plan it out.", "error");
    return;
  }
  const problem = validateBackup(parsed);
  if (problem) {
    setBackupStatus(`Import cancelled: ${problem}`, "error");
    return;
  }
  const days = Object.keys(parsed.days).length;
  if (!confirm(`Replace everything in this browser with the backup (${days} day${days === 1 ? "" : "s"} of plans, ${parsed.hobbies.length} side quest${parsed.hobbies.length === 1 ? "" : "s"})? This can't be undone.`)) {
    setBackupStatus("Import cancelled.", "");
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    setBackupStatus("Couldn't save the backup. Your browser storage may be full or blocked.", "error");
    return;
  }
  location.reload();
});

// ---------- offline support / install as an app ----------
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

fillIcons();
render();
syncClock();

// roll over to the new day at midnight IST if the page is left open
let lastToday = todayKey();
setInterval(() => {
  const t = todayKey();
  if (t === lastToday) return;
  if (currentDate === lastToday) currentDate = t;
  lastToday = t;
  render();
}, 30 * 1000);
