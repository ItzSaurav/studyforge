/* =========================================================
   StudyForge — Dashboard App JS
   Full task management, XP system, focus mode, navigation
   Now using Firebase Authentication
   ========================================================= */

// ── Guard: redirect if not logged in (await Firebase init) 
fbAuthReady().then((user) => {
  if (!user) {
    window.location.href = "/";
  } else {
    init();
  }
});

// ── State ─────────────────────────────────────────────────
let state = {
  allTasks:    [],
  tasks:       [],
  filter:      "all",
  searchQuery: "",
  user:        Auth.getUser() || {},
  stats:       {},
  loading:     false
};

// Focus mode state
let focus = {
  taskId:   null,
  taskName: "",
  seconds:  25 * 60,
  total:    25 * 60,
  running:  false,
  interval: null
};
const CIRCUMFERENCE = 2 * Math.PI * 96; // ≈603

// ── DOM refs ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Init ──────────────────────────────────────────────────
async function init() {
  // Validate token with the server before loading anything.
  // This catches expired tokens and DB resets gracefully.
  try {
    const meRes = await AuthAPI.me();
    // Refresh local user data from the server (keeps it in sync)
    if (meRes.user) {
      state.user = meRes.user;
      Auth.setUser(meRes.user);
    }
  } catch (err) {
    // Token invalid/expired or user doesn't exist anymore
    Auth.logout();
    // Brief delay so the toast is visible before redirect
    window.location.href = "/";
    return;
  }

  renderUserInfo();
  showSection("tasks");
  await Promise.all([loadTasks(), loadStats()]);
  scheduleReminderCheck();
}

// ── User info ─────────────────────────────────────────────
function renderUserInfo() {
  const u = state.user;
  if (!u) return;

  // Topbar
  $("topGreeting").textContent = getGreeting() + ",";
  $("topUserName").textContent = u.name || "Student";

  // Sidebar
  $("sideUserName").textContent    = u.name || "";
  $("sideUserEmail").textContent   = u.email || "";
  $("sideUserAvatar").textContent  = u.initials || u.name?.slice(0,2).toUpperCase() || "?";

  renderXP(u.xp || 0, u.level || 1, u.streak || 0);
}

function renderXP(xp, level, streak) {
  const needed = level * 100;
  const pct    = Math.min((xp / needed) * 100, 100);

  $("xpLevel").textContent  = level;
  $("xpCurrent").textContent = xp;
  $("xpNeeded").textContent  = needed;
  $("xpPct").textContent    = Math.round(pct) + "%";
  $("xpBarFill").style.width = pct + "%";
  $("streakNum").textContent  = streak;

  // Level ring (circumference ≈ 301 for r=48)
  const ringCirc = 2 * Math.PI * 48;
  const offset   = ringCirc * (1 - pct / 100);
  const ring = $("levelRingFill");
  if (ring) {
    ring.style.strokeDasharray  = ringCirc;
    ring.style.strokeDashoffset = offset;
  }
}

// ── Navigation / Sections ─────────────────────────────────
function showSection(name) {
  document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const section = $("section-" + name);
  const navItem = $("nav-" + name);
  if (section) section.classList.add("active");
  if (navItem)  navItem.classList.add("active");

  const titles = { tasks:"My Tasks", stats:"Statistics", settings:"Settings", focus:"Focus Mode" };
  $("topSectionTitle").textContent = titles[name] || "StudyForge";

  // Sync mobile bottom nav
  setBottomNav(name);

  // Load section data
  if (name === "stats")    renderStatsSection();
  if (name === "settings") renderSettingsSection();

  closeSidebar();
}

// ── Sidebar mobile ────────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const isOpen   = sidebar.classList.contains("open");
  sidebar.classList.toggle("open", !isOpen);
  if (backdrop) backdrop.classList.toggle("visible", !isOpen);
  document.body.style.overflow = isOpen ? "" : "hidden";
}

function closeSidebar() {
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  sidebar.classList.remove("open");
  if (backdrop) backdrop.classList.remove("visible");
  document.body.style.overflow = "";
}

// ── Bottom nav (mobile) ───────────────────────────────────
function setBottomNav(section) {
  document.querySelectorAll(".bottom-nav-item").forEach(el => el.classList.remove("active"));
  const active = $("bn-" + section);
  if (active) active.classList.add("active");
}

