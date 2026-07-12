/* =========================================================
   StudyForge — Firebase Initialization
   Firebase JS SDK v9 compat (CDN) setup + Auth helpers
   ========================================================= */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAkmQXIFoF1wQPzpkbQN1MYWkV1PUnP8Tc",
  authDomain: "anagha-sidp.firebaseapp.com",
  projectId: "anagha-sidp",
  storageBucket: "anagha-sidp.firebasestorage.app",
  messagingSenderId: "747145879023",
  appId: "1:747145879023:web:eaa9e73081caff51a72a1a",
  measurementId: "G-BN9CGRK1F1"
};

// Initialize Firebase app (compat SDK loaded via CDN in HTML)
firebase.initializeApp(firebaseConfig);

// Auth & Firestore instances
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();

// ── Firebase Auth helpers ──────────────────────────────────

/**
 * Sign in with email + password via Firebase.
 * Returns the Firebase UserCredential.
 */
async function fbSignIn(email, password) {
  return fbAuth.signInWithEmailAndPassword(email, password);
}

/**
 * Register a new user via Firebase Auth.
 * Optionally sets displayName on the Firebase profile.
 */
async function fbRegister(name, email, password) {
  const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
  // Store display name in Firebase profile too
  await cred.user.updateProfile({ displayName: name });
  return cred;
}

/**
 * Sign out the current Firebase user.
 */
async function fbSignOut() {
  return fbAuth.signOut();
}

/**
 * Get the current Firebase user's ID token (auto-refreshed).
 * Returns null if no user is signed in.
 */
async function fbGetIdToken() {
  const user = fbAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(/* forceRefresh= */ false);
}

/**
 * Get the currently signed-in Firebase user (or null).
 */
function fbCurrentUser() {
  return fbAuth.currentUser;
}

/**
 * Wait for Firebase Auth to initialise and return the current user.
 * Use this instead of fbCurrentUser() on page-load to avoid race conditions.
 */
function fbAuthReady() {
  return new Promise((resolve) => {
    const unsubscribe = fbAuth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
