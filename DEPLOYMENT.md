# 🚀 Free Cloud Deployment Guide for TutorTech LMS

This project is completely configured and ready to be hosted for free on **Vercel** or **Netlify**.

---

## ⚡ Option 1: Deploy on Vercel (Recommended, Fastest & 100% Free)

Vercel provides free global CDN hosting with automatic SSL and serverless API execution.

### Step-by-Step Instructions:
1. **Push your code to GitHub**:
   - Create a free GitHub account if you don't have one ([github.com](https://github.com)).
   - Create a new repository named `tutortech-lms`.
   - In your local terminal inside `tutortech-lms`, run:
     ```bash
     git init
     git add .
     git commit -m "Initial TutorTech LMS deployment"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/tutortech-lms.git
     git push -u origin main
     ```

2. **Deploy on Vercel**:
   - Sign up or log into [vercel.com](https://vercel.com) using your GitHub account.
   - Click **"Add New..."** -> **"Project"**.
   - Select your `tutortech-lms` repository from GitHub.
   - Keep all default settings (the included `vercel.json` and `api/index.js` handle configuration automatically).
   - Click **"Deploy"**.

3. **Done! 🎉**
   - Vercel will provide you with a live URL (e.g. `https://tutortech-lms.vercel.app`).
   - Your students and tutors can access it from any phone, tablet, or PC worldwide!

---

## 🌐 Option 2: Deploy on Netlify (100% Free)

Netlify is another excellent free platform with automated deployments.

### Step-by-Step Instructions:
1. **Push your code to GitHub** (same as Step 1 above).
2. **Deploy on Netlify**:
   - Go to [netlify.com](https://www.netlify.com) and log in with GitHub.
   - Click **"Add new site"** -> **"Import an existing project"**.
   - Select **GitHub** and choose your `tutortech-lms` repository.
   - The included `netlify.toml` automatically configures:
     - Publish directory: `public`
     - Functions directory: `netlify/functions`
     - All API and SPA redirect rules.
   - Click **"Deploy site"**.

3. **Done! 🎉**
   - Netlify will assign a live URL (e.g. `https://tutortech-lms.netlify.app`).

---

## 💻 Option 3: Run Locally with 1 Click

If you ever want to run the LMS locally on your computer:
- Double-click [`Start-TutorTech-LMS.bat`](./Start-TutorTech-LMS.bat), or
- Open PowerShell and run:
  ```powershell
  npm start
  ```
- Access at `http://localhost:3000`.

---

## 🔑 Login Accounts (Pre-configured)
- **Tutor / Admin**: `admin` / `admin123`
- **Student 1**: `alex.turner` / `alex123`
- **Student 2**: `sarah.khan` / `sarah123`