function openFocusModeMenu() {
  // If there are tasks, open focus on the first pending one
  const pending = state.tasks.find(t => !t.completed);
  if (pending) {
    openFocusMode(pending.id, pending.title);
  } else {
    Toast.info("Add a task first to use Focus Mode 🎯");
  }
}

// Override showSection to also sync bottom nav
const _origShowSection = showSection;
// (patched below after definition)

// ── Touch / Swipe sidebar close ───────────────────────────
(function initSwipeGesture() {
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    // Swipe left > 60px and not too vertical → close sidebar
    if (dx < -60 && dy < 80) {
      closeSidebar();
    }
    // Swipe right from left edge (< 30px) → open sidebar
    if (dx > 60 && dy < 80 && touchStartX < 30) {
      const sidebar = document.querySelector(".sidebar");
      if (!sidebar.classList.contains("open")) toggleSidebar();
    }
  }, { passive: true });
})();


// ── Profile dropdown ──────────────────────────────────────
function toggleProfileMenu() { $("profileDropdown").classList.toggle("open"); }
document.addEventListener("click", (e) => {
  if (!e.target.closest(".user-profile")) $("profileDropdown").classList.remove("open");
});

// ── Load tasks from API ───────────────────────────────────
async function loadTasks(silent = false) {
  if (!silent) showSkeletons();
  try {
    // Fetch ALL tasks once from the server
    const res = await TasksAPI.getAll({});
    state.allTasks = res.tasks || [];
    filterAndRenderTasks();
  } catch (err) {
    if (err.status === 401) { Auth.logout(); window.location.href = "/"; return; }
    Toast.error("Failed to load tasks: " + err.message);
    if (!silent) hideSkeletons();
  }
}

function filterAndRenderTasks() {
  const s = state.searchQuery.toLowerCase();
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();

  state.tasks = state.allTasks.filter(t => {
    // Search filter
    if (s && !t.title.toLowerCase().includes(s) && !(t.subject && t.subject.toLowerCase().includes(s))) {
      return false;
    }
    // Tab filter
    if (state.filter === "completed" && !t.completed) return false;
    if (state.filter === "pending" && t.completed) return false;
    if (state.filter === "today" && t.due_date !== todayStr) return false;
    if (state.filter === "overdue") {
      if (t.completed) return false;
      const dueDt = new Date(`${t.due_date}T${t.due_time}`);
      if (dueDt >= now) return false;
    }
    return true;
  });
  renderTaskList();
}

// ── Load stats ────────────────────────────────────────────
async function loadStats(silent = false) {
  try {
    // Pass local tasks and user to getStats to avoid unnecessary network reads
    const s = await TasksAPI.getStats(state.allTasks, state.user);
    state.stats = s;
    renderOverviewCards(s);
    renderXP(s.xp || 0, s.level || 1, s.streak || 0);
    updateNavBadge(s.overdue);
  } catch (err) {
    console.warn("Stats load failed:", err.message);
  }
}

// ── Overview cards ────────────────────────────────────────
function renderOverviewCards(s) {
  animateCount($("ovTotal"),   s.total   || 0);
  animateCount($("ovDone"),    s.done    || 0);
  animateCount($("ovOverdue"), s.overdue || 0);
  animateCount($("ovToday"),   s.today   || 0);
}

function updateNavBadge(count) {
  // Sidebar badge
  const badge = $("overdueNavBadge");
  if (badge) {
    if (count > 0) { badge.textContent = count; badge.style.display = "flex"; }
    else badge.style.display = "none";
  }
  // Bottom nav badge (mobile)
  const bnBadge = $("bnOverdueBadge");
  if (bnBadge) {
    if (count > 0) { bnBadge.textContent = count; bnBadge.classList.remove("hidden"); }
    else bnBadge.classList.add("hidden");
  }
}

// ── Skeleton loaders ──────────────────────────────────────
function showSkeletons() {
  $("taskList").innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>`;
}

function hideSkeletons() { $("taskList").innerHTML = ""; }

// ── Render task list ──────────────────────────────────────
function renderTaskList() {
  const list = $("taskList");
  if (!state.tasks.length) {
    const emptyMessages = {
      all:       ["Nothing here yet!", "Add your first task above to get started."],
      today:     ["All clear today!", "No tasks due today — enjoy your day 🌟"],
      pending:   ["Nothing pending!", "All tasks are done. Great work 🎉"],
      completed: ["No completed tasks yet", "Complete some tasks to see them here."],
      overdue:   ["No overdue tasks! 🎉", "You're all caught up — great job staying on track!"]
    };
    const [h, p] = emptyMessages[state.filter] || emptyMessages.all;
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>${h}</h3>
        <p>${p}</p>
      </div>`;
    return;
  }

  list.innerHTML = "";
  const frag = document.createDocumentFragment();
  state.tasks.forEach((t, i) => {
    const el = createTaskCard(t, i);
    frag.appendChild(el);
  });
  list.appendChild(frag);
}

