const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Detect Serverless execution (Vercel, Netlify, AWS Lambda)
const isServerless = Boolean(
  process.env.VERCEL || 
  process.env.NETLIFY || 
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.SERVERLESS
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Storage folders: In serverless environments, writable storage is in /tmp
const DATA_DIR = isServerless ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const UPLOADS_DIR = isServerless ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const LOCAL_DB_FALLBACK = path.join(__dirname, 'data', 'db.json');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
  console.warn('Directory creation warning (normal in some serverless runtimes):', e.message);
}

// Memory cache fallback for ultra-fast response & serverless safety
let memoryDB = null;

// Configure Multer for PDF and homework uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    } catch (e) {}
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max file size
});

// Helper for initial seed data
function getInitialData() {
  const now = new Date();
  const today1 = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins from now
  const today2 = new Date(now.getTime() + 180 * 60 * 1000); // 3 hours from now
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    users: [
      {
        id: 'usr_admin',
        username: 'admin',
        email: 'admin@tutortech.com',
        password: 'admin123',
        fullName: 'Dr. Robert Vance (Director / Lead Tutor)',
        role: 'teacher',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: '+1 (555) 019-2834',
        bio: 'Senior Tutor & Head of Science & Math at TutorTech'
      },
      {
        id: 'usr_stu_1',
        username: 'alex.turner',
        email: 'alex@tutortech.com',
        password: 'alex123',
        fullName: 'Alex Turner',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        enrolledClasses: ['cls_physics_ap', 'cls_math_adv', 'cls_sat_prep'],
        grade: 'Grade 11'
      },
      {
        id: 'usr_stu_2',
        username: 'sarah.khan',
        email: 'sarah@tutortech.com',
        password: 'sarah123',
        fullName: 'Sarah Khan',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        enrolledClasses: ['cls_physics_ap', 'cls_chem_ib'],
        grade: 'Grade 10'
      },
      {
        id: 'usr_stu_3',
        username: 'david.lee',
        email: 'david@tutortech.com',
        password: 'david123',
        fullName: 'David Lee',
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        enrolledClasses: ['cls_math_adv', 'cls_sat_prep'],
        grade: 'Grade 12'
      }
    ],
    classes: [
      {
        id: 'cls_physics_ap',
        name: 'AP Physics 1: Mechanics & Energy',
        subject: 'Physics',
        section: 'Cohort Alpha - 2026',
        tutorName: 'Dr. Robert Vance',
        tutorEmail: 'admin@tutortech.com',
        scheduleDays: 'Mon, Wed, Fri',
        scheduleTime: '04:30 PM - 05:45 PM',
        nextSessionIso: today1.toISOString(),
        meetLink: 'https://meet.google.com/tut-tech-phy',
        boardLink: 'https://excalidraw.com/#room=tutortech-physics-room',
        themeColor: 'from-blue-600 to-indigo-800',
        accentColor: '#3b82f6',
        bannerImage: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&auto=format&fit=crop&q=80',
        description: 'Comprehensive AP Physics 1 covering Kinematics, Dynamics, Newton\'s Laws, Work-Energy Theorem, and Rotational Motion with live problem-solving.'
      },
      {
        id: 'cls_math_adv',
        name: 'Advanced Calculus & Algebra Mastery',
        subject: 'Mathematics',
        section: 'Honors Track B',
        tutorName: 'Prof. Elena Rostova',
        tutorEmail: 'elena@tutortech.com',
        scheduleDays: 'Tue, Thu, Sat',
        scheduleTime: '06:00 PM - 07:15 PM',
        nextSessionIso: today2.toISOString(),
        meetLink: 'https://meet.google.com/tut-math-adv',
        boardLink: 'https://miro.com/app/board/tutortech-math-workspace/',
        themeColor: 'from-emerald-600 to-teal-800',
        accentColor: '#10b981',
        bannerImage: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&auto=format&fit=crop&q=80',
        description: 'Differential and Integral Calculus, Limits, Derivatives, and practical exam preparation with step-by-step whiteboard walkthroughs.'
      },
      {
        id: 'cls_chem_ib',
        name: 'IB Chemistry HL: Bonding & Kinetics',
        subject: 'Chemistry',
        section: 'IB Diploma Year 1',
        tutorName: 'Dr. Robert Vance',
        tutorEmail: 'admin@tutortech.com',
        scheduleDays: 'Mon, Thu',
        scheduleTime: '03:00 PM - 04:15 PM',
        nextSessionIso: tomorrow.toISOString(),
        meetLink: 'https://meet.google.com/tut-chem-hl',
        boardLink: 'https://excalidraw.com/#room=tutortech-chem-lab',
        themeColor: 'from-amber-600 to-orange-800',
        accentColor: '#f59e0b',
        bannerImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&auto=format&fit=crop&q=80',
        description: 'In-depth molecular structures, stoichiometry, reaction rates, chemical equilibrium, and past paper question dissections.'
      },
      {
        id: 'cls_sat_prep',
        name: 'Digital SAT English & Math Crash Course',
        subject: 'Test Prep',
        section: 'Weekend Intensive',
        tutorName: 'Sarah Jenkins, M.Ed.',
        tutorEmail: 'jenkins@tutortech.com',
        scheduleDays: 'Saturday & Sunday',
        scheduleTime: '11:00 AM - 01:00 PM',
        nextSessionIso: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        meetLink: 'https://meet.google.com/tut-sat-live',
        boardLink: 'https://excalidraw.com/#room=tutortech-sat-mastery',
        themeColor: 'from-purple-600 to-violet-800',
        accentColor: '#8b5cf6',
        bannerImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&auto=format&fit=crop&q=80',
        description: 'Master digital SAT Reading & Writing strategies, Desmos calculator shortcuts, high-frequency math shortcuts, and timed drills.'
      }
    ],
    announcements: [
      {
        id: 'ann_1',
        classId: 'cls_physics_ap',
        author: 'Dr. Robert Vance',
        authorRole: 'Tutor',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        title: 'Welcome to Today\'s Kinematics Session! 🚀',
        content: 'Hi students! Please review Chapter 3 formula sheet before joining today\'s Google Meet. We will be using the interactive Excalidraw board for 2D projectile motion derivations. Keep your scientific calculators handy!',
        pinned: true
      },
      {
        id: 'ann_2',
        classId: 'cls_math_adv',
        author: 'Prof. Elena Rostova',
        authorRole: 'Tutor',
        avatar: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date(now.getTime() - 18 * 3600 * 1000).toISOString(),
        title: 'Weekly Homework Problem Set 4 Uploaded 📚',
        content: 'The problem set for Derivatives and Chain Rule is now live in the Classwork tab. Please submit your step-by-step solutions in PDF format by this Friday midnight.',
        pinned: false
      }
    ],
    assignments: [
      {
        id: 'asg_phy_1',
        classId: 'cls_physics_ap',
        title: 'Homework 03: Projectile Motion & Vector Components',
        topic: 'Unit 1: Kinematics',
        dueDate: new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString(),
        points: 100,
        description: 'Complete questions 1 through 8 from the attached PDF worksheet. Show all free-body vector diagrams and step-by-step kinematic equations. Upload your hand-written work as a scanned PDF or clear photos.',
        attachments: [
          {
            name: 'Unit-1-Kinematics-Homework-3.pdf',
            size: '2.4 MB',
            type: 'pdf',
            url: '/sample-resources/Kinematics-Homework.pdf'
          }
        ]
      },
      {
        id: 'asg_phy_2',
        classId: 'cls_physics_ap',
        title: 'Lab Report: Inclined Plane Friction Analysis',
        topic: 'Unit 2: Dynamics & Friction',
        dueDate: new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString(),
        points: 50,
        description: 'Calculate static vs kinetic coefficient of friction using the experiment data sheet gathered during our last live session.',
        attachments: [
          {
            name: 'Friction-Lab-Template.pdf',
            size: '1.1 MB',
            type: 'pdf',
            url: '/sample-resources/Friction-Lab.pdf'
          }
        ]
      },
      {
        id: 'asg_math_1',
        classId: 'cls_math_adv',
        title: 'Calculus Drill 04: Implicit Differentiation & Related Rates',
        topic: 'Differentiation Techniques',
        dueDate: new Date(now.getTime() + 4 * 24 * 3600 * 1000).toISOString(),
        points: 50,
        description: 'Solve the 12 problems in the attached worksheet. Ensure dy/dx steps are clearly documented.',
        attachments: [
          {
            name: 'Implicit-Diff-Problem-Set.pdf',
            size: '1.8 MB',
            type: 'pdf',
            url: '/sample-resources/Calculus-Drill.pdf'
          }
        ]
      }
    ],
    submissions: [
      {
        id: 'sub_1',
        assignmentId: 'asg_phy_1',
        studentId: 'usr_stu_1',
        studentName: 'Alex Turner',
        submittedAt: new Date(now.getTime() - 5 * 3600 * 1000).toISOString(),
        status: 'graded',
        grade: 96,
        feedback: 'Fantastic derivation on question 6! Just be careful with vector angle sign conventions in question 4.',
        content: 'Completed all 8 projectile motion questions with vector diagrams.',
        files: [
          {
            name: 'AlexTurner-Physics-HW3-Solutions.pdf',
            size: '3.1 MB',
            url: '/sample-resources/Kinematics-Homework.pdf'
          }
        ]
      }
    ],
    materials: [
      {
        id: 'mat_phy_1',
        classId: 'cls_physics_ap',
        title: 'Master Formula Sheet - AP Physics 1 (2026 Edition)',
        category: 'Formula Sheets',
        description: 'Official equations sheet with SI unit references and vector breakdown guides.',
        createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
        file: {
          name: 'AP-Physics-1-Equation-Sheet-TutorTech.pdf',
          size: '1.4 MB',
          url: '/sample-resources/AP-Physics-Formulas.pdf'
        }
      },
      {
        id: 'mat_phy_2',
        classId: 'cls_physics_ap',
        title: 'Lecture 03 Slides & Whiteboard Notes (Annotated)',
        category: 'Lecture Notes',
        description: 'Digital whiteboard notes exported from our Excalidraw session with live annotations.',
        createdAt: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
        file: {
          name: 'Kinematics-Lecture-03-Notes.pdf',
          size: '4.8 MB',
          url: '/sample-resources/Kinematics-Homework.pdf'
        }
      },
      {
        id: 'mat_math_1',
        classId: 'cls_math_adv',
        title: 'Derivative Rules & Trig Identities Quick Reference',
        category: 'Study Guides',
        description: 'Comprehensive 4-page cheat sheet for all standard and inverse trigonometric derivatives.',
        createdAt: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
        file: {
          name: 'Calculus-Derivatives-CheatSheet.pdf',
          size: '950 KB',
          url: '/sample-resources/Calculus-Drill.pdf'
        }
      }
    ],
    tokens: {}
  };
}

