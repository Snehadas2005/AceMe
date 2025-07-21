// Enhanced Firebase Configuration with better error handling and connection management
console.log('🔥 Loading Firebase Config...');

// Determine the correct API base URL based on environment
const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  console.log(`🌍 Current hostname: ${hostname}, port: ${port}`);
  
  // Development environment
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5000';
  }
  
  // Production environment (adjust as needed)
  if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
    return 'https://your-production-backend.com';
  }
  
  // Default fallback
  return `${window.location.protocol}//${hostname}${port ? ':' + port : ''}`;
})();

console.log(`🔧 API Base URL set to: ${API_BASE_URL}`);

// Connection status tracking
let connectionStatus = {
  isConnected: false,
  lastCheck: null,
  retryCount: 0,
  maxRetries: 3
};

// Enhanced API call utility with comprehensive error handling
async function apiCall(endpoint, method = "GET", data = null, headers = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    mode: "cors",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // Handle different data types
  if (data) {
    if (data instanceof FormData) {
      // Remove Content-Type header for FormData (browser sets it automatically)
      delete options.headers["Content-Type"];
      options.body = data;
    } else if (typeof data === 'object') {
      options.body = JSON.stringify(data);
    } else {
      options.body = data;
    }
  }

  // Add authorization token if available
  const token = window.storage?.getToken?.();
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  console.log(`📡 API Call: ${method} ${url}`, data ? 'with data' : 'no data');
  console.log(`📋 Headers:`, options.headers);

  try {
    const response = await fetch(url, options);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

    // Handle different response types
    let result;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof result === 'object' 
        ? result.message || result.error || `HTTP ${response.status}: ${response.statusText}`
        : `HTTP ${response.status}: ${response.statusText}`;
      
      throw new Error(errorMessage);
    }

    console.log(`✅ API Success: ${method} ${url}`, result);
    connectionStatus.isConnected = true;
    connectionStatus.lastCheck = new Date();
    connectionStatus.retryCount = 0;
    
    return result;

  } catch (err) {
    console.error(`❌ API Error: ${method} ${url}`, err);
    connectionStatus.isConnected = false;

    // Enhanced error handling with specific error types
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      const enhancedError = new Error(
        `Cannot connect to server at ${url}. Please ensure the backend is running on ${API_BASE_URL}`
      );
      enhancedError.type = "CONNECTION_ERROR";
      enhancedError.originalError = err;
      throw enhancedError;
    }

    if (err.message.includes("CORS")) {
      const enhancedError = new Error(
        "CORS error - server may not be configured to accept requests from this origin"
      );
      enhancedError.type = "CORS_ERROR";
      enhancedError.originalError = err;
      throw enhancedError;
    }

    if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      const enhancedError = new Error("Authentication required or token expired");
      enhancedError.type = "AUTH_ERROR";
      enhancedError.originalError = err;
      throw enhancedError;
    }

    if (err.message.includes("403") || err.message.includes("Forbidden")) {
      const enhancedError = new Error("Access forbidden - insufficient permissions");
      enhancedError.type = "PERMISSION_ERROR";
      enhancedError.originalError = err;
      throw enhancedError;
    }

    if (err.message.includes("500")) {
      const enhancedError = new Error("Server internal error - please try again later");
      enhancedError.type = "SERVER_ERROR";
      enhancedError.originalError = err;
      throw enhancedError;
    }

    // Re-throw the original error if no specific handling
    throw err;
  }
}

// Health check with retry logic
async function checkHealth() {
  try {
    console.log("🔍 Testing API connection...");
    const healthCheck = await apiCall("/api/health");
    
    if (healthCheck.status === "OK" || healthCheck.message === "Server is running") {
      console.log("✅ Backend connection successful:", healthCheck);
      updateConnectionStatus(true, "✅ Connected to backend");
      return true;
    } else {
      throw new Error("Unexpected health check response");
    }
  } catch (err) {
    console.error("❌ Backend connection failed:", err);
    updateConnectionStatus(false, `❌ Connection failed: ${err.message}`);
    
    // Retry logic
    if (connectionStatus.retryCount < connectionStatus.maxRetries) {
      connectionStatus.retryCount++;
      console.log(`🔄 Retrying connection (${connectionStatus.retryCount}/${connectionStatus.maxRetries})...`);
      setTimeout(() => checkHealth(), 2000 * connectionStatus.retryCount);
    }
    
    return false;
  }
}

// Update connection status in UI
function updateConnectionStatus(isConnected, message) {
  const statusEl = document.getElementById("connection-status");
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isConnected ? "status-connected" : "status-error";
  }
  
  // Add visual indicator to body
  document.body.classList.toggle('backend-connected', isConnected);
  document.body.classList.toggle('backend-disconnected', !isConnected);
}

// Initialize connection on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  // Add connection status element if it doesn't exist
  if (!document.getElementById("connection-status")) {
    const statusEl = document.createElement("div");
    statusEl.id = "connection-status";
    statusEl.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 9999;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(statusEl);
  }

  // Add CSS for connection status
  const style = document.createElement('style');
  style.textContent = `
    .status-connected {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .backend-disconnected .btn {
      opacity: 0.7;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  // Test connection
  await checkHealth();

  // Set up periodic health checks
  setInterval(checkHealth, 30000); // Check every 30 seconds
});

// Utility functions for common API operations
const apiUtils = {
  // Authentication helpers
  async login(credentials) {
    return await apiCall('/api/auth/login', 'POST', credentials);
  },

  async register(userData) {
    return await apiCall('/api/auth/register', 'POST', userData);
  },

  async logout() {
    return await apiCall('/api/auth/logout', 'POST');
  },

  // File upload helper
  async uploadFile(file, endpoint = '/api/upload') {
    const formData = new FormData();
    formData.append('file', file);
    return await apiCall(endpoint, 'POST', formData);
  },

  // Interview helpers
  async startInterview(data) {
    return await apiCall('/api/interview/start', 'POST', data);
  },

  async submitResponse(data) {
    return await apiCall('/api/interview/response', 'POST', data);
  },

  async getResults(interviewId) {
    return await apiCall(`/api/interview/results/${interviewId}`, 'GET');
  }
};

// Expose everything globally
window.apiCall = apiCall;
window.API_BASE_URL = API_BASE_URL;
window.checkHealth = checkHealth;
window.connectionStatus = connectionStatus;
window.apiUtils = apiUtils;

console.log("✅ Firebase config loaded successfully");
console.log("📊 Available global functions:", Object.keys({ apiCall, checkHealth, apiUtils }));