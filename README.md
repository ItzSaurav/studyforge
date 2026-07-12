# 🛡️ StudyForge

> **Gamify your productivity and forge better study habits.**

StudyForge takes your boring to-do lists and turns them into an RPG. Complete tasks, earn XP, level up, and maintain your daily streak. It's a gamified task management app built to keep students motivated.

## 🚀 What It Does

StudyForge isn't just a checklist; it's a progression system for your real life:
- **XP & Leveling:** Every completed task grants XP. Hit the threshold to level up.
- **Streak System:** Consistency is rewarded. Log in and complete tasks daily to keep the fire burning.
- **Secure Sync:** Your stats and tasks are safely stored and synced across devices using Firebase.
- **Clean Dashboard:** A modern, distraction-free UI to focus on what matters.

## 🛠 Tech Stack

This project uses a serverless architecture where the client communicates directly with Firebase:
- **Database & Auth:** Firebase Firestore & Firebase Authentication (Client-side)
- **Frontend:** Vanilla HTML/CSS/JavaScript (with custom API wrappers)
- **Deployment:** Vercel (Static / Serverless config)

## 💻 Getting Started Locally

Want to spin up your own forge?

1. **Clone the repo:**
   ```bash
   git clone https://github.com/ItzSaurav/studyforge.git
   cd studyforge
   ```

2. **Install the dependencies:**
   ```bash
   pip install -r studyforge/requirements.txt
   ```

3. **Set up Firebase:**
   Create a Firebase project, copy your web config, and place it in the `studyforge/static/js/app.js` file (or wherever initialized).

4. **Start the local server:**
   You can serve the `studyforge/static` directory using any static file server:
   ```bash
   npx serve studyforge/static
   ```

## 🌍 Deployment

StudyForge is configured for Vercel. The included `vercel.json` ensures that Flask routes correctly handle the static assets and SPA logic in a serverless environment.

---
*Built by [Saurav](https://github.com/ItzSaurav) – Backend Developer & Automation Enthusiast.*
