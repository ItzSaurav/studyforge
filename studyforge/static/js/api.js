/* =========================================================
   StudyForge — Firebase API Client
   All data operations go directly to Firebase Firestore.
   No backend server required.
   ========================================================= */

// ── Token / Session storage ───────────────────────────────
const Auth = {
  getUser:    ()  => JSON.parse(localStorage.getItem("sf_user") || "null"),
  setUser:    (u) => localStorage.setItem("sf_user", JSON.stringify(u)),
  removeUser: ()  => localStorage.removeItem("sf_user"),

  isLoggedIn: ()  => !!fbCurrentUser(),

  logout: async () => {
    localStorage.removeItem("sf_user");
    await fbSignOut();
  }
};

// ── XP Logic Helpers ──────────────────────────────────────
const XP_BASE   = 30;
const XP_HIGH   = 20;
const XP_MEDIUM = 10;
const XP_FOCUS  = 50;

function xpForLevel(level) {
  return level * 100;
}

async function awardXP(userId, amount) {
  const userRef = fbDb.collection("users").doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) return { xp: 0, level: 1, leveled_up: false };
  
  let data = doc.data();
  let xp = (data.xp || 0) + amount;
  let level = data.level || 1;
  let leveled_up = false;
  
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    leveled_up = true;
  }
  
  await userRef.update({ xp, level });
  return { xp, level, leveled_up };
}

async function updateStreak(userId) {
  const userRef = fbDb.collection("users").doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) return 0;
  
  let data = doc.data();
  // We use local date strings (YYYY-MM-DD)
  let today = new Date().toLocaleDateString("en-CA"); 
  let yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  let yesterday = yesterdayObj.toLocaleDateString("en-CA");
  
  if (data.last_done === today) return data.streak || 0;
  
  let streak = (data.last_done === yesterday) ? (data.streak || 0) + 1 : 1;
  await userRef.update({ streak, last_done: today });
  return streak;
}

// ── Auth API ──────────────────────────────────────────────
const AuthAPI = {
  syncUser: async (payload) => {
    const uid = payload.firebase_uid;
    const userRef = fbDb.collection("users").doc(uid);
    const doc = await userRef.get();
    
    let user = {
      id: uid,
      name: payload.name,
      email: payload.email,
      initials: payload.name ? payload.name.slice(0, 2).toUpperCase() : "??",
      xp: 0,
      level: 1,
      streak: 0,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!doc.exists) {
      await userRef.set(user);
    } else {
      user = { ...user, ...doc.data(), id: uid };
    }
    
    return { message: "User synced", user };
  },
  
  me: async () => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    const doc = await fbDb.collection("users").doc(user.uid).get();
    if (!doc.exists) {
      return await AuthAPI.syncUser({
        name: user.displayName || user.email.split("@")[0],
        email: user.email,
        firebase_uid: user.uid
      });
    }
    
    return {
      user: { ...doc.data(), id: user.uid }
    };
  },
  
  changePassword: async () => {
    // Already handled in app.js using Firebase Auth
    return {};
  }
};

