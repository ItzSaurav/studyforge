# ⚔️ StudyForge

**Turn your study grind into a game.** A gamified task management app that rewards you with XP, levels, and streaks for actually getting stuff done.

---

## What is this?

StudyForge is a web app that makes studying feel less like a chore and more like a quest. You log tasks, complete them, earn XP, level up, and maintain daily streaks — all while keeping your academic life organized.

Built it because every other to-do app felt lifeless. If I'm gonna stare at a task list for hours, it might as well feel rewarding.

## ✨ Features

| Feature | What it does |
|---|---|
| **🎮 XP & Leveling** | Earn XP for completing tasks. Level up as you grind. The formula's simple: `level × 100` XP to hit the next level. |
| **🔥 Streak System** | Complete tasks on consecutive days to build a streak. Miss a day? Back to 1. Keeps you honest. |
| **📋 Task Management** | Create, filter, search, and manage your study tasks. Priority-based XP rewards (high = 20, medium = 10 bonus XP). |
| **🎯 Focus Mode** | Built-in 25-minute Pomodoro timer. Lock in on a single task, earn 50 bonus XP when you finish. |
| **🔐 Firebase Auth** | Google sign-in via Firebase Authentication. No passwords to forget. |
| **☁️ Cloud Sync** | All data lives in Firestore — your tasks and progress follow you across devices. |
| **🔔 Reminders** | Scheduled reminder checks so you don't forget that assignment due at midnight. |

## 🛠️ Tech Stack

- **Backend:** Python + Flask (serves static HTML, minimal routing)
- **Frontend:** Vanilla JavaScript, HTML, CSS — no framework overhead
- **Database:** Firebase Firestore (real-time, cloud-hosted)
- **Auth:** Firebase Authentication (Google sign-in)
- **Deployment:** Vercel (static rewrites for SPA-style routing)
- **Config:** python-dotenv for environment variables

## 📁 Project Structure

```
studyforge/
├── app.py                 # Flask server — routes for / and /dashboard
├── config.py              # App config (debug, port, JWT, DB path)
├── requirements.txt       # Python deps: flask, python-dotenv, firebase-admin
├── vercel.json            # Vercel rewrite rules for deployment
├── firestore.rules        # Firestore security rules
├── START_STUDYFORGE.bat   # One-click Windows startup script
└── static/
    ├── index.html         # Landing page / login
    ├── dashboard.html     # Main app dashboard
    ├── css/               # Styles
    └── js/
        ├── api.js         # Firebase Firestore API client (XP, tasks, auth)
        └── app.js         # Dashboard logic (UI, focus mode, navigation)
```

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- A Firebase project with Firestore and Authentication enabled
- (Optional) A Vercel account for deployment

### Local Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/YOUR_USERNAME/studyforge.git
   cd studyforge/studyforge
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your environment**

   Create a `.env` file inside `studyforge/`:
   ```env
   FLASK_DEBUG=1
   PORT=5000
   JWT_SECRET=your_secret_here
   ```

4. **Configure Firebase**

   Make sure your Firebase config is set up in the frontend JS files (API keys, project ID, etc.). Deploy the `firestore.rules` to your Firebase project.

5. **Run it**
   ```bash
   python app.py
   ```
   Or on Windows, just double-click `START_STUDYFORGE.bat`.

6. **Open** [http://localhost:5000](http://localhost:5000) and start grinding.

## ☁️ Deployment (Vercel)

The app is configured for Vercel with static rewrites:

- `/` → `static/index.html`
- `/dashboard` → `static/dashboard.html`

To deploy:
```bash
cd studyforge
vercel --prod
```

The `vercel.json` handles the routing — no server-side rendering needed in production since all data ops go directly to Firebase from the client.

## 🧠 How the XP System Works

```
Base XP per task:     30 XP
High priority bonus:  +20 XP
Medium priority bonus: +10 XP
Focus mode bonus:     +50 XP
Level up threshold:   level × 100 XP
```

Complete a high-priority task in focus mode? That's **100 XP** in one shot. Not bad.

## 📝 License

Do whatever you want with it. If you build something cool on top of this, lmk.

---

*Built with caffeine and questionable time management skills.* ☕