// Database helper functions with Serverless resilience
function loadDB() {
  if (memoryDB) return memoryDB;

  // 1. Try reading from target DB file
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDB = JSON.parse(raw);
      return memoryDB;
    } catch (err) {}
  }

  // 2. Try reading from bundled fallback if running in serverless (/tmp)
  if (isServerless && fs.existsSync(LOCAL_DB_FALLBACK)) {
    try {
      const raw = fs.readFileSync(LOCAL_DB_FALLBACK, 'utf-8');
      memoryDB = JSON.parse(raw);
      saveDB(memoryDB);
      return memoryDB;
    } catch (err) {}
  }

  // 3. Re-seed default data
  const initial = getInitialData();
  saveDB(initial);
  memoryDB = initial;
  return initial;
}

function saveDB(data) {
  memoryDB = data;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // If running in an immutable serverless environment, memoryDB remains active for the lambda lifecycle
    console.warn('Note: Persistent file save skipped (memory cache active):', err.message);
  }
}

// Auth Middleware: supports Bearer token or x-auth-token
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-auth-token'];
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  const db = loadDB();
  const userId = db.tokens ? db.tokens[token] : null;
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

// ==========================================
// HEALTH CHECK
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TutorTech LMS',
    environment: isServerless ? 'serverless' : 'standard',
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }

  const db = loadDB();
  const cleanInput = username.trim().toLowerCase();

  const user = db.users.find(
    u => (u.username.toLowerCase() === cleanInput || u.email.toLowerCase() === cleanInput) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }

  // Generate persistent token (never expires unless logged out)
  const token = 'tt_' + crypto.randomBytes(32).toString('hex');
  if (!db.tokens) db.tokens = {};
  db.tokens[token] = user.id;
  saveDB(db);

  const { password: _, ...safeUser } = user;
  res.json({
    token,
    user: safeUser,
    message: 'Login successful'
  });
});