// ── Task card DOM builder ─────────────────────────────────
function createTaskCard(t, animIdx) {
  const sc    = getSubjectStyle(t.subject);
  const fmt   = formatDateTime(t.due_date, t.due_time);
  const rel   = formatRelative(t.due_date, t.due_time);

  const card  = document.createElement("div");
  card.id     = "card-" + t.id;
  card.className = [
    "task-card glass",
    `pri-${t.priority}`,
    t.completed ? "is-done" : "",
    t.overdue   ? "is-overdue" : ""
  ].join(" ");
  card.style.animationDelay = (animIdx * 0.04) + "s";

  card.innerHTML = `
    <div class="task-row">
      <div class="task-check ${t.completed ? "checked" : ""}"
           id="chk-${t.id}"
           onclick="toggleTask('${t.id}')"
           title="${t.completed ? "Mark as pending" : "Mark as complete"}">
      </div>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-meta">
          <span class="subject-tag" style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border}">
            ${esc(t.subject)}
          </span>
          <span class="chip chip-${t.priority}">${t.priority}</span>
          ${t.overdue ? '<span class="overdue-pill">⚠ Overdue</span>' : ""}
        </div>
        <div class="task-datetime">📅 ${fmt} <span style="opacity:0.6;margin-left:4px">(${rel})</span></div>
      </div>
      <div class="task-actions">
        ${!t.completed ? `<button class="task-btn focus" title="Focus on task" onclick="openFocusMode('${t.id}', '${esc(t.title).replace(/'/g,"\\'")}')">🎯</button>` : ""}
        <button class="task-btn del" title="Delete task" onclick="deleteTask('${t.id}')">🗑</button>
      </div>
    </div>`;

  return card;
}

// ── Add task ──────────────────────────────────────────────
const addTaskForm = $("addTaskForm");
if (addTaskForm) {
  addTaskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("addTaskBtn");

    const title    = $("taskTitle").value.trim();
    const subject  = $("taskSubject").value.trim() || "General";
    const priority = $("taskPriority").value;
    const due_date = $("taskDate").value;
    const due_time = $("taskTime").value;

    if (!title)    { Toast.warn("Please enter a task description"); return; }
    if (!due_date) { Toast.warn("Please select a due date"); return; }
    if (!due_time) { Toast.warn("Please select a due time"); return; }

    btnLoading(btn, true);
    try {
      const res = await TasksAPI.create({ title, subject, priority, due_date, due_time });
      Toast.success("Task added! 🚀");
      e.target.reset();
      
      state.allTasks.push(res.task);
      state.allTasks.sort((a, b) => {
        const timeA = new Date(`${a.due_date}T${a.due_time}`).getTime();
        const timeB = new Date(`${b.due_date}T${b.due_time}`).getTime();
        return timeA - timeB;
      });
      filterAndRenderTasks();
      await loadStats(true);
    } catch (err) {
      Toast.error("Failed to add task: " + err.message);
    } finally {
      btnLoading(btn, false);
    }
  });
}

// ── Toggle complete ───────────────────────────────────────
async function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  const completing = !task.completed;
  const chk = $("chk-" + id);
  const card = $("card-" + id);
  
  if (chk) {
    chk.classList.toggle("checked", completing);
    chk.style.pointerEvents = "none";
    setTimeout(() => { if (chk) chk.style.pointerEvents = ""; }, 600);
  }

  // Smooth collapse if the task will disappear from the current filter
  const willDisappear = (completing && state.filter === "pending") || (!completing && state.filter === "completed");
  if (willDisappear && card) {
    card.style.maxHeight = card.offsetHeight + "px";
    card.classList.add("removing");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.maxHeight = "0px";
        card.style.paddingTop = "0px";
        card.style.paddingBottom = "0px";
        card.style.marginTop = "0px";
        card.style.marginBottom = "0px";
        card.style.borderWidth = "0px";
      });
    });
    // Wait for animation
    await new Promise(r => setTimeout(r, 350));
  }

  try {
    const res = await TasksAPI.update(id, { completed: completing });
    
    // Update local state
    const idx = state.allTasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      state.allTasks[idx] = res.task;
      if (res.xp_earned) {
        state.user.xp = res.xp || state.user.xp;
        state.user.level = res.level || state.user.level;
        state.user.streak = res.streak || state.user.streak;
      }
    }

    if (completing) {
      spawnConfetti();
      const xpMsg = res.xp_earned ? ` +${res.xp_earned} XP!` : "";
      const lvlMsg = res.leveled_up ? ` 🎉 Level Up → ${res.level}!` : "";
      Toast.success(`Task complete!${xpMsg}${lvlMsg}`);
    } else {
      Toast.info("Task marked as pending");
    }
    filterAndRenderTasks();
    await loadStats(true);
  } catch (err) {
    Toast.error("Update failed: " + err.message);
    if (chk) chk.classList.toggle("checked", !completing);
    if (willDisappear && card) card.classList.remove("removing");
  }
}

// ── Delete task ───────────────────────────────────────────
async function deleteTask(id) {
  const card = $("card-" + id);
  if (card) {
    card.style.maxHeight = card.offsetHeight + "px";
    card.classList.add("removing");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.maxHeight = "0px";
        card.style.paddingTop = "0px";
        card.style.paddingBottom = "0px";
        card.style.marginTop = "0px";
        card.style.marginBottom = "0px";
        card.style.borderWidth = "0px";
      });
    });
    await new Promise(r => setTimeout(r, 350));
  }
  try {
    await TasksAPI.delete(id);
    Toast.info("Task removed");
    state.allTasks = state.allTasks.filter(t => t.id !== id);
    filterAndRenderTasks();
    await loadStats(true);
  } catch (err) {
    Toast.error("Delete failed: " + err.message);
    if (card) card.classList.remove("removing");
  }
}

// ── Filter ────────────────────────────────────────────────
function setFilter(f, btn) {
  state.filter = f;
  document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  filterAndRenderTasks();
}

function onSearch(val) {
  state.searchQuery = val;
  filterAndRenderTasks();
}

// ── FOCUS MODE ────────────────────────────────────────────
function openFocusMode(taskId, taskName) {
  focus.taskId   = taskId;
  focus.taskName = taskName;
  $("focusTaskName").textContent = taskName;
  resetFocusTimer(25);
  $("focusOverlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeFocusMode() {
  clearInterval(focus.interval);
  focus.running  = false;
  focus.interval = null;
  $("focusOverlay").classList.remove("active");
  document.body.style.overflow = "";
  $("focusTimerBtn").textContent = "▶ Start";
  $("focusPhase").textContent    = "Ready";
}

function setFocusDuration(min, btn) {
  document.querySelectorAll(".dur-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  resetFocusTimer(min);
}

function resetFocusTimer(min) {
  clearInterval(focus.interval);
  focus.running  = false;
  focus.seconds  = min * 60;
  focus.total    = min * 60;
  focus.interval = null;
  updateFocusUI();
  $("focusTimerBtn").textContent = "▶ Start";
  $("focusPhase").textContent    = "Ready";
}

function toggleFocusTimer() {
  if (!focus.running) {
    focus.running = true;
    $("focusTimerBtn").textContent = "⏸ Pause";
    $("focusPhase").textContent    = "Focusing…";
    focus.interval = setInterval(() => {
      focus.seconds--;
      updateFocusUI();
      if (focus.seconds <= 0) {
        clearInterval(focus.interval);
        focus.running = false;
        $("focusPhase").textContent    = "Session Complete! 🎉";
        $("focusTimerBtn").textContent = "▶ Restart";
        completeFocusSession();
      }
    }, 1000);
  } else {
    clearInterval(focus.interval);
    focus.running  = false;
    focus.interval = null;
    $("focusTimerBtn").textContent = "▶ Resume";
    $("focusPhase").textContent    = "Paused";
  }
}

async function completeFocusSession() {
  spawnConfetti(40);
  try {
    const min = Math.round(focus.total / 60);
    const res = await TasksAPI.logFocus(focus.taskId, min);
    Toast.success(`Focus complete! +${res.xp_earned} XP 🚀`);
    if (res.leveled_up) Toast.success(`🎉 LEVEL UP! You're now Level ${res.level}!`);
    await loadStats();
  } catch (err) {
    console.warn("Focus log error:", err.message);
  }
}