// ── Tasks API ─────────────────────────────────────────────
const TasksAPI = {
  getAll: async (params = {}) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    let query = fbDb.collection("tasks").where("user_id", "==", user.uid);
    
    if (params.status === "completed") query = query.where("completed", "==", true);
    if (params.status === "pending") query = query.where("completed", "==", false);
    
    const snapshot = await query.get();
    let tasks = [];
    snapshot.forEach(doc => {
      tasks.push({ ...doc.data(), id: doc.id });
    });
    
    // Client-side filtering for features missing index support
    if (params.search) {
      const s = params.search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || (t.subject && t.subject.toLowerCase().includes(s)));
    }
    
    const todayStr = new Date().toLocaleDateString("en-CA");
    const now = new Date();
    
    if (params.due === "today") {
      tasks = tasks.filter(t => t.due_date === todayStr);
    } else if (params.due === "overdue") {
      tasks = tasks.filter(t => {
        if (t.completed) return false;
        const dueDt = new Date(`${t.due_date}T${t.due_time}`);
        return dueDt < now;
      });
    }
    
    // Calculate overdue property for all tasks
    tasks.forEach(t => {
      const dueDt = new Date(`${t.due_date}T${t.due_time}`);
      t.overdue = (!t.completed) && (dueDt < now);
    });
    
    // Sort tasks locally: due_date ASC, due_time ASC
    tasks.sort((a, b) => {
      const timeA = new Date(`${a.due_date}T${a.due_time}`).getTime();
      const timeB = new Date(`${b.due_date}T${b.due_time}`).getTime();
      return timeA - timeB;
    });
    
    return { tasks, count: tasks.length };
  },
  
  create: async (payload) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    const task = {
      ...payload,
      user_id: user.uid,
      completed: false,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await fbDb.collection("tasks").add(task);
    return { message: "Task created", task: { ...task, id: docRef.id } };
  },
  
  update: async (id, payload) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    const taskRef = fbDb.collection("tasks").doc(id);
    const doc = await taskRef.get();
    
    if (!doc.exists || doc.data().user_id !== user.uid) {
      throw new Error("Task not found");
    }
    
    const oldData = doc.data();
    let updates = { ...payload };
    
    let result = { message: "Task updated" };
    
    // Handle completion logic
    if (payload.completed !== undefined) {
      const completing = payload.completed === true;
      const wasDone = oldData.completed === true;
      
      if (completing && !wasDone) {
        updates.completed_at = firebase.firestore.FieldValue.serverTimestamp();
        
        let bonus = 0;
        if (oldData.priority === "high") bonus = XP_HIGH;
        else if (oldData.priority === "medium") bonus = XP_MEDIUM;
        
        const xpAmt = XP_BASE + bonus;
        
        const xpRes = await awardXP(user.uid, xpAmt);
        const streak = await updateStreak(user.uid);
        
        result = {
          ...result,
          xp_earned: xpAmt,
          level: xpRes.level,
          leveled_up: xpRes.leveled_up,
          streak: streak
        };
      } else if (!completing && wasDone) {
        updates.completed_at = null;
      }
    }
    
    await taskRef.update(updates);
    
    // Add overdue calculation
    const newData = { ...oldData, ...updates, id };
    const dueDt = new Date(`${newData.due_date}T${newData.due_time}`);
    newData.overdue = (!newData.completed) && (dueDt < new Date());
    
    return { ...result, task: newData };
  },
  
  delete: async (id) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    await fbDb.collection("tasks").doc(id).delete();
    return { message: "Task deleted" };
  },
  
  logFocus: async (id, min) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    await fbDb.collection("focus_sessions").add({
      user_id: user.uid,
      task_id: id,
      duration_min: min,
      xp_earned: XP_FOCUS,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    const xpRes = await awardXP(user.uid, XP_FOCUS);
    
    return {
      message: "Focus session logged! +50 XP",
      xp_earned: XP_FOCUS,
      xp: xpRes.xp,
      level: xpRes.level,
      leveled_up: xpRes.leveled_up
    };
  },
  
  getStats: async (localTasks = null, localUser = null) => {
    const user = fbCurrentUser();
    if (!user) throw new Error("Not authenticated");
    
    // Use local user data if provided, otherwise fetch
    let userData = localUser;
    if (!userData) {
      const userDoc = await fbDb.collection("users").doc(user.uid).get();
      userData = userDoc.exists ? userDoc.data() : { xp: 0, level: 1, streak: 0 };
    }
    
    // Use local tasks if provided, otherwise fetch
    let tasksToProcess = localTasks;
    if (!tasksToProcess) {
      const tasksSnap = await fbDb.collection("tasks").where("user_id", "==", user.uid).get();
      tasksToProcess = [];
      tasksSnap.forEach(doc => tasksToProcess.push(doc.data()));
    }
    let total = 0;
    let done = 0;
    let todayCt = 0;
    let overdue = 0;
    
    const todayStr = new Date().toLocaleDateString("en-CA");
    const now = new Date();
    
    tasksToProcess.forEach(t => {
      total++;
      if (t.completed) done++;
      if (t.due_date === todayStr) todayCt++;
      
      if (!t.completed) {
        const dueDt = new Date(`${t.due_date}T${t.due_time}`);
        if (dueDt < now) overdue++;
      }
    });
    
    const focusSnap = await fbDb.collection("focus_sessions").where("user_id", "==", user.uid).get();
    let focusSessions = 0;
    let focusMinutes = 0;
    focusSnap.forEach(doc => {
      focusSessions++;
      focusMinutes += (doc.data().duration_min || 0);
    });
    
    return {
      total,
      done,
      today: todayCt,
      overdue,
      pending: total - done,
      completion_rate: total > 0 ? (done / total) * 100 : 0,
      focus_sessions: focusSessions,
      focus_minutes: focusMinutes,
      xp: userData.xp || 0,
      level: userData.level || 1,
      streak: userData.streak || 0
    };
  }
};
