# 🎓 TutorTech LMS - Online Tutoring Platform

**TutorTech LMS** is a completely **free**, modern, self-hosted Learning Management System designed specifically for online tutoring companies. Inspired by **Google Classroom**, it provides a streamlined experience for students and tutors with real-time class starting times, live Google Meet buttons, interactive board links, PDF homework workflows, and persistent device logins.

---

## 🌟 Key Features

### 1. 🔐 Unique Student Logins & Persistent Device Sessions
- Each student gets a **unique username and password** created by the tutor/admin.
- **"Login Once" Feature**: Students stay permanently logged into their device via persistent session storage (`localStorage` + token auth) — no annoying daily logins!
- Automatic session restoration on browser refresh or return visits.

### 2. 🏛️ Google Classroom-Inspired Interface
- **Class Stream**: Announcements, schedule indicators, tutor messages, and upcoming deadlines.
- **Classwork & Homework**:
  - Filter by units and topics.
  - Attached PDF problem sheets with in-app PDF preview and download buttons.
  - Student homework submission system (upload PDFs/files or paste notes/links).
  - Status badges: `Assigned`, `Turn-in Done`, and `Graded (96/100)`.
- **Teacher Review & Grading**:
  - Tutors can view student submissions, download student work, input grades, and write personal feedback.
- **PDF Resource Library**:
  - Store formula sheets, lecture notes, past exam papers, and syllabi.
  - In-app modal PDF viewer.
- **Whiteboard Collaboration Hub**:
  - Direct 1-click links to external boards (**Excalidraw**, **Miro**, **Google Jamboard**).
  - Built-in interactive HTML5 sketchpad with Pen, Eraser, Color picker, and Clear board tools.
- **People / Roster**: View tutors and enrolled classmates.

### 3. ⏰ Live Starting Times & Google Meet Integration
- **Live Countdown Timer**: Automatically updates every second on class cards (e.g., `Starts in 14m 20s`, `🔴 LIVE NOW`).
- **Direct 1-Click Join**: Green **"Join Google Meet"** button launches your video call instantly.
- **Direct 1-Click Board**: Dedicated **"Open Board"** button launches the shared collaborative whiteboard.

### 4. 👨‍🏫 Tutor / Admin Control Panel
- Create new classes with custom subjects, schedules, Google Meet links, and board links.
- Edit class meeting links anytime.
- Register new students with unique credentials and assign them to specific subjects.

---

## 🚀 Quick Start (Running Locally)

### Option A: 1-Click Windows Launcher (Easiest)
Simply double-click:
```
Start-TutorTech-LMS.bat
```
This automatically starts the server and opens `http://localhost:3000` in your web browser!

---

### Option B: Terminal Command
1. Open PowerShell or Command Prompt in the project folder:
   ```powershell
   cd "C:\Users\SK LAPTOPS\.gemini\antigravity\scratch\tutortech-lms"
   ```
2. Start the server:
   ```powershell
   npm start
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## 🔑 Pre-seeded Accounts (For Instant Testing)

| Role | Username / Email | Password | Access / Notes |
| :--- | :--- | :--- | :--- |
| **Director / Lead Tutor (Admin)** | `admin` *(or admin@tutortech.com)* | `admin123` | Full access: Create classes, register students, grade homework, post announcements |
| **Student 1** | `alex.turner` | `alex123` | Enrolled in AP Physics 1, Advanced Calculus, SAT Prep |
| **Student 2** | `sarah.khan` | `sarah123` | Enrolled in AP Physics 1, IB Chemistry HL |
| **Student 3** | `david.lee` | `david123` | Enrolled in Advanced Calculus, SAT Prep |

> **Tip:** You can also click the **"Quick Demo Logins"** buttons on the login screen to sign in with 1 click!

---

## 🌐 100% Free Cloud Deployment Options

You can host TutorTech online completely free with $0 ongoing cost:

### 1. Render.com (Recommended - 100% Free Node.js Hosting)
1. Push this folder to a free GitHub repository.
2. Sign up at [Render.com](https://render.com) (free tier).
3. Click **New +** -> **Web Service**.
4. Select your GitHub repository.
5. Set Build Command: `npm install` and Start Command: `node server.js`.
6. Your LMS is now live with a free SSL domain (e.g., `https://tutortech.onrender.com`)!

### 2. Free Cloudflare Tunnel (Run from your laptop for the world)
If you want to host it directly from your computer without uploading code:
1. Download [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).
2. Run:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
3. Cloudflare gives you a free secure HTTPS URL (e.g. `https://random-subdomain.trycloudflare.com`) that students can access from anywhere in the world!

---

## 📂 Project Architecture

```
tutortech-lms/
├── server.js               # Node.js + Express backend (REST API & Auth)
├── package.json            # Dependencies (Express, CORS, Multer)
├── Start-TutorTech-LMS.bat # Double-click launcher for Windows
├── data/
│   └── db.json             # Persistent database (stores users, classes, assignments, tokens)
├── uploads/                # Directory for uploaded homework PDFs and files
└── public/
    ├── index.html          # Google Classroom replica frontend layout
    ├── css/
    │   └── styles.css      # Styling, pulsing badges, and custom scrollbars
    ├── js/
    │   ├── api.js          # Persistent token auth & API communication
    │   └── app.js          # App controller, live countdown timers, sketchpad
    └── sample-resources/   # Sample downloadable PDFs
```

---

## 📄 License
MIT License - Free for commercial and private use by **TutorTech**.
