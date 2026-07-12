/* =========================================================
   StudyForge — Shared UI Utilities
   Toast, confetti, theme toggle, password strength, utils
   ========================================================= */

// ── Theme Toggle ──────────────────────────────────────────
const Theme = (() => {
  const KEY = "sf_theme";

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }

  function toggle() {
    const current = localStorage.getItem(KEY) || "dark";
    apply(current === "dark" ? "light" : "dark");
  }

  function init() {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem(KEY);
    if (saved) {
      apply(saved);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      apply(prefersDark ? "dark" : "light");
    }
  }

  function current() {
    return localStorage.getItem(KEY) || "dark";
  }

  return { init, toggle, apply, current };
})();

// Initialize theme immediately (before DOM paint to avoid flash)
Theme.init();

// ── Toast system ──────────────────────────────────────────
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.getElementById("toast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function show(msg, type = "info", duration = 3500) {
    const icons = { success: "✅", error: "❌", info: "💡", warn: "⚠️" };
    const c = getContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type]}</span> ${msg}`;
    c.appendChild(el);

    setTimeout(() => {
      el.classList.add("removing");
      el.addEventListener("animationend", () => el.remove());
    }, duration);
  }

  return {
    success: (msg) => show(msg, "success"),
    error:   (msg) => show(msg, "error", 5000),
    info:    (msg) => show(msg, "info"),
    warn:    (msg) => show(msg, "warn")
  };
})();

// ── Confetti ──────────────────────────────────────────────
function spawnConfetti(count = 55) {
  const colors = ["#9b59ff","#f472b6","#c084fc","#e879f9","#fb7185","#a78bfa","#f9a8d4","#7c3aed","#db2777"];
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.left       = Math.random() * 100 + "vw";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    const dur = 1.4 + Math.random() * 1.8;
    el.style.animationDuration = dur + "s";
    el.style.animationDelay    = Math.random() * 0.5 + "s";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + 0.8) * 1000);
  }
}

// ── Password strength meter ───────────────────────────────
function calcPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

function renderPasswordStrength(pw, fillEl, hintEl) {
  const score = calcPasswordStrength(pw);
  const pct   = (score / 5) * 100;
  const map   = [
    { color: "#ff4d6d", label: "Too weak" },
    { color: "#ff8c4d", label: "Weak" },
    { color: "#ffb347", label: "Fair" },
    { color: "#4dffb4", label: "Good" },
    { color: "#4dffb4", label: "Strong" },
    { color: "#4dffb4", label: "Very strong 💪" }
  ];
  const info = map[score] || map[0];
  if (fillEl) { fillEl.style.width = pct + "%"; fillEl.style.background = info.color; }
  if (hintEl) { hintEl.textContent = pw ? info.label : ""; }
  return score;
}

// ── Form validation helpers ───────────────────────────────
function setFieldError(inputId, errorId, msg) {
  const inp = document.getElementById(inputId);
  const err = document.getElementById(errorId);
  if (inp) inp.classList.toggle("error-field", !!msg);
  if (err) {
    err.textContent = msg || "";
    err.classList.toggle("visible", !!msg);
  }
}

function clearAllErrors(...errorIds) {
  errorIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.classList.remove("visible"); }
  });
}

// ── Animate number counter ────────────────────────────────
function animateCount(el, target, duration = 600) {
  if (!el) return;
  const start    = parseInt(el.textContent) || 0;
  const diff     = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased  = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Date / time helpers ───────────────────────────────────
function formatDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "—";
  const dt = new Date(`${dateStr}T${timeStr}`);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "";
  const dt  = new Date(`${dateStr}T${timeStr}`);
  const now = new Date();
  const diff = dt - now;
  const abs  = Math.abs(diff);

  if (abs < 60000)       return diff > 0 ? "in a moment" : "just now";
  if (abs < 3600000)     return `${Math.round(abs/60000)}m ${diff > 0 ? "left" : "ago"}`;
  if (abs < 86400000)    return `${Math.round(abs/3600000)}h ${diff > 0 ? "left" : "ago"}`;
  return `${Math.round(abs/86400000)}d ${diff > 0 ? "left" : "ago"}`;
}

// ── Escape HTML ───────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Subject color palette ─────────────────────────────────
const SUBJECT_COLORS = [
  { bg: "rgba(155, 89,255,0.15)", color: "#c084fc", border: "rgba(155, 89,255,0.32)" },  // violet
  { bg: "rgba(244,114,182,0.15)", color: "#f472b6", border: "rgba(244,114,182,0.32)" },  // pink
  { bg: "rgba(192,132,252,0.15)", color: "#a78bfa", border: "rgba(192,132,252,0.32)" },  // lavender
  { bg: "rgba(232,121,249,0.15)", color: "#e879f9", border: "rgba(232,121,249,0.32)" },  // magenta
  { bg: "rgba(251,113,133,0.15)", color: "#fb7185", border: "rgba(251,113,133,0.32)" },  // rose
  { bg: "rgba(167,139,250,0.15)", color: "#9b59ff", border: "rgba(167,139,250,0.32)" },  // purple
];
let _subjectMap = {};
let _subjectIdx = 0;

function getSubjectStyle(subject) {
  const k = (subject || "general").toLowerCase().trim();
  if (!_subjectMap[k]) { _subjectMap[k] = _subjectIdx++ % SUBJECT_COLORS.length; }
  return SUBJECT_COLORS[_subjectMap[k]];
}

// ── Button loading state ──────────────────────────────────
function btnLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle("loading", loading);
}

// ── Greeting ──────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
