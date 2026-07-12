/* =========================================================
   StudyForge — Auth Page JS
   Handles: landing page, login modal, register modal
   Now powered by Firebase Authentication
   ========================================================= */

// Redirect if already logged in — wait for Firebase to initialise first
fbAuthReady().then((user) => {
  if (user) {
    window.location.href = "/dashboard";
  }
});

// ── Modal control ─────────────────────────────────────────
const loginOverlay    = document.getElementById("loginOverlay");
const registerOverlay = document.getElementById("registerOverlay");

function openLogin() {
  loginOverlay.classList.add("active");
  registerOverlay.classList.remove("active");
  setTimeout(() => document.getElementById("loginEmail").focus(), 300);
}

function openRegister() {
  registerOverlay.classList.add("active");
  loginOverlay.classList.remove("active");
  setTimeout(() => document.getElementById("regName").focus(), 300);
}

function closeModals() {
  loginOverlay.classList.remove("active");
  registerOverlay.classList.remove("active");
}

// Close on backdrop click
[loginOverlay, registerOverlay].forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModals();
  });
});

// Close on Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});

// ── LOGIN ─────────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  clearAllErrors("loginEmailErr", "loginPwErr");
  const btn = loginForm.querySelector("[type=submit]");

  const email    = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPw").value;

  btnLoading(btn, true);
  try {
    // 1. Sign in with Firebase Auth
    const cred = await fbSignIn(email, password);
    const fbUser = cred.user;

    // 2. Sync / fetch profile from our Flask backend
    const res = await AuthAPI.me();
    const user = res.user || {
      id:       fbUser.uid,
      name:     fbUser.displayName || email.split("@")[0],
      email:    fbUser.email,
      initials: (fbUser.displayName || "??").slice(0, 2).toUpperCase(),
      xp:       0,
      level:    1,
      streak:   0
    };

    Auth.setUser(user);
    Toast.success(`Welcome back, ${user.name}! 👋`);
    setTimeout(() => { window.location.href = "/dashboard"; }, 700);

  } catch (err) {
    // Map Firebase error codes to friendly messages
    const msg = firebaseErrorMessage(err);
    Toast.error(msg);
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential") {
      setFieldError("loginEmail", "loginEmailErr", "Invalid email or password");
    }
  } finally {
    btnLoading(btn, false);
  }
});

// ── REGISTER ─────────────────────────────────────────────
const regForm    = document.getElementById("regForm");
const regPwInput = document.getElementById("regPw");

regPwInput.addEventListener("input", () => {
  renderPasswordStrength(
    regPwInput.value,
    document.getElementById("pwStrengthFill"),
    document.getElementById("pwStrengthHint")
  );
});

regForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  clearAllErrors("regNameErr", "regEmailErr", "regPwErr");
  const btn = regForm.querySelector("[type=submit]");

  const name    = document.getElementById("regName").value.trim();
  const email   = document.getElementById("regEmail").value.trim();
  const password = regPwInput.value;
  const confirm  = document.getElementById("regPwConfirm").value;

  // Client-side validation
  if (!name || name.length < 2) {
    setFieldError("regName", "regNameErr", "Name must be at least 2 characters");
    return;
  }
  if (password !== confirm) {
    setFieldError("regPwConfirm", "regPwConfirmErr", "Passwords do not match");
    return;
  }
  if (calcPasswordStrength(password) < 2) {
    setFieldError("regPw", "regPwErr", "Password is too weak — add numbers or symbols");
    return;
  }

  btnLoading(btn, true);
  try {
    // 1. Create account in Firebase Auth
    const cred   = await fbRegister(name, email, password);
    const fbUser = cred.user;

    // 2. Sync the new user into our Flask/SQLite backend
    const res = await AuthAPI.syncUser({ name, email, firebase_uid: fbUser.uid });
    const user = res.user || {
      id:       fbUser.uid,
      name,
      email:    fbUser.email,
      initials: name.slice(0, 2).toUpperCase(),
      xp:       0,
      level:    1,
      streak:   0
    };

    Auth.setUser(user);
    Toast.success(`Account created! Welcome, ${user.name} 🎉`);
    setTimeout(() => { window.location.href = "/dashboard"; }, 800);

  } catch (err) {
    const msg = firebaseErrorMessage(err);
    Toast.error(msg);
    if (err.code === "auth/email-already-in-use") {
      setFieldError("regEmail", "regEmailErr", "This email is already registered");
    }
    if (err.code === "auth/weak-password") {
      setFieldError("regPw", "regPwErr", "Password is too weak");
    }
  } finally {
    btnLoading(btn, false);
  }
});

// ── Firebase error → human message ────────────────────────
function firebaseErrorMessage(err) {
  const map = {
    "auth/user-not-found":        "No account found with this email",
    "auth/wrong-password":        "Incorrect password",
    "auth/invalid-credential":    "Invalid email or password",
    "auth/invalid-email":         "Please enter a valid email address",
    "auth/email-already-in-use":  "An account with this email already exists",
    "auth/weak-password":         "Password should be at least 6 characters",
    "auth/too-many-requests":     "Too many attempts. Please try again later",
    "auth/network-request-failed":"Network error — check your connection"
  };
  return map[err.code] || err.message || "Authentication failed";
}

// ── Animate hero stats (fake counters for landing) ────────
document.addEventListener("DOMContentLoaded", () => {
  const targets = [
    { id: "heroStat1", val: 12847 },
    { id: "heroStat2", val: 98 },
    { id: "heroStat3", val: 4200 },
  ];
  setTimeout(() => {
    targets.forEach(({ id, val }) => {
      const el = document.getElementById(id);
      if (el) animateCount(el, val, 1800);
    });
  }, 600);
});