function updateFocusUI() {
  const m = Math.floor(focus.seconds / 60).toString().padStart(2, "0");
  const s = (focus.seconds % 60).toString().padStart(2, "0");
  $("focusTimerDisplay").textContent = `${m}:${s}`;

  const pct    = focus.seconds / focus.total;
  const offset = CIRCUMFERENCE * (1 - pct);
  const ring   = $("focusRingFill");
  if (ring) ring.style.strokeDashoffset = offset;
}

// ── STATS SECTION ─────────────────────────────────────────
function renderStatsSection() {
  const s = state.stats;
  if (!s || !s.total) return;

  // Progress ring
  const rate = s.completion_rate || 0;
  const ringCirc = 2 * Math.PI * 52;
  const ring = $("statsRingFill");
  if (ring) {
    ring.style.strokeDasharray  = ringCirc;
    ring.style.strokeDashoffset = ringCirc * (1 - rate / 100);
  }
  const rateEl = $("statsRingPct");
  if (rateEl) rateEl.textContent = Math.round(rate) + "%";

  animateCount($("statsTotalNum"),   s.total || 0);
  animateCount($("statsDoneNum"),    s.done || 0);
  animateCount($("statsOverdueNum"), s.overdue || 0);
  animateCount($("statsFocusNum"),   s.focus_sessions || 0);
  animateCount($("statsFocusMin"),   s.focus_minutes || 0);

  const minutes = s.focus_minutes || 0;
  const fmtEl   = $("statsFocusHr");
  if (fmtEl) fmtEl.textContent = minutes >= 60 ? `${(minutes/60).toFixed(1)}h` : `${minutes}m`;
}

