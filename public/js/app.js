// TutorTech LMS Application Core Logic
const App = {
  currentUser: null,
  classes: [],
  currentClass: null,
  currentTab: 'stream',
  countdownInterval: null,

  // Sketchpad state
  sketchCtx: null,
  isDrawing: false,
  sketchTool: 'pen',
  sketchColor: '#1e3a8a',
  sketchLineWidth: 3,

  async init() {
    // Initialize icons
    lucide.createIcons();

    // Setup sketch canvas
    this.initSketchCanvas();

    // Check persistent session from localStorage
    const savedUser = API.getCurrentUser();
    if (savedUser) {
      try {
        const verified = await API.verifySession();
        if (verified) {
          this.currentUser = verified;
          this.onAuthenticated();
          return;
        }
      } catch (e) {
        console.warn('Session verification failed, logging out');
      }
    }

    // Otherwise show login view
    this.showLoginView();
  },

  onAuthenticated() {
    this.renderNavUser();
    this.navigateTo('dashboard');
    this.startCountdownTimer();

    // Show/hide teacher specific nav elements
    const isTeacher = this.currentUser.role === 'teacher';
    const studentsBtn = document.getElementById('navStudentsBtn');
    const createClassBtn = document.getElementById('btnCreateClass');
    if (studentsBtn) studentsBtn.classList.toggle('hidden', !isTeacher);
    if (createClassBtn) createClassBtn.classList.toggle('hidden', !isTeacher);
  },

  showLoginView() {
    document.getElementById('viewLogin').classList.remove('hidden');
    document.getElementById('viewDashboard').classList.add('hidden');
    document.getElementById('viewClassDetail').classList.add('hidden');
    document.getElementById('navUserArea').innerHTML = '';
    lucide.createIcons();
  },

  renderNavUser() {
    const userArea = document.getElementById('navUserArea');
    if (!this.currentUser) {
      userArea.innerHTML = '';
      return;
    }

    const roleBadgeClass = this.currentUser.role === 'teacher' 
      ? 'bg-indigo-100 text-indigo-700' 
      : 'bg-emerald-100 text-emerald-700';
    const roleText = this.currentUser.role === 'teacher' ? 'Tutor' : 'Student';

    userArea.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex flex-col text-right">
          <span class="text-xs font-bold text-slate-800 leading-tight">${this.escape(this.currentUser.fullName)}</span>
          <span class="text-[10px] font-medium ${roleBadgeClass} px-1.5 py-0.2 rounded-full self-end mt-0.5">${roleText}</span>
        </div>
        <img src="${this.currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + this.currentUser.username}" 
          class="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" alt="User">
        <button onclick="App.handleLogout()" title="Logout" 
          class="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    lucide.createIcons();
  },

  // ==========================================
  // NAVIGATION & ROUTING
  // ==========================================
  async navigateTo(view, classId = null) {
    if (view === 'dashboard') {
      document.getElementById('viewLogin').classList.add('hidden');
      document.getElementById('viewDashboard').classList.remove('hidden');
      document.getElementById('viewClassDetail').classList.add('hidden');
      await this.loadDashboard();
    } else if (view === 'classDetail' && classId) {
      document.getElementById('viewLogin').classList.add('hidden');
      document.getElementById('viewDashboard').classList.add('hidden');
      document.getElementById('viewClassDetail').classList.remove('hidden');
      await this.loadClassDetail(classId);
    }
    lucide.createIcons();
  },

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  async handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorEl = document.getElementById('loginError');
    const submitBtn = document.getElementById('loginSubmitBtn');

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing in...</span>`;

    try {
      const data = await API.login(username, password);
      this.currentUser = data.user;
      this.onAuthenticated();
    } catch (err) {
      errorEl.textContent = err.message || 'Invalid username or password';
      errorEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In</span><i data-lucide="arrow-right" class="w-4 h-4"></i>`;
      lucide.createIcons();
    }
  },

  async quickLogin(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
  },

  async handleLogout() {
    if (confirm('Are you sure you want to log out from TutorTech?')) {
      await API.logout();
      this.currentUser = null;
      if (this.countdownInterval) clearInterval(this.countdownInterval);
      this.showLoginView();
    }
  },

  // ==========================================
  // DASHBOARD & CLASSES
  // ==========================================
  async loadDashboard() {
    const greeting = document.getElementById('welcomeGreeting');
    const subtext = document.getElementById('welcomeSubtext');
    const grid = document.getElementById('classesGrid');
    const badge = document.getElementById('classesCountBadge');

    if (this.currentUser) {
      greeting.textContent = `Welcome back, ${this.currentUser.fullName.split(' ')[0]}!`;
      subtext.textContent = this.currentUser.role === 'teacher'
        ? 'Manage your live tutoring classrooms, Google Meet sessions, board links, and homework submissions.'
        : 'View your scheduled class times, click to join Google Meet, collaborate on live boards, and submit homework.';
    }

    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <div class="inline-block animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3"></div>
        <p class="text-sm">Loading your classes...</p>
      </div>
    `;

    try {
      this.classes = await API.getClasses();
      badge.textContent = `${this.classes.length} Classes`;

      if (this.classes.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 card-shadow">
            <div class="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <i data-lucide="book-open" class="w-8 h-8"></i>
            </div>
            <h3 class="text-lg font-bold text-slate-800">No classes found</h3>
            <p class="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              ${this.currentUser.role === 'teacher' ? 'Get started by creating your first online tutoring class.' : 'You have not been assigned to any classes yet.'}
            </p>
            ${this.currentUser.role === 'teacher' ? `
              <button onclick="App.openCreateClassModal()" class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
                Create First Class
              </button>
            ` : ''}
          </div>
        `;
        lucide.createIcons();
        return;
      }

      grid.innerHTML = this.classes.map(cls => this.renderClassCard(cls)).join('');
      lucide.createIcons();
    } catch (err) {
      grid.innerHTML = `
        <div class="col-span-full bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm text-center">
          Failed to load classes: ${err.message}
        </div>
      `;
    }
  },

  renderClassCard(cls) {
    const countdownInfo = this.getCountdownInfo(cls.nextSessionIso);
    const gradient = cls.themeColor || 'from-blue-600 to-indigo-800';

    return `
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow flex flex-col transition group">
        
        <!-- Card Header Banner -->
        <div class="bg-gradient-to-r ${gradient} p-5 text-white relative cursor-pointer" onclick="App.navigateTo('classDetail', '${cls.id}')">
          
          <div class="flex items-start justify-between gap-2 mb-2">
            <span class="text-[11px] font-semibold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white">
              ${this.escape(cls.subject || 'Subject')}
            </span>
            <!-- Live / Time status badge -->
            <div class="class-countdown-badge" data-session-iso="${cls.nextSessionIso}">
              ${countdownInfo.badgeHtml}
            </div>
          </div>

          <h3 class="text-lg font-bold tracking-tight group-hover:text-blue-100 transition line-clamp-1">
            ${this.escape(cls.name)}
          </h3>
          <p class="text-xs text-blue-100 line-clamp-1 mt-0.5">
            ${this.escape(cls.section || 'General Section')}
          </p>

          <div class="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-blue-100">
            <span class="flex items-center gap-1.5">
              <i data-lucide="user" class="w-3.5 h-3.5"></i>
              <span class="truncate max-w-[150px]">${this.escape(cls.tutorName)}</span>
            </span>
            <span class="font-medium">${this.escape(cls.scheduleDays || '')}</span>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          
          <!-- Next Starting Time Details -->
          <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-xs text-slate-700">
              <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i data-lucide="clock" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="font-semibold text-slate-800">Class Starting Time</div>
                <div class="text-slate-500">${this.formatSessionTime(cls.nextSessionIso, cls.scheduleTime)}</div>
              </div>
            </div>
          </div>

          <!-- Direct 1-Click Action Buttons: Google Meet & Digital Board -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <a href="${this.escape(cls.meetLink)}" target="_blank" rel="noopener noreferrer" 
              class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition">
              <i data-lucide="video" class="w-4 h-4"></i>
              <span>Join Meet</span>
            </a>
            <a href="${this.escape(cls.boardLink || 'https://excalidraw.com')}" target="_blank" rel="noopener noreferrer" 
              class="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition">
              <i data-lucide="layout" class="w-4 h-4"></i>
              <span>Open Board</span>
            </a>
          </div>

          <!-- Bottom Footer Action -->
          <button onclick="App.navigateTo('classDetail', '${cls.id}')" 
            class="w-full py-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5">
            <span>Enter Google Classroom View</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>

        </div>

      </div>
    `;
  },

  // ==========================================
  // CLASS DETAIL VIEW (GOOGLE CLASSROOM REPLICA)
  // ==========================================
  async loadClassDetail(classId) {
    this.currentClass = this.classes.find(c => c.id === classId);
    if (!this.currentClass) {
      try {
        this.currentClass = await API.getClass(classId);
      } catch (e) {
        alert('Class not found');
        this.navigateTo('dashboard');
        return;
      }
    }

    const cls = this.currentClass;

    // Set Banner Info
    document.getElementById('classDetailTitle').textContent = cls.name;
    document.getElementById('classDetailSection').textContent = `${cls.subject || 'Course'} • ${cls.section || 'All Students'}`;
    document.getElementById('classDetailTutor').innerHTML = `
      <i data-lucide="user-check" class="w-4 h-4"></i>
      <span>Tutor: <strong>${this.escape(cls.tutorName)}</strong> (${this.escape(cls.tutorEmail)})</span>
    `;
    document.getElementById('classDetailSchedule').textContent = `${cls.scheduleDays} | ${cls.scheduleTime}`;

    // Set Meet & Board Links
    document.getElementById('classDetailMeetBtn').href = cls.meetLink;
    document.getElementById('classDetailBoardBtn').href = cls.boardLink || 'https://excalidraw.com';
    document.getElementById('streamMeetLink').href = cls.meetLink;
    document.getElementById('streamBoardLink').href = cls.boardLink || 'https://excalidraw.com';
    document.getElementById('wbClassLink').href = cls.boardLink || 'https://excalidraw.com';

    // Update banner gradient
    const heroCard = document.getElementById('classHeroCard');
    heroCard.className = `rounded-2xl overflow-hidden card-shadow bg-gradient-to-r ${cls.themeColor || 'from-blue-600 to-indigo-800'} text-white relative`;

    // Tutor controls
    const isTeacher = this.currentUser.role === 'teacher';
    document.getElementById('classDetailAdminControls').classList.toggle('hidden', !isTeacher);
    document.getElementById('classworkTeacherActions').classList.toggle('hidden', !isTeacher);
    document.getElementById('materialsTeacherActions').classList.toggle('hidden', !isTeacher);

    // Set user avatar in announcement box
    document.getElementById('announcementUserAvatar').src = this.currentUser.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + this.currentUser.username;

    // Load active tab
    this.switchClassTab(this.currentTab || 'stream');
    lucide.createIcons();
  },

  switchClassTab(tabName) {
    this.currentTab = tabName;

    // Reset tab active classes
    const tabs = ['stream', 'classwork', 'materials', 'whiteboard', 'people'];
    tabs.forEach(t => {
      const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
      const content = document.getElementById(`tabContent${t.charAt(0).toUpperCase() + t.slice(1)}`);
      if (btn) {
        if (t === tabName) {
          btn.className = 'tab-btn py-3.5 text-sm font-medium border-b-2 tab-active transition flex items-center gap-2';
        } else {
          btn.className = 'tab-btn py-3.5 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center gap-2';
        }
      }
      if (content) {
        content.classList.toggle('hidden', t !== tabName);
      }
    });

    if (tabName === 'stream') this.loadStreamTab();
    if (tabName === 'classwork') this.loadClassworkTab();
    if (tabName === 'materials') this.loadMaterialsTab();
    if (tabName === 'people') this.loadPeopleTab();
    lucide.createIcons();
  },

  // ===== STREAM TAB =====
  async loadStreamTab() {
    if (!this.currentClass) return;

    // Load Announcements
    const feed = document.getElementById('streamAnnouncementsFeed');
    feed.innerHTML = `<div class="py-6 text-center text-slate-400 text-xs">Loading announcements...</div>`;

    try {
      const announcements = await API.getAnnouncements(this.currentClass.id);
      if (announcements.length === 0) {
        feed.innerHTML = `
          <div class="bg-white rounded-2xl p-8 text-center border border-slate-200 card-shadow text-xs text-slate-400">
            No announcements yet. Welcome your students above!
          </div>
        `;
      } else {
        feed.innerHTML = announcements.map(ann => `
          <div class="bg-white rounded-2xl p-5 border border-slate-200 card-shadow space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img src="${ann.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + ann.author}" 
                  class="w-9 h-9 rounded-full object-cover border border-slate-200" alt="Avatar">
                <div>
                  <div class="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span>${this.escape(ann.author)}</span>
                    <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-normal">${this.escape(ann.authorRole)}</span>
                  </div>
                  <div class="text-[11px] text-slate-400">${new Date(ann.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
              </div>
              ${ann.pinned ? `
                <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  <i data-lucide="pin" class="w-3 h-3"></i>
                  <span>Pinned</span>
                </span>
              ` : ''}
            </div>

            <div>
              <h4 class="text-sm font-bold text-slate-900 mb-1">${this.escape(ann.title)}</h4>
              <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">${this.escape(ann.content)}</p>
            </div>
          </div>
        `).join('');
      }

      // Load Upcoming Homework on the Left Widget
      const upcomingList = document.getElementById('streamUpcomingList');
      const assignments = await API.getAssignments(this.currentClass.id);
      if (assignments.length === 0) {
        upcomingList.innerHTML = `<p class="text-slate-400">Woohoo, no homework due soon!</p>`;
      } else {
        upcomingList.innerHTML = assignments.slice(0, 3).map(asg => `
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-blue-50/50 cursor-pointer transition" onclick="App.switchClassTab('classwork')">
            <div class="font-semibold text-slate-800 line-clamp-1">${this.escape(asg.title)}</div>
            <div class="text-[11px] text-rose-600 font-medium mt-0.5">Due ${new Date(asg.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
          </div>
        `).join('');
      }

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  },

  async postAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const pinned = document.getElementById('announcementPinned').checked;

    if (!content) {
      alert('Please write something in the announcement');
      return;
    }

    try {
      await API.createAnnouncement(this.currentClass.id, { title, content, pinned });
      document.getElementById('announcementTitle').value = '';
      document.getElementById('announcementContent').value = '';
      document.getElementById('announcementPinned').checked = false;
      this.loadStreamTab();
    } catch (err) {
      alert('Failed to post announcement: ' + err.message);
    }
  },

  // ===== CLASSWORK & HOMEWORK TAB =====
  async loadClassworkTab() {
    if (!this.currentClass) return;
    const list = document.getElementById('assignmentsList');
    list.innerHTML = `<div class="py-8 text-center text-slate-400 text-xs">Loading assignments...</div>`;

    try {
      const assignments = await API.getAssignments(this.currentClass.id);
      if (assignments.length === 0) {
        list.innerHTML = `
          <div class="bg-white rounded-2xl p-12 text-center border border-slate-200 card-shadow">
            <i data-lucide="clipboard" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
            <h3 class="text-sm font-bold text-slate-700">No assignments assigned yet</h3>
            <p class="text-xs text-slate-400 mt-1">Assignments and homework problem sets will appear here.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      const isTeacher = this.currentUser.role === 'teacher';

      list.innerHTML = assignments.map(asg => {
        const dueDateStr = new Date(asg.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        
        // Status Badge for Student
        let statusBadge = '';
        if (!isTeacher) {
          if (asg.status === 'Graded') {
            statusBadge = `<span class="bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full text-xs">Graded: ${asg.mySubmission.grade}/${asg.points}</span>`;
          } else if (asg.status === 'Submitted') {
            statusBadge = `<span class="bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Turn-in Done</span>`;
          } else {
            statusBadge = `<span class="bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full text-xs">Assigned</span>`;
          }
        } else {
          statusBadge = `<span class="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-full text-xs">${asg.submissionCount || 0} Submissions</span>`;
        }

        // Attachments HTML
        const attachmentsHtml = (asg.attachments || []).map(att => `
          <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition text-xs">
            <i data-lucide="file-text" class="w-4 h-4 text-rose-600"></i>
            <span class="font-medium text-slate-800">${this.escape(att.name)}</span>
            <span class="text-slate-400 text-[10px]">(${att.size})</span>
            <button onclick="App.previewPdf('${att.url}', '${this.escape(att.name)}')" class="text-blue-600 font-bold ml-1 hover:underline">View PDF</button>
            <a href="${att.url}" download class="text-slate-500 hover:text-slate-700"><i data-lucide="download" class="w-3.5 h-3.5"></i></a>
          </div>
        `).join('');

        return `
          <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-6 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <span class="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">${this.escape(asg.topic || 'General')}</span>
                <h3 class="text-base font-bold text-slate-900 mt-1">${this.escape(asg.title)}</h3>
                <div class="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span>Points: <strong>${asg.points}</strong></span>
                  <span>•</span>
                  <span>Due: <strong>${dueDateStr}</strong></span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${statusBadge}
              </div>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">${this.escape(asg.description)}</p>

            ${attachmentsHtml ? `
              <div class="pt-2">
                <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Attached Problem Sheets & Materials:</div>
                <div class="flex flex-wrap gap-2">${attachmentsHtml}</div>
              </div>
            ` : ''}

            <!-- Feedback if graded -->
            ${!isTeacher && asg.mySubmission && asg.mySubmission.feedback ? `
              <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                <span class="font-bold flex items-center gap-1"><i data-lucide="message-square" class="w-3.5 h-3.5"></i> Tutor Feedback:</span>
                <p class="mt-1">${this.escape(asg.mySubmission.feedback)}</p>
              </div>
            ` : ''}

            <!-- Actions -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              ${isTeacher ? `
                <button onclick="App.openReviewSubmissionsModal('${asg.id}', '${this.escape(asg.title)}')" 
                  class="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-medium flex items-center gap-2 transition">
                  <i data-lucide="check-square" class="w-4 h-4"></i>
                  <span>Review Submissions (${asg.submissionCount || 0})</span>
                </button>
              ` : `
                <button onclick="App.openSubmitHomeworkModal('${asg.id}', '${this.escape(asg.title)}', '${dueDateStr}')" 
                  class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition">
                  <i data-lucide="upload" class="w-4 h-4"></i>
                  <span>${asg.isSubmitted ? 'Resubmit Homework' : 'Turn In Homework'}</span>
                </button>
              `}
            </div>

          </div>
        `;
      }).join('');

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  },

  // ===== MATERIALS & PDFS TAB =====
  async loadMaterialsTab() {
    if (!this.currentClass) return;
    const list = document.getElementById('materialsList');
    list.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">Loading PDF library...</div>`;

    try {
      const materials = await API.getMaterials(this.currentClass.id);
      if (materials.length === 0) {
        list.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200 card-shadow">
            <i data-lucide="file-text" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
            <h3 class="text-sm font-bold text-slate-700">No PDF materials uploaded yet</h3>
            <p class="text-xs text-slate-400 mt-1">Formula sheets and lecture slides will be posted here.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      list.innerHTML = materials.map(mat => `
        <div class="bg-white rounded-2xl border border-slate-200 card-shadow p-5 flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">${this.escape(mat.category)}</span>
              <span class="text-[10px] text-slate-400">${new Date(mat.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 class="text-sm font-bold text-slate-900">${this.escape(mat.title)}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${this.escape(mat.description || '')}</p>
          </div>

          <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs text-slate-600">
              <i data-lucide="file-text" class="w-4 h-4 text-rose-500"></i>
              <span class="font-medium truncate max-w-[120px]">${this.escape(mat.file?.name || 'Document.pdf')}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="App.previewPdf('${mat.file?.url}', '${this.escape(mat.title)}')" 
                class="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition">
                Read PDF
              </button>
              <a href="${mat.file?.url}" download class="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition" title="Download">
                <i data-lucide="download" class="w-4 h-4"></i>
              </a>
            </div>
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  },

  // ===== PEOPLE TAB =====
  async loadPeopleTab() {
    if (!this.currentClass) return;
    try {
      const cls = await API.getClass(this.currentClass.id);
      
      // Teachers
      const teachersList = document.getElementById('peopleTeachersList');
      teachersList.innerHTML = `
        <div class="py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <i data-lucide="award" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="text-sm font-semibold text-slate-900">${this.escape(cls.tutorName)}</div>
              <div class="text-xs text-slate-500">${this.escape(cls.tutorEmail)}</div>
            </div>
          </div>
          <a href="mailto:${cls.tutorEmail}" class="p-2 text-slate-400 hover:text-blue-600"><i data-lucide="mail" class="w-4 h-4"></i></a>
        </div>
      `;

      // Students
      const studentsList = document.getElementById('peopleStudentsList');
      const countEl = document.getElementById('peopleStudentCount');
      const students = cls.students || [];
      countEl.textContent = `${students.length} students`;

      if (students.length === 0) {
        studentsList.innerHTML = `<div class="py-4 text-xs text-slate-400">No students enrolled yet.</div>`;
      } else {
        studentsList.innerHTML = students.map(s => `
          <div class="py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="${s.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + s.username}" class="w-8 h-8 rounded-full border" alt="">
              <div>
                <div class="text-xs font-semibold text-slate-900">${this.escape(s.fullName)}</div>
                <div class="text-[11px] text-slate-400">${this.escape(s.grade || 'Student')} • @${this.escape(s.username)}</div>
              </div>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">${this.escape(s.email)}</span>
          </div>
        `).join('');
      }

      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  },

  // ==========================================
  // HOMEWORK SUBMISSION & GRADING
  // ==========================================
  openSubmitHomeworkModal(assignmentId, title, dueStr) {
    document.getElementById('submitAssignmentId').value = assignmentId;
    document.getElementById('submitModalTitle').textContent = `Submit: ${title}`;
    document.getElementById('submitModalDue').textContent = `Deadline: ${dueStr}`;
    document.getElementById('submitFileInput').value = '';
    document.getElementById('submitTextContent').value = '';
    this.openModal('modalSubmitHomework');
  },

  async handleSubmitHomework(event) {
    event.preventDefault();
    const assignmentId = document.getElementById('submitAssignmentId').value;
    const fileInput = document.getElementById('submitFileInput');
    const content = document.getElementById('submitTextContent').value;
    const sendBtn = document.getElementById('btnSubmitHomeworkSend');

    sendBtn.disabled = true;
    sendBtn.innerHTML = `<span>Uploading...</span>`;

    try {
      const files = [];
      if (fileInput.files.length > 0) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        files.push(uploadRes.file);
      }

      await API.submitAssignment(assignmentId, { content, files });
      alert('Homework submitted successfully! Your tutor has been notified.');
      this.closeModal('modalSubmitHomework');
      this.loadClassworkTab();
    } catch (err) {
      alert('Failed to submit homework: ' + err.message);
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i><span>Turn In Homework</span>`;
      lucide.createIcons();
    }
  },

  async openReviewSubmissionsModal(assignmentId, asgTitle) {
    document.getElementById('reviewModalTitle').textContent = `Submissions for: ${asgTitle}`;
    const container = document.getElementById('reviewSubmissionsContainer');
    container.innerHTML = `<div class="py-6 text-center text-slate-400">Loading student submissions...</div>`;
    this.openModal('modalReviewSubmissions');

    try {
      const submissions = await API.getSubmissions(assignmentId);
      if (submissions.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-slate-400 border rounded-xl">No students have submitted this homework yet.</div>`;
        return;
      }

      container.innerHTML = submissions.map(sub => `
        <div class="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div class="flex items-center justify-between">
            <div class="font-bold text-slate-900">${this.escape(sub.studentName)}</div>
            <span class="text-[10px] text-slate-400">Turned in: ${new Date(sub.submittedAt).toLocaleString()}</span>
          </div>
          
          <div class="text-slate-600">${this.escape(sub.content || '')}</div>

          ${(sub.files || []).map(f => `
            <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-xs">
              <i data-lucide="file-text" class="w-4 h-4 text-rose-500"></i>
              <span>${this.escape(f.name)}</span>
              <button onclick="App.previewPdf('${f.url}', '${this.escape(f.name)}')" class="text-blue-600 font-bold ml-1 hover:underline">View PDF</button>
              <a href="${f.url}" download class="text-slate-400 hover:text-slate-700 ml-1"><i data-lucide="download" class="w-3.5 h-3.5"></i></a>
            </div>
          `).join('')}

          <!-- Grading Form -->
          <div class="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
            <input type="number" id="grade_${sub.id}" value="${sub.grade !== undefined ? sub.grade : ''}" placeholder="Grade (e.g. 95)" class="w-28 px-3 py-1.5 border rounded-lg bg-white text-xs">
            <input type="text" id="feedback_${sub.id}" value="${this.escape(sub.feedback || '')}" placeholder="Write feedback for student..." class="flex-1 px-3 py-1.5 border rounded-lg bg-white text-xs">
            <button onclick="App.saveGrade('${sub.id}')" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold">
              Save Grade
            </button>
          </div>
        </div>
      `).join('');

      lucide.createIcons();
    } catch (err) {
      container.innerHTML = `<div class="text-rose-600">Error loading submissions: ${err.message}</div>`;
    }
  },

  async saveGrade(submissionId) {
    const grade = document.getElementById(`grade_${submissionId}`).value;
    const feedback = document.getElementById(`feedback_${submissionId}`).value;

    if (grade === '') {
      alert('Please enter a grade score');
      return;
    }

    try {
      await API.gradeSubmission(submissionId, { grade, feedback });
      alert('Grade and feedback saved successfully!');
    } catch (err) {
      alert('Failed to save grade: ' + err.message);
    }
  },

  // ==========================================
  // TEACHER MODALS: CREATE CLASS, ASSIGNMENT, MATERIAL
  // ==========================================
  openCreateClassModal() {
    this.openModal('modalCreateClass');
  },

  async handleCreateClass(event) {
    event.preventDefault();
    const payload = {
      name: document.getElementById('newClassName').value,
      subject: document.getElementById('newClassSubject').value,
      section: document.getElementById('newClassSection').value,
      scheduleDays: document.getElementById('newClassDays').value,
      scheduleTime: document.getElementById('newClassTime').value,
      nextSessionIso: new Date(document.getElementById('newClassNextSession').value).toISOString(),
      meetLink: document.getElementById('newClassMeet').value,
      boardLink: document.getElementById('newClassBoard').value,
      description: document.getElementById('newClassDesc').value
    };

    try {
      await API.createClass(payload);
      alert('Class created successfully!');
      this.closeModal('modalCreateClass');
      this.loadDashboard();
    } catch (err) {
      alert('Error creating class: ' + err.message);
    }
  },

  openEditClassModal() {
    if (!this.currentClass) return;
    document.getElementById('editClassMeet').value = this.currentClass.meetLink || '';
    document.getElementById('editClassBoard').value = this.currentClass.boardLink || '';
    document.getElementById('editClassDays').value = this.currentClass.scheduleDays || '';
    document.getElementById('editClassTime').value = this.currentClass.scheduleTime || '';
    this.openModal('modalEditClass');
  },

  async handleUpdateClass(event) {
    event.preventDefault();
    if (!this.currentClass) return;

    const payload = {
      meetLink: document.getElementById('editClassMeet').value,
      boardLink: document.getElementById('editClassBoard').value,
      scheduleDays: document.getElementById('editClassDays').value,
      scheduleTime: document.getElementById('editClassTime').value
    };

    const nextIso = document.getElementById('editClassNextSession').value;
    if (nextIso) payload.nextSessionIso = new Date(nextIso).toISOString();

    try {
      const updated = await API.updateClass(this.currentClass.id, payload);
      this.currentClass = updated;
      alert('Class links and schedule updated successfully!');
      this.closeModal('modalEditClass');
      this.loadClassDetail(this.currentClass.id);
    } catch (err) {
      alert('Failed to update class: ' + err.message);
    }
  },

  openCreateAssignmentModal() {
    this.openModal('modalCreateAssignment');
  },

  async handleCreateAssignment(event) {
    event.preventDefault();
    if (!this.currentClass) return;

    const fileInput = document.getElementById('newAsgFile');
    const submitBtn = document.getElementById('btnSubmitCreateAsg');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
      const attachments = [];
      if (fileInput.files.length > 0) {
        const uploadRes = await API.uploadFile(fileInput.files[0]);
        attachments.push(uploadRes.file);
      }

      const payload = {
        title: document.getElementById('newAsgTitle').value,
        topic: document.getElementById('newAsgTopic').value,
        points: document.getElementById('newAsgPoints').value,
        dueDate: new Date(document.getElementById('newAsgDue').value).toISOString(),
        description: document.getElementById('newAsgDesc').value,
        attachments
      };

      await API.createAssignment(this.currentClass.id, payload);
      alert('Assignment created successfully!');
      this.closeModal('modalCreateAssignment');
      this.loadClassworkTab();
    } catch (err) {
      alert('Error creating assignment: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Assign Homework';
    }
  },

  openCreateMaterialModal() {
    this.openModal('modalCreateMaterial');
  },

  async handleCreateMaterial(event) {
    event.preventDefault();
    if (!this.currentClass) return;

    const fileInput = document.getElementById('newMatFile');
    const submitBtn = document.getElementById('btnSubmitCreateMat');

    if (fileInput.files.length === 0) {
      alert('Please select a PDF file to upload');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading PDF...';

    try {
      const uploadRes = await API.uploadFile(fileInput.files[0]);
      const payload = {
        title: document.getElementById('newMatTitle').value,
        category: document.getElementById('newMatCategory').value,
        description: document.getElementById('newMatDesc').value,
        file: uploadRes.file
      };

      await API.createMaterial(this.currentClass.id, payload);
      alert('PDF Study material uploaded successfully!');
      this.closeModal('modalCreateMaterial');
      this.loadMaterialsTab();
    } catch (err) {
      alert('Error uploading material: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload PDF';
    }
  },

  // ==========================================
  // STUDENT ROSTER MANAGEMENT
  // ==========================================
  async openStudentsModal() {
    this.openModal('modalStudents');
    await this.loadStudentsRoster();
  },

  async loadStudentsRoster() {
    const tbody = document.getElementById('studentsTableBody');
    const select = document.getElementById('newStuClasses');
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Loading student roster...</td></tr>`;

    try {
      // Populate class select box
      const classes = await API.getClasses();
      select.innerHTML = classes.map(c => `
        <option value="${c.id}">${this.escape(c.name)}</option>
      `).join('');

      const students = await API.getStudents();
      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">No students registered yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = students.map(stu => {
        const enrolledNames = (stu.enrolledClasses || [])
          .map(cid => classes.find(c => c.id === cid)?.name || cid)
          .join(', ');

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-4 font-medium text-slate-900 flex items-center gap-2">
              <img src="${stu.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + stu.username}" class="w-6 h-6 rounded-full" alt="">
              <span>${this.escape(stu.fullName)}</span>
            </td>
            <td class="py-2.5 px-4 font-mono font-semibold text-blue-600">${this.escape(stu.username)}</td>
            <td class="py-2.5 px-4 text-slate-500">${this.escape(stu.grade || 'N/A')}</td>
            <td class="py-2.5 px-4 text-slate-600 truncate max-w-xs">${this.escape(enrolledNames || 'None')}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-rose-600">Failed to load students: ${err.message}</td></tr>`;
    }
  },

  async handleCreateStudent(event) {
    event.preventDefault();
    const select = document.getElementById('newStuClasses');
    const selectedClasses = Array.from(select.selectedOptions).map(opt => opt.value);

    const payload = {
      fullName: document.getElementById('newStuName').value,
      username: document.getElementById('newStuUsername').value,
      password: document.getElementById('newStuPassword').value,
      grade: document.getElementById('newStuGrade').value,
      enrolledClasses: selectedClasses
    };

    try {
      const res = await API.createStudent(payload);
      alert(res.message);
      document.getElementById('newStuName').value = '';
      document.getElementById('newStuUsername').value = '';
      document.getElementById('newStuPassword').value = '';
      await this.loadStudentsRoster();
    } catch (err) {
      alert('Error registering student: ' + err.message);
    }
  },

  // ==========================================
  // IN-APP PDF VIEWER MODAL
  // ==========================================
  previewPdf(url, title) {
    document.getElementById('pdfViewerTitle').textContent = title || 'PDF Document';
    document.getElementById('pdfViewerIframe').src = url;
    document.getElementById('pdfViewerDownloadBtn').href = url;
    this.openModal('modalPdfViewer');
  },

  openWhiteboardModal() {
    if (this.currentClass) {
      this.switchClassTab('whiteboard');
    } else {
      window.open('https://excalidraw.com', '_blank');
    }
  },

  // ==========================================
  // INTERACTIVE SKETCHPAD / WHITEBOARD
  // ==========================================
  initSketchCanvas() {
    const canvas = document.getElementById('sketchCanvas');
    if (!canvas) return;
    this.sketchCtx = canvas.getContext('2d');

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.sketchCtx.beginPath();
      this.sketchCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.sketchCtx.lineWidth = document.getElementById('sketchSize').value;
      this.sketchCtx.lineCap = 'round';
      this.sketchCtx.lineJoin = 'round';

      if (this.sketchTool === 'eraser') {
        this.sketchCtx.strokeStyle = '#ffffff';
      } else {
        this.sketchCtx.strokeStyle = document.getElementById('sketchColor').value;
      }

      this.sketchCtx.lineTo(pos.x, pos.y);
      this.sketchCtx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);
  },

  setSketchTool(tool) {
    this.sketchTool = tool;
    document.getElementById('toolPen').className = tool === 'pen' ? 'p-1.5 rounded-lg bg-blue-600 text-white text-xs' : 'p-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs';
    document.getElementById('toolEraser').className = tool === 'eraser' ? 'p-1.5 rounded-lg bg-blue-600 text-white text-xs' : 'p-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs';
  },

  clearSketch() {
    const canvas = document.getElementById('sketchCanvas');
    if (this.sketchCtx && canvas) {
      this.sketchCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  },

  // ==========================================
  // COUNTDOWN & TIMER LOGIC
  // ==========================================
  startCountdownTimer() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      // Update badges on dashboard
      const badges = document.querySelectorAll('.class-countdown-badge');
      badges.forEach(b => {
        const iso = b.getAttribute('data-session-iso');
        if (iso) {
          const info = this.getCountdownInfo(iso);
          b.innerHTML = info.badgeHtml;
        }
      });

      // Update banner countdown in class detail
      const detailCountdown = document.getElementById('classDetailCountdown');
      if (this.currentClass && detailCountdown) {
        const info = this.getCountdownInfo(this.currentClass.nextSessionIso);
        detailCountdown.innerHTML = info.bannerHtml;
      }
    }, 1000);
  },

  getCountdownInfo(isoString) {
    if (!isoString) {
      return {
        badgeHtml: `<span class="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">Schedule Pending</span>`,
        bannerHtml: `Schedule Pending`
      };
    }

    const sessionTime = new Date(isoString).getTime();
    const now = Date.now();
    const diff = sessionTime - now;

    // If currently running (from 0 to 60 mins past start)
    if (diff <= 0 && diff >= -60 * 60 * 1000) {
      return {
        badgeHtml: `<span class="bg-rose-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 live-badge-pulse"><span class="w-1.5 h-1.5 rounded-full bg-white"></span> LIVE NOW</span>`,
        bannerHtml: `<span class="text-rose-400 font-bold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span> SESSION IS LIVE NOW!</span>`
      };
    }

    // If session has ended
    if (diff < -60 * 60 * 1000) {
      return {
        badgeHtml: `<span class="bg-slate-200 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-full">Session Completed</span>`,
        bannerHtml: `Completed`
      };
    }

    // Future session
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours < 1) {
      return {
        badgeHtml: `<span class="bg-amber-400 text-amber-950 font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> Starts in ${mins}m ${secs}s</span>`,
        bannerHtml: `<span class="text-amber-300 font-bold">Starts in ${mins}m ${secs}s</span>`
      };
    }

    if (hours < 24) {
      return {
        badgeHtml: `<span class="bg-blue-100/90 text-blue-900 font-semibold text-[11px] px-2 py-0.5 rounded-full">In ${hours}h ${mins}m</span>`,
        bannerHtml: `Next Session: In ${hours}h ${mins}m`
      };
    }

    const days = Math.floor(hours / 24);
    return {
      badgeHtml: `<span class="bg-slate-100/90 text-slate-800 font-medium text-[11px] px-2 py-0.5 rounded-full">In ${days} day${days > 1 ? 's' : ''}</span>`,
      bannerHtml: `Next Session: In ${days} day${days > 1 ? 's' : ''}`
    };
  },

  formatSessionTime(isoString, fallbackTime) {
    if (!isoString) return fallbackTime || 'TBD';
    const d = new Date(isoString);
    return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  },

  // Modal helpers
  openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
    lucide.createIcons();
  },

  closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

// Global unauthorized listener
window.addEventListener('tutortech:unauthorized', () => {
  App.showLoginView();
});

// Auto initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
