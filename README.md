# StudyForge

A gamified task and study tracker web application designed to reinforce consistent study habits through XP progression, leveling mechanics, and streak tracking.

## Features

- **XP & Level Progression**: Completing study sessions and tasks awards experience points to level up your profile.
- **Streak Tracking**: Daily activity logging to encourage consistent study habits.
- **Task Management**: Categorized task lists with priority flags and completion timestamps.
- **Cloud Sync**: User authentication and real-time state persistence backed by Firebase Authentication and Cloud Firestore.
- **Responsive PWA**: Offline-ready progressive web app layout built with vanilla JavaScript, HTML5, and CSS3.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 Custom Properties
- **Backend Services**: Firebase Authentication, Cloud Firestore
- **Deployment**: Vercel

## Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ItzSaurav/studyforge.git
   cd studyforge
   ```

2. Configure Firebase:
   Update `studyforge/static/js/firebase.js` with your Firebase project configuration credentials.

3. Serve locally:
   ```bash
   python -m http.server 3000 --directory studyforge/static
   ```

4. Open `http://localhost:3000` in your browser.

## License

MIT License.