// ── SETTINGS SECTION ──────────────────────────────────────
function renderSettingsSection() {
  const u = state.user;
  if (!u) return;
  const nameEl  = $("settingsName");
  const emailEl = $("settingsEmail");
  if (nameEl)  nameEl.textContent  = u.name || "";
  if (emailEl) emailEl.textContent = u.email || "";
}

async function handleChangePassword(e) {
  e.preventDefault();
  const btn    = $("changePwBtn");
  const currPw = $("currPw").value;
  const newPw  = $("newPw").value;
  const confPw = $("confPw").value;

  if (newPw !== confPw) { Toast.warn("New passwords don't match!"); return; }
  if (newPw.length < 6) { Toast.warn("New password must be at least 6 characters"); return; }

  btnLoading(btn, true);
  try {
    const user = fbCurrentUser();
    if (!user || !user.email) throw new Error("Not authenticated");

    // Re-authenticate with current password first (Firebase requirement)
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currPw);
    await user.reauthenticateWithCredential(credential);

    // Now update to the new password
    await user.updatePassword(newPw);
    Toast.success("Password changed successfully! 🔐");
    e.target.reset();
  } catch (err) {
    const msgMap = {
      "auth/wrong-password":        "Current password is incorrect",
      "auth/weak-password":         "New password is too weak — use 6+ characters",
      "auth/too-many-requests":     "Too many attempts. Try again later",
      "auth/requires-recent-login": "Please log out and log back in before changing your password"
    };
    Toast.error(msgMap[err.code] || err.message || "Password change failed");
  } finally {
    btnLoading(btn, false);
  }
}

// ── LOGOUT ────────────────────────────────────────────────
async function logout() {
  Toast.info("Logged out. See you soon! 👋");
  await Auth.logout();        // clears localStorage + Firebase signOut
  setTimeout(() => { window.location.href = "/"; }, 800);
}

// ── Reminder checks ───────────────────────────────────────
function scheduleReminderCheck() {
  setInterval(() => {
    if (!state.tasks) return;
    const now = new Date();
    state.tasks.forEach(t => {
      if (t.completed) return;
      const due  = new Date(`${t.due_date}T${t.due_time}`);
      const diff = due - now;
      if (diff > 0 && diff <= 300000 && !t._earlyNotified) {
        t._earlyNotified = true;
        Toast.warn(`⏰ "${t.title}" is due in 5 minutes!`);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("⏰ Upcoming Task", { body: `${t.title} is due in 5 minutes` });
        }
      }
    });
  }, 60000);
}

// ── Keyboard shortcuts ────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeFocusMode();
    closeSidebar();
  }
  // Ctrl+/ to focus search
  if (e.ctrlKey && e.key === "/") {
    const s = $("searchInput");
    if (s) { s.focus(); e.preventDefault(); }
  }
});

// ── Request notification permission ──────────────────────
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}

// (init is called at the top after fbAuthReady resolves)