// GET /api/auth/me - Verify persistent login
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// POST /api/auth/logout - Invalidate session token
app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['x-auth-token'];
  const db = loadDB();
  if (db.tokens && db.tokens[token]) {
    delete db.tokens[token];
    saveDB(db);
  }
  res.json({ message: 'Logged out successfully' });
});

// ==========================================
// STUDENT MANAGEMENT (ADMIN / TUTOR ONLY)
// ==========================================

// GET /api/students - List all registered students
app.get('/api/students', authMiddleware, (req, res) => {
  const db = loadDB();
  const students = db.users
    .filter(u => u.role === 'student')
    .map(({ password: _, ...student }) => student);
  res.json(students);
});

// POST /api/students - Create new student with unique login & password
app.post('/api/students', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors/administrators can register new students' });
  }

  const { username, fullName, password, email, grade, enrolledClasses } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'Username, password, and full name are required' });
  }

  const db = loadDB();
  const cleanUsername = username.trim().toLowerCase();

  const exists = db.users.some(u => u.username.toLowerCase() === cleanUsername);
  if (exists) {
    return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
  }

  const newStudent = {
    id: 'usr_stu_' + Date.now(),
    username: cleanUsername,
    fullName: fullName.trim(),
    email: email ? email.trim() : `${cleanUsername}@tutortech.com`,
    password: password.trim(),
    role: 'student',
    grade: grade || 'High School',
    enrolledClasses: Array.isArray(enrolledClasses) ? enrolledClasses : [],
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`
  };

  db.users.push(newStudent);
  saveDB(db);

  const { password: _, ...safeStudent } = newStudent;
  res.status(201).json({
    student: safeStudent,
    message: `Student ${fullName} registered successfully! Unique Login: "${cleanUsername}"`
  });
});

// ==========================================
// CLASS ROUTES
// ==========================================

// GET /api/classes - Returns classes for current user
app.get('/api/classes', authMiddleware, (req, res) => {
  const db = loadDB();
  let userClasses = [];

  if (req.user.role === 'teacher') {
    userClasses = db.classes || [];
  } else {
    const enrolledIds = req.user.enrolledClasses || [];
    userClasses = (db.classes || []).filter(c => enrolledIds.includes(c.id));
  }

  const enhanced = userClasses.map(cls => {
    const classAssignments = (db.assignments || []).filter(a => a.classId === cls.id);
    const enrolledStudents = (db.users || []).filter(u => u.role === 'student' && u.enrolledClasses?.includes(cls.id));
    return {
      ...cls,
      assignmentCount: classAssignments.length,
      studentCount: enrolledStudents.length
    };
  });

  res.json(enhanced);
});

// GET /api/classes/:id - Get specific class details
app.get('/api/classes/:id', authMiddleware, (req, res) => {
  const db = loadDB();
  const cls = (db.classes || []).find(c => c.id === req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const enrolledStudents = (db.users || [])
    .filter(u => u.role === 'student' && u.enrolledClasses?.includes(cls.id))
    .map(({ password: _, ...s }) => s);

  res.json({
    ...cls,
    students: enrolledStudents
  });
});

// POST /api/classes - Create a new class (Teacher only)
app.post('/api/classes', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can create new classes' });
  }

  const { name, subject, section, scheduleDays, scheduleTime, nextSessionIso, meetLink, boardLink, description } = req.body;
  if (!name || !meetLink) {
    return res.status(400).json({ error: 'Class name and Google Meet link are required' });
  }

  const db = loadDB();
  const colors = [
    'from-blue-600 to-indigo-800',
    'from-emerald-600 to-teal-800',
    'from-purple-600 to-violet-800',
    'from-rose-600 to-pink-800',
    'from-amber-600 to-orange-800',
    'from-cyan-600 to-blue-800'
  ];
  const chosenColor = colors[Math.floor(Math.random() * colors.length)];

  const newClass = {
    id: 'cls_' + Date.now(),
    name: name.trim(),
    subject: subject || 'General',
    section: section || 'Main Batch',
    tutorName: req.user.fullName,
    tutorEmail: req.user.email,
    scheduleDays: scheduleDays || 'Mon, Wed, Fri',
    scheduleTime: scheduleTime || '05:00 PM - 06:15 PM',
    nextSessionIso: nextSessionIso || new Date(Date.now() + 3600 * 1000).toISOString(),
    meetLink: meetLink.trim(),
    boardLink: boardLink ? boardLink.trim() : 'https://excalidraw.com/#room=tutortech-shared-board',
    themeColor: chosenColor,
    description: description || 'Online tutoring session via TutorTech LMS'
  };

  if (!db.classes) db.classes = [];
  db.classes.push(newClass);
  saveDB(db);

  res.status(201).json(newClass);
});

// PUT /api/classes/:id - Update class
app.put('/api/classes/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can edit classes' });
  }

  const db = loadDB();
  const index = (db.classes || []).findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Class not found' });

  const updated = {
    ...db.classes[index],
    ...req.body
  };
  db.classes[index] = updated;
  saveDB(db);

  res.json(updated);
});

// ==========================================
// ANNOUNCEMENTS
// ==========================================
app.get('/api/classes/:id/announcements', authMiddleware, (req, res) => {
  const db = loadDB();
  const classAnnouncements = (db.announcements || [])
    .filter(a => a.classId === req.params.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(classAnnouncements);
});

app.post('/api/classes/:id/announcements', authMiddleware, (req, res) => {
  const { title, content, pinned } = req.body;
  if (!content) return res.status(400).json({ error: 'Announcement content is required' });

  const db = loadDB();
  const newAnnouncement = {
    id: 'ann_' + Date.now(),
    classId: req.params.id,
    author: req.user.fullName,
    authorRole: req.user.role === 'teacher' ? 'Tutor' : 'Student',
    avatar: req.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    title: title || 'Notice',
    content: content.trim(),
    pinned: Boolean(pinned)
  };

  if (!db.announcements) db.announcements = [];
  db.announcements.push(newAnnouncement);
  saveDB(db);

  res.status(201).json(newAnnouncement);
});

// ==========================================
// ASSIGNMENTS & HOMEWORK
// ==========================================
app.get('/api/classes/:id/assignments', authMiddleware, (req, res) => {
  const db = loadDB();
  const list = (db.assignments || []).filter(a => a.classId === req.params.id);

  if (req.user.role === 'student') {
    const studentList = list.map(asg => {
      const mySub = (db.submissions || []).find(s => s.assignmentId === asg.id && s.studentId === req.user.id);
      return {
        ...asg,
        mySubmission: mySub || null,
        isSubmitted: Boolean(mySub),
        status: mySub ? (mySub.grade !== undefined ? 'Graded' : 'Submitted') : 'Assigned'
      };
    });
    return res.json(studentList);
  }

  const tutorList = list.map(asg => {
    const subs = (db.submissions || []).filter(s => s.assignmentId === asg.id);
    return {
      ...asg,
      submissionCount: subs.length
    };
  });

  res.json(tutorList);
});

app.post('/api/classes/:id/assignments', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can create assignments' });
  }

  const { title, topic, dueDate, points, description, attachments } = req.body;
  if (!title) return res.status(400).json({ error: 'Assignment title is required' });

  const db = loadDB();
  const newAssignment = {
    id: 'asg_' + Date.now(),
    classId: req.params.id,
    title: title.trim(),
    topic: topic ? topic.trim() : 'General Homework',
    dueDate: dueDate || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    points: points ? Number(points) : 100,
    description: description || '',
    attachments: Array.isArray(attachments) ? attachments : []
  };

  if (!db.assignments) db.assignments = [];
  db.assignments.push(newAssignment);
  saveDB(db);

  res.status(201).json(newAssignment);
});

app.post('/api/assignments/:id/submit', authMiddleware, (req, res) => {
  const { content, files } = req.body;
  const db = loadDB();

  const assignment = (db.assignments || []).find(a => a.id === req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  if (!db.submissions) db.submissions = [];
  const existingIndex = db.submissions.findIndex(
    s => s.assignmentId === req.params.id && s.studentId === req.user.id
  );

  const submissionData = {
    id: existingIndex >= 0 ? db.submissions[existingIndex].id : 'sub_' + Date.now(),
    assignmentId: req.params.id,
    studentId: req.user.id,
    studentName: req.user.fullName,
    submittedAt: new Date().toISOString(),
    content: content || 'Homework submitted.',
    files: Array.isArray(files) ? files : [],
    status: 'submitted'
  };

  if (existingIndex >= 0) {
    db.submissions[existingIndex] = {
      ...db.submissions[existingIndex],
      ...submissionData
    };
  } else {
    db.submissions.push(submissionData);
  }

  saveDB(db);
  res.json({ message: 'Homework submitted successfully!', submission: submissionData });
});

app.get('/api/assignments/:id/submissions', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can review all submissions' });
  }

  const db = loadDB();
  const submissions = (db.submissions || []).filter(s => s.assignmentId === req.params.id);
  res.json(submissions);
});

app.post('/api/submissions/:id/grade', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can grade submissions' });
  }

  const { grade, feedback } = req.body;
  const db = loadDB();
  const sub = (db.submissions || []).find(s => s.id === req.params.id);
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  sub.grade = Number(grade);
  sub.feedback = feedback || 'Well done!';
  sub.status = 'graded';

  saveDB(db);
  res.json({ message: 'Submission graded successfully', submission: sub });
});

// ==========================================
// STUDY MATERIALS & PDF RESOURCES
// ==========================================
app.get('/api/classes/:id/materials', authMiddleware, (req, res) => {
  const db = loadDB();
  const materials = (db.materials || []).filter(m => m.classId === req.params.id);
  res.json(materials);
});

app.post('/api/classes/:id/materials', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Only tutors can upload study materials' });
  }

  const { title, category, description, file } = req.body;
  if (!title || !file) {
    return res.status(400).json({ error: 'Title and file are required' });
  }

  const db = loadDB();
  const newMaterial = {
    id: 'mat_' + Date.now(),
    classId: req.params.id,
    title: title.trim(),
    category: category || 'General Notes',
    description: description || '',
    createdAt: new Date().toISOString(),
    file
  };

  if (!db.materials) db.materials = [];
  db.materials.push(newMaterial);
  saveDB(db);

  res.status(201).json(newMaterial);
});

// ==========================================
// FILE UPLOAD (PDFs, Homework, Worksheets)
// ==========================================
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const fileSizeMb = (req.file.size / (1024 * 1024)).toFixed(1) + ' MB';

  res.json({
    success: true,
    file: {
      name: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size > 1024 * 1024 ? fileSizeMb : (req.file.size / 1024).toFixed(0) + ' KB',
      url: fileUrl,
      mimetype: req.file.mimetype
    }
  });
});

// Static files
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for Single Page Application
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serverless Export
module.exports = app;

// Only start the standalone HTTP listener if run directly (e.g., node server.js)
if (!isServerless && require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 TutorTech LMS is running successfully!`);
    console.log(`📡 Local URL: http://localhost:${PORT}`);
    console.log(`👥 Pre-seeded Accounts:`);
    console.log(`   - Tutor/Admin: admin / admin123`);
    console.log(`   - Student 1:   alex.turner / alex123`);
    console.log(`   - Student 2:   sarah.khan / sarah123`);
    console.log(`====================================================`);
  });
}
