// TutorTech LMS API Client with Persistent Session Handling
const API = {
  TOKEN_KEY: 'tutortech_auth_token',
  USER_KEY: 'tutortech_auth_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getCurrentUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      if (res.status === 401) {
        // If server says session expired/invalid
        this.clearSession();
        window.dispatchEvent(new CustomEvent('tutortech:unauthorized'));
        throw new Error('Session expired or unauthorized');
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth
  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async verifySession() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const data = await this.request('/api/auth/me');
      // Update cached user
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      this.clearSession();
      return null;
    }
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.clearSession();
  },

  async updateProfile(payload) {
    const data = await this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (data.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
    }
    return data;
  },

  // Classes
  async getClasses() {
    return this.request('/api/classes');
  },

  async getClass(id) {
    return this.request(`/api/classes/${id}`);
  },

  async createClass(payload) {
    return this.request('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateClass(id, payload) {
    return this.request(`/api/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Announcements
  async getAnnouncements(classId) {
    return this.request(`/api/classes/${classId}/announcements`);
  },

  async createAnnouncement(classId, payload) {
    return this.request(`/api/classes/${classId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Assignments / Homework
  async getAssignments(classId) {
    return this.request(`/api/classes/${classId}/assignments`);
  },

  async createAssignment(classId, payload) {
    return this.request(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async submitAssignment(assignmentId, payload) {
    return this.request(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSubmissions(assignmentId) {
    return this.request(`/api/assignments/${assignmentId}/submissions`);
  },

  async gradeSubmission(submissionId, payload) {
    return this.request(`/api/submissions/${submissionId}/grade`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Materials & PDFs
  async getMaterials(classId) {
    return this.request(`/api/classes/${classId}/materials`);
  },

  async createMaterial(classId, payload) {
    return this.request(`/api/classes/${classId}/materials`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // File Upload (PDF, Word, Images)
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/api/upload', {
      method: 'POST',
      body: formData
    });
  },

  // Student Roster Management
  async getStudents() {
    return this.request('/api/students');
  },

  async createStudent(payload) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
