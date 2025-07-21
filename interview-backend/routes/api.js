// 🔧 Unified API Configuration
const API_CONFIG = {
  baseURL: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : `${window.location.origin}/api`,
  timeout: 30000,
  retries: 3
};

console.log(`🔧 API Base URL: ${API_CONFIG.baseURL}`);

// 🛠️ Enhanced API utility with retry logic and better error handling
async function apiCall(endpoint, method = "GET", data = null, headers = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  let lastError;

  // Add auth token if available
  const token = storage.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (data) {
    if (data instanceof FormData) {
      delete options.headers["Content-Type"];
      options.body = data;
    } else {
      options.body = JSON.stringify(data);
    }
  }

  // Retry logic
  for (let attempt = 1; attempt <= API_CONFIG.retries; attempt++) {
    try {
      console.log(`📡 API Call (Attempt ${attempt}): ${method} ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      options.signal = controller.signal;
      const response = await fetch(url, options);
      
      clearTimeout(timeoutId);

      let result;
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        result = { message: await response.text() };
      }

      if (!response.ok) {
        const errorMessage = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success: ${method} ${url}`, result);
      return result;

    } catch (err) {
      lastError = err;
      console.error(`❌ API Error (Attempt ${attempt}): ${method} ${url}`, err.message);

      // Don't retry for certain errors
      if (err.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      
      if (err.message.includes('401') || err.message.includes('403')) {
        // Clear invalid token
        storage.clear();
        throw err;
      }

      // Don't retry on the last attempt
      if (attempt === API_CONFIG.retries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // Enhanced error messages
  if (lastError.name === "TypeError" && lastError.message.includes("fetch")) {
    throw new Error(`Cannot connect to server. Please ensure the backend is running at ${API_CONFIG.baseURL}`);
  }

  throw lastError;
}

// 🔐 Authentication API
const authAPI = {
  async register({ name, email, password }) {
    try {
      console.log('🔄 Registering user:', email);
      const res = await apiCall("/auth/register", "POST", { name, email, password });
      
      if (res.success && res.token) {
        storage.setToken(res.token);
        storage.setUser(res.user);
        console.log('✅ Registration successful');
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Register API Error:", err);
      return { success: false, message: err.message };
    }
  },

  async login({ email, password }) {
    try {
      console.log('🔄 Logging in user:', email);
      const res = await apiCall("/auth/login", "POST", { email, password });
      
      if (res.success && res.token) {
        storage.setToken(res.token);
        storage.setUser(res.user);
        console.log('✅ Login successful');
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Login API Error:", err);
      return { success: false, message: err.message };
    }
  },

  logout() {
    console.log('👋 Logging out user');
    storage.clear();
    window.location.href = '/index.html';
  }
};

// 🎤 Interview API
const interviewAPI = {
  async uploadResume(file) {
    try {
      console.log('📄 Uploading resume:', file.name);
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiCall("/upload-resume", "POST", formData);
      
      if (res.success) {
        console.log('✅ Resume upload successful');
        storage.setResumeId(res.resume_id);
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Upload Resume API Error:", err);
      return { success: false, message: err.message };
    }
  },

  async startInterview({ resumeId, userId }) {
    try {
      console.log('🎯 Starting interview for resume:', resumeId);
      const res = await apiCall("/interview/start", "POST", { 
        resumeId: resumeId || storage.getResumeId(),
        userId 
      });
      
      if (res.success) {
        console.log('✅ Interview started successfully');
        storage.setInterviewId(res.interview_id);
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Start Interview API Error:", err);
      return { success: false, message: err.message };
    }
  },

  async submitResponse({ interviewId, questionIndex, response, audioData }) {
    try {
      console.log(`💬 Submitting response for question ${questionIndex}`);
      const res = await apiCall("/interview/response", "POST", {
        interviewId: interviewId || storage.getInterviewId(),
        questionIndex,
        response,
        audioData
      });
      
      if (res.success) {
        console.log('✅ Response submitted successfully');
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Submit Response API Error:", err);
      return { success: false, message: err.message };
    }
  },

  async completeInterview({ interviewId }) {
    try {
      console.log('🏁 Completing interview:', interviewId);
      const res = await apiCall("/interview/complete", "POST", {
        interviewId: interviewId || storage.getInterviewId()
      });
      
      if (res.success) {
        console.log('✅ Interview completed successfully');
        // Keep interview ID for feedback access
      }
      
      return res;
    } catch (err) {
      console.error("🔥 Complete Interview API Error:", err);
      return { success: false, message: err.message };
    }
  }
};

// 💾 Enhanced Storage utilities
const storage = {
  setUser(user) {
    try {
      localStorage.setItem("aceme_user", JSON.stringify(user));
      console.log('💾 User stored:', user.email);
    } catch (err) {
      console.error('Storage error:', err);
    }
  },

  getUser() {
    try {
      const user = localStorage.getItem("aceme_user");
      return user ? JSON.parse(user) : null;
    } catch (err) {
      console.warn("⚠️ Invalid user data in localStorage, clearing it.");
      localStorage.removeItem("aceme_user");
      return null;
    }
  },

  setToken(token) {
    try {
      localStorage.setItem("aceme_token", token);
      console.log('🔐 Token stored');
    } catch (err) {
      console.error('Storage error:', err);
    }
  },

  getToken() {
    return localStorage.getItem("aceme_token");
  },

  setResumeId(id) {
    try {
      localStorage.setItem("aceme_resume_id", id);
      console.log('📄 Resume ID stored:', id);
    } catch (err) {
      console.error('Storage error:', err);
    }
  },

  getResumeId() {
    return localStorage.getItem("aceme_resume_id");
  },

  setInterviewId(id) {
    try {
      localStorage.setItem("aceme_interview_id", id);
      console.log('🎤 Interview ID stored:', id);
    } catch (err) {
      console.error('Storage error:', err);
    }
  },

  getInterviewId() {
    return localStorage.getItem("aceme_interview_id");
  },

  clear() {
    console.log('🧹 Clearing all stored data');
    localStorage.removeItem("aceme_user");
    localStorage.removeItem("aceme_token");
    localStorage.removeItem("aceme_interview_id");
    localStorage.removeItem("aceme_resume_id");
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!(this.getToken() && this.getUser());
  }
};

// 🔍 Utility functions
const utils = {
  // Test backend connection
  async testConnection() {
    try {
      console.log("🔍 Testing API connection...");
      const response = await apiCall("/health");
      console.log("✅ Backend connection successful:", response);
      return { success: true, data: response };
    } catch (err) {
      console.error("❌ Backend connection failed:", err);
      return { success: false, error: err.message };
    }
  },

  // Show loading state
  showLoading(element, text = "Loading...") {
    if (element) {
      element.disabled = true;
      element.textContent = text;
    }
  },

  // Hide loading state
  hideLoading(element, originalText) {
    if (element) {
      element.disabled = false;
      element.textContent = originalText;
    }
  },

  // Show error message
  showError(message, containerId = "error-container") {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`;
      container.style.display = "block";
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        container.style.display = "none";
      }, 5000);
    } else {
      alert(message); // Fallback
    }
  },

  // Show success message
  showSuccess(message, containerId = "success-container") {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="success-message">${message}</div>`;
      container.style.display = "block";
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        container.style.display = "none";
      }, 3000);
    }
  },

  // Redirect if not authenticated
  requireAuth() {
    if (!storage.isAuthenticated()) {
      window.location.href = '/interview-frontend/login.html';
      return false;
    }
    return true;
  }
};

// 🚀 Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 API module loaded");
  
  // Test connection on load
  const connectionTest = await utils.testConnection();
  
  // Show connection status if element exists
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    if (connectionTest.success) {
      statusEl.textContent = "✅ Connected to backend";
      statusEl.className = "status-connected";
    } else {
      statusEl.textContent = "❌ Backend connection failed";
      statusEl.className = "status-error";
    }
  }

  // Check authentication on protected pages
  const protectedPages = ['/interview-frontend/dashboard.html', '/interview-frontend/interview.html'];
  const currentPage = window.location.pathname;
  
  if (protectedPages.some(page => currentPage.includes(page))) {
    utils.requireAuth();
  }
});

// 🌐 Global exports
window.authAPI = authAPI;
window.interviewAPI = interviewAPI;
window.storage = storage;
window.utils = utils;
window.apiCall = apiCall;

// ES6 exports for modern usage
export { authAPI, interviewAPI, storage, utils, apiCall };
export default API_CONFIG;